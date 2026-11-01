export type ConnectionState = "connecting" | "connected" | "disconnected";

export type BackupPhase =
  | "idle"
  | "starting"
  | "snapshot"
  | "upload"
  | "waiting"
  | "completed"
  | "failed";

export interface ProgressDetail {
  transferred: string;
  total: string;
  percent: number;
  speed: string;
  eta: string;
  elapsed: string;
  vmType: string;
  vmId: string;
}

export interface BackupVm {
  id: string;
  type: "VM" | "LXC";
  name: string | null;
}

export interface ProgressState {
  percent: number;
  transferred: string;
  total: string;
  speed: string;
  eta: string;
  elapsed: string;
}

export type MilestoneKind =
  | "job-start"
  | "snapshot-start"
  | "snapshot-finish"
  | "upload-start"
  | "upload-finish"
  | "job-finish"
  | "error";

export type MilestoneTone = "neutral" | "success" | "warning" | "danger";

export interface Milestone {
  id: number;
  kind: MilestoneKind;
  message: string;
  at: string | null;
  tone: MilestoneTone;
}

export interface BackupState {
  phase: BackupPhase;
  vm: BackupVm | null;
  progress: ProgressState;
  jobStartedAt: string | null;
  jobFinishedAt: string | null;
  jobDuration: string | null;
  snapshotStartedAt: string | null;
  snapshotFinishedAt: string | null;
  snapshotDuration: string | null;
  snapshotCompleted: boolean;
  uploadStartedAt: string | null;
  uploadCompleted: boolean;
  archiveSize: string | null;
  notificationSent: boolean;
  warnings: number;
  lastWarning: string | null;
  snapshotCount: number;
  uploadCount: number;
  errorCount: number;
  milestones: Milestone[];
  lastMilestone: Milestone | null;
  milestoneSeq: number;
  updatedAt: number;
}
