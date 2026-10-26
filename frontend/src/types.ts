export type ConnectionState = "connecting" | "connected" | "disconnected";

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
