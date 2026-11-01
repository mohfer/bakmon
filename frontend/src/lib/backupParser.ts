import type {
  BackupState,
  BackupVm,
  Milestone,
  MilestoneKind,
  MilestoneTone,
  ProgressState,
} from "../types";

const MAX_MILESTONES = 6;

const EMPTY_PROGRESS: ProgressState = {
  percent: 0,
  transferred: "0 B",
  total: "--",
  speed: "--",
  eta: "--",
  elapsed: "--",
};

export function createInitialBackupState(): BackupState {
  return {
    phase: "idle",
    vm: null,
    progress: { ...EMPTY_PROGRESS },
    jobStartedAt: null,
    jobFinishedAt: null,
    jobDuration: null,
    snapshotStartedAt: null,
    snapshotFinishedAt: null,
    snapshotDuration: null,
    snapshotCompleted: false,
    uploadStartedAt: null,
    uploadCompleted: false,
    archiveSize: null,
    notificationSent: false,
    warnings: 0,
    lastWarning: null,
    snapshotCount: 0,
    uploadCount: 0,
    errorCount: 0,
    milestones: [],
    lastMilestone: null,
    milestoneSeq: 0,
    updatedAt: 0,
  };
}

interface MilestoneInput {
  kind: MilestoneKind;
  message: string;
  at: string | null;
  tone: MilestoneTone;
}

function pushMilestone(
  state: BackupState,
  input: MilestoneInput,
  receivedAt: number,
): BackupState {
  const id = state.milestoneSeq + 1;
  const milestone: Milestone = { id, ...input };

  return {
    ...state,
    milestoneSeq: id,
    milestones: [milestone, ...state.milestones].slice(0, MAX_MILESTONES),
    lastMilestone: milestone,
    updatedAt: receivedAt,
  };
}

function updateLatestMilestoneTime(
  state: BackupState,
  kind: MilestoneKind,
  at: string,
  receivedAt: number,
): BackupState | null {
  const latest = state.milestones[0];

  if (!latest || latest.kind !== kind || latest.at !== null) {
    return null;
  }

  const updated: Milestone = { ...latest, at };

  return {
    ...state,
    milestones: [updated, ...state.milestones.slice(1)],
    lastMilestone: updated,
    updatedAt: receivedAt,
  };
}

function vmLabel(vm: BackupVm | null): string {
  if (!vm) {
    return "backup";
  }

  return vm.name ? `${vm.type} ${vm.id} · ${vm.name}` : `${vm.type} ${vm.id}`;
}

function vmFromArchive(line: string): { id: string; type: BackupVm["type"] } | null {
  const match = line.match(/vzdump-(qemu|lxc)-(\d+)-/i);

  if (!match) {
    return null;
  }

  return {
    id: match[2],
    type: match[1].toLowerCase() === "qemu" ? "VM" : "LXC",
  };
}

function normalizeSize(raw: string): string {
  return raw.trim().replace(/^([\d.]+\s*[KMGTP])i$/i, "$1iB");
}

function parseLogTime(value: string): string | null {
  const ampm = value.match(/\b(\d{1,2}):(\d{2}):(\d{2})\s*(AM|PM)\b/i);
  if (ampm) {
    let hours = Number(ampm[1]) % 12;
    if (ampm[4].toUpperCase() === "PM") {
      hours += 12;
    }
    return `${String(hours).padStart(2, "0")}:${ampm[2]}:${ampm[3]}`;
  }

  const dateTime = value.match(/\b\d{4}-\d{2}-\d{2}[ T](\d{2}:\d{2}:\d{2})\b/);
  if (dateTime) {
    return dateTime[1];
  }

  const clock = value.match(/\b(\d{2}:\d{2}:\d{2})\b/);
  return clock ? clock[1] : null;
}

function parseDurationToSeconds(value: string): number {
  const trimmed = value.trim();

  const clock = trimmed.match(/^(\d+):(\d{2}):(\d{2})$/);
  if (clock) {
    return Number(clock[1]) * 3600 + Number(clock[2]) * 60 + Number(clock[3]);
  }

  let total = 0;
  const units = /(\d+(?:\.\d+)?)\s*([hms])/gi;
  let match: RegExpExecArray | null;

  while ((match = units.exec(trimmed)) !== null) {
    const amount = Number(match[1]);
    const unit = match[2].toLowerCase();
    total += unit === "h" ? amount * 3600 : unit === "m" ? amount * 60 : amount;
  }

  return total;
}

function formatDuration(seconds: number): string {
  const rounded = Math.max(0, Math.round(seconds));
  const hours = Math.floor(rounded / 3600);
  const minutes = Math.floor((rounded % 3600) / 60);
  const rest = rounded % 60;

  if (hours > 0) {
    if (rest > 0) {
      return `${hours}h ${minutes}m ${rest}s`;
    }
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }

  if (minutes > 0) {
    return rest > 0 ? `${minutes}m ${rest}s` : `${minutes}m`;
  }

  return `${rest}s`;
}

function durationBetween(start: string, end: string): string | null {
  const startClock = start.match(/^(\d{2}):(\d{2}):(\d{2})$/);
  const endClock = end.match(/^(\d{2}):(\d{2}):(\d{2})$/);

  if (!startClock || !endClock) {
    return null;
  }

  const startSeconds =
    Number(startClock[1]) * 3600 + Number(startClock[2]) * 60 + Number(startClock[3]);
  const endSeconds =
    Number(endClock[1]) * 3600 + Number(endClock[2]) * 60 + Number(endClock[3]);
  const diff = endSeconds >= startSeconds ? endSeconds - startSeconds : endSeconds + 86400 - startSeconds;

  return formatDuration(diff);
}

function humanizeEta(raw: string): string {
  if (raw === "-") {
    return "--";
  }

  return formatDuration(parseDurationToSeconds(raw));
}

function snapshotFinishMessage(state: BackupState): string {
  const parts = [`Snapshot finished · ${vmLabel(state.vm)}`];

  if (state.snapshotDuration) {
    parts.push(state.snapshotDuration);
  }

  if (state.archiveSize) {
    parts.push(state.archiveSize);
  }

  return parts.join(" · ");
}

function jobFinishMessage(state: BackupState, duration: string | null): string {
  const parts = [
    `Backup job ${state.errorCount > 0 ? "finished with errors" : "completed"}`,
    `${state.snapshotCount} snapshot${state.snapshotCount === 1 ? "" : "s"}`,
    `${state.uploadCount} upload${state.uploadCount === 1 ? "" : "s"}`,
  ];

  if (duration) {
    parts.push(duration);
  }

  return parts.join(" · ");
}

export function applyLogLine(
  state: BackupState,
  rawLine: string,
  receivedAt = Date.now(),
): BackupState {
  const line = rawLine.replace(/\r$/, "");

  if (!line.trim()) {
    return state;
  }

  const start = line.match(/^=== Start:\s*(.*?)\s*===$/i);
  if (start) {
    const at = parseLogTime(start[1]);
    const fresh = createInitialBackupState();
    const next: BackupState = {
      ...fresh,
      phase: "starting",
      jobStartedAt: at,
      updatedAt: receivedAt,
    };

    return pushMilestone(
      next,
      { kind: "job-start", message: "Backup job started", at, tone: "neutral" },
      receivedAt,
    );
  }

  const finish = line.match(/^=== Selesai(?: pada)?\s*(.*?)\s*===$/i);
  if (finish) {
    const at = parseLogTime(finish[1]) ?? state.jobFinishedAt;
    const duration =
      state.jobStartedAt && at ? durationBetween(state.jobStartedAt, at) : null;
    const hasErrors = state.errorCount > 0;
    const next: BackupState = {
      ...state,
      phase: hasErrors ? "failed" : "completed",
      jobFinishedAt: at,
      jobDuration: duration,
      snapshotCompleted: true,
      uploadCompleted: true,
      progress: { ...state.progress, percent: 100, eta: "--" },
      updatedAt: receivedAt,
    };

    return pushMilestone(
      next,
      {
        kind: "job-finish",
        message: jobFinishMessage(state, duration),
        at,
        tone: hasErrors ? "danger" : "success",
      },
      receivedAt,
    );
  }

  const snapshotMarker = line.match(/^>>>\s+Snapshot\s+VM\s+(\d+)/i);
  if (snapshotMarker) {
    const id = snapshotMarker[1];
    const type = state.vm?.id === id ? state.vm.type : "VM";
    return {
      ...state,
      phase: "snapshot",
      vm: { id, type, name: state.vm?.id === id ? state.vm.name : null },
      progress: { ...EMPTY_PROGRESS },
      snapshotStartedAt: null,
      snapshotFinishedAt: null,
      snapshotDuration: null,
      snapshotCompleted: false,
      uploadStartedAt: null,
      uploadCompleted: false,
      archiveSize: null,
      notificationSent: false,
      updatedAt: receivedAt,
    };
  }

  const uploadMarker = line.match(
    /^---\s+Upload\s+VM\s+(\d+)\s+\(([^)]+)\)\s+---/i,
  );
  if (uploadMarker) {
    const id = uploadMarker[1];
    const size = uploadMarker[2].trim();
    const type = state.vm?.id === id ? state.vm.type : "VM";
    const vm: BackupVm = {
      id,
      type,
      name: state.vm?.id === id ? state.vm.name : null,
    };
    const next: BackupState = {
      ...state,
      phase: "upload",
      vm,
      progress: {
        ...EMPTY_PROGRESS,
        total: size,
      },
      snapshotCompleted: true,
      uploadStartedAt: state.snapshotFinishedAt,
      uploadCompleted: false,
      updatedAt: receivedAt,
    };

    return pushMilestone(
      next,
      {
        kind: "upload-start",
        message: `Upload started · ${vmLabel(vm)} · ${size}`,
        at: state.snapshotFinishedAt,
        tone: "neutral",
      },
      receivedAt,
    );
  }

  const uploadSuccess = line.match(
    /(\d{2}:\d{2}:\d{2})\s*=>\s*Sukses Upload:\s*VM\s*(\d+)/i,
  );
  if (uploadSuccess) {
    const at = uploadSuccess[1];
    const id = uploadSuccess[2];
    const vm = state.vm?.id === id ? state.vm : { id, type: "VM" as const, name: null };
    const next: BackupState = {
      ...state,
      phase: "waiting",
      vm,
      progress: { ...state.progress, percent: 100, eta: "--" },
      snapshotCompleted: true,
      uploadCompleted: true,
      uploadCount: state.uploadCount + 1,
      updatedAt: receivedAt,
    };

    return pushMilestone(
      next,
      {
        kind: "upload-finish",
        message: `Upload finished · ${vmLabel(vm)}`,
        at,
        tone: "success",
      },
      receivedAt,
    );
  }

  const infoStarting = line.match(
    /^INFO:\s+Starting Backup of VM\s+(\d+)\s+\((qemu|lxc)\)/i,
  );
  if (infoStarting) {
    const id = infoStarting[1];
    const type: BackupVm["type"] =
      infoStarting[2].toLowerCase() === "qemu" ? "VM" : "LXC";
    const vm: BackupVm = {
      id,
      type,
      name: state.vm?.id === id ? state.vm.name : null,
    };

    const next: BackupState = {
      ...state,
      phase: "snapshot",
      vm,
      updatedAt: receivedAt,
    };

    return pushMilestone(
      next,
      {
        kind: "snapshot-start",
        message: `Snapshot started · ${vmLabel(vm)}`,
        at: null,
        tone: "neutral",
      },
      receivedAt,
    );
  }

  const infoName = line.match(/^INFO:\s+(?:VM|CT) Name:\s*(.+)$/i);
  if (infoName) {
    if (!state.vm) {
      return state;
    }

    const vm: BackupVm = { ...state.vm, name: infoName[1].trim() };
    const latest = state.milestones[0];

    if (latest?.kind === "snapshot-start") {
      const updated: Milestone = {
        ...latest,
        message: `Snapshot started · ${vmLabel(vm)}`,
      };

      return {
        ...state,
        vm,
        milestones: [updated, ...state.milestones.slice(1)],
        lastMilestone: updated,
        updatedAt: receivedAt,
      };
    }

    return {
      ...state,
      vm,
      updatedAt: receivedAt,
    };
  }

  const infoStarted = line.match(/^INFO:\s+Backup started at\s+(.+)$/i);
  if (infoStarted) {
    const at = parseLogTime(infoStarted[1]);
    const next: BackupState = {
      ...state,
      phase: "snapshot",
      progress: { ...EMPTY_PROGRESS },
      snapshotStartedAt: at,
      snapshotCompleted: false,
      updatedAt: receivedAt,
    };
    const updated = at
      ? updateLatestMilestoneTime(next, "snapshot-start", at, receivedAt)
      : null;

    if (updated) {
      return updated;
    }

    return pushMilestone(
      next,
      {
        kind: "snapshot-start",
        message: `Snapshot started · ${vmLabel(next.vm)}`,
        at,
        tone: "neutral",
      },
      receivedAt,
    );
  }

  const infoArchiveSize = line.match(/^INFO:\s+archive file size:\s*(.+)$/i);
  if (infoArchiveSize) {
    return {
      ...state,
      archiveSize: infoArchiveSize[1].trim(),
      updatedAt: receivedAt,
    };
  }

  const infoFinished = line.match(
    /^INFO:\s+Finished Backup of VM\s+\d+\s+\(([^)]+)\)/i,
  );
  if (infoFinished) {
    const duration = formatDuration(parseDurationToSeconds(infoFinished[1]));
    const next: BackupState = {
      ...state,
      phase: "snapshot",
      snapshotDuration: duration,
      snapshotCompleted: true,
      snapshotCount: state.snapshotCount + 1,
      updatedAt: receivedAt,
    };

    return pushMilestone(
      next,
      {
        kind: "snapshot-finish",
        message: snapshotFinishMessage(next),
        at: null,
        tone: "success",
      },
      receivedAt,
    );
  }

  const infoFinishedAt = line.match(/^INFO:\s+Backup finished at\s+(.+)$/i);
  if (infoFinishedAt) {
    const at = parseLogTime(infoFinishedAt[1]);
    const next: BackupState = {
      ...state,
      phase: "snapshot",
      snapshotFinishedAt: at,
      snapshotCompleted: true,
      updatedAt: receivedAt,
    };

    if (at) {
      const updated = updateLatestMilestoneTime(
        next,
        "snapshot-finish",
        at,
        receivedAt,
      );
      if (updated) {
        return updated;
      }
    }

    return pushMilestone(
      next,
      {
        kind: "snapshot-finish",
        message: snapshotFinishMessage(next),
        at,
        tone: "success",
      },
      receivedAt,
    );
  }

  if (/^INFO:\s+notified via target/i.test(line)) {
    return {
      ...state,
      notificationSent: true,
      updatedAt: receivedAt,
    };
  }

  const snapshotProgress = line.match(
    /^INFO:\s+(\d{1,3})%\s+\(([\d.]+\s+[A-Za-z]+)\s+of\s+([\d.]+\s+[A-Za-z]+)\)\s+in\s+([^,]+),\s*read:\s*([\d.]+\s+[A-Za-z]+\/s),\s*write:\s*([\d.]+\s+[A-Za-z]+\/s)/i,
  );
  if (snapshotProgress) {
    const percent = Number(snapshotProgress[1]);
    const elapsed = snapshotProgress[4].trim();
    const elapsedSeconds = parseDurationToSeconds(elapsed);
    const etaSeconds =
      percent > 0 && percent < 100
        ? Math.round((elapsedSeconds * (100 - percent)) / percent)
        : null;

    return {
      ...state,
      phase: "snapshot",
      progress: {
        percent,
        transferred: snapshotProgress[2],
        total: snapshotProgress[3],
        speed: snapshotProgress[5],
        eta: etaSeconds === null ? "--" : formatDuration(etaSeconds),
        elapsed: formatDuration(elapsedSeconds),
      },
      updatedAt: receivedAt,
    };
  }

  const archive = vmFromArchive(line);
  if (archive && (state.vm?.id !== archive.id || state.vm.type !== archive.type)) {
    const vm: BackupVm = {
      ...archive,
      name: state.vm?.id === archive.id ? state.vm.name : null,
    };

    state = { ...state, vm, updatedAt: receivedAt };
  }

  const uploadStats = line.match(
    /Transferred:\s+([\d.]+\s+[A-Za-z]+)\s*\/\s*([\d.]+\s+[A-Za-z]+),\s*(\d{1,3})%,\s*([\d.]+\s+[A-Za-z]+\/s),\s*ETA\s+([\dywdhms.]+|-)/i,
  );
  if (uploadStats) {
    const phase =
      state.phase === "failed" || state.phase === "completed"
        ? state.phase
        : "upload";

    return {
      ...state,
      phase,
      snapshotCompleted: true,
      uploadCompleted: false,
      progress: {
        percent: Number(uploadStats[3]),
        transferred: uploadStats[1],
        total: uploadStats[2],
        speed: uploadStats[4],
        eta: humanizeEta(uploadStats[5]),
        elapsed: state.phase === "upload" ? state.progress.elapsed : "0s",
      },
      updatedAt: receivedAt,
    };
  }

  const elapsed = line.match(/^Elapsed time:\s+([\dywdhms.]+)/i);
  if (elapsed) {
    if (state.phase !== "upload") {
      return state;
    }

    return {
      ...state,
      progress: {
        ...state.progress,
        elapsed: formatDuration(parseDurationToSeconds(elapsed[1])),
      },
      updatedAt: receivedAt,
    };
  }

  const fileLine = line.match(
    /^\s*\*\s+\S+:\s*(\d{1,3})%\s*\/\s*([\d.]+\s*[A-Za-z]+)/,
  );
  if (fileLine) {
    return {
      ...state,
      phase:
        state.phase === "failed" || state.phase === "completed"
          ? state.phase
          : "upload",
      snapshotCompleted: true,
      progress: {
        ...state.progress,
        percent: Number(fileLine[1]),
        total:
          state.progress.total === "--"
            ? normalizeSize(fileLine[2])
            : state.progress.total,
      },
      updatedAt: receivedAt,
    };
  }

  if (/^\s*WARNING\b/i.test(line)) {
    return {
      ...state,
      warnings: state.warnings + 1,
      lastWarning: line.trim(),
      updatedAt: receivedAt,
    };
  }

  const uploadFailure = line.match(/=>\s*(?:Gagal|Failed)\b/i);
  const isError =
    /^\s*\[?ERROR\]?/i.test(line) ||
    /^\s*Failed\b/i.test(line) ||
    Boolean(uploadFailure);
  if (isError) {
    const at = parseLogTime(line);
    const message = line
      .replace(/^\s*\[?ERROR\]?\s*:?\s*/i, "")
      .trim()
      .slice(0, 180);
    const next: BackupState = {
      ...state,
      phase: "failed",
      errorCount: state.errorCount + 1,
      jobFinishedAt: at ?? state.jobFinishedAt,
      updatedAt: receivedAt,
    };

    return pushMilestone(
      next,
      {
        kind: "error",
        message: `Backup error · ${message || "unknown error"}`,
        at,
        tone: "danger",
      },
      receivedAt,
    );
  }

  return state;
}
