import type { CallAction, LightCallState } from "./call";
import type { TeamCallAction, TeamCallLightState } from "./teamcall";

export {};

interface ElectronAPI {
  replaceCallState: (payload: LightCallState) => void;
  updateCallState: (patch: Partial<LightCallState>) => void;
  onCallAction: (callback: (action: CallAction) => void) => () => void;
  openCallWindow: () => void;
  closeCallWindow: () => void;
  onCallState: (callback: (nextState: LightCallState) => void) => () => void;
  requestInitialCallState: () => void;
  sendCallAction: (action: CallAction) => void;
  minimizeCallWindow: () => void;
  closeCallWindowFrame: () => void;
  writeClipboard?: (text: string) => boolean;
  notify?: (title: string, body: string) => void;
  onPlayNotificationSound?: (callback: () => void) => () => void; // ADD THIS
  checkForAppUpdates?: () => Promise<{ ok: boolean; message?: string }>;
  installAppUpdate?: () => Promise<{ ok: boolean; message?: string }>;
  onAppUpdateStatus?: (
    callback: (payload: {
      status: "checking" | "available" | "not-available" | "downloading" | "downloaded" | "error";
      version?: string;
      percent?: number;
      message?: string;
    }) => void
  ) => () => void;

  // ── Team Call (free P2P) — separate window/channel set ──
  openTeamCallWindow?: () => void;
  closeTeamCallWindow?: () => void;
  updateTeamCallState?: (patch: Partial<TeamCallLightState>) => void;
  replaceTeamCallState?: (state: TeamCallLightState) => void;
  requestInitialTeamCallState?: () => void;
  onTeamCallState?: (callback: (state: TeamCallLightState) => void) => () => void;
  sendTeamCallAction?: (action: TeamCallAction) => void;
  onTeamCallAction?: (callback: (action: TeamCallAction) => void) => () => void;
  minimizeTeamCallWindow?: () => void;
  closeTeamCallWindowFrame?: () => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}