// src/types/teamcall.ts — Team Call (free P2P agent↔agent) shared types

export type TeamCallStatus = "IDLE" | "OUTGOING" | "INCOMING" | "ON_CALL";

export interface TeamCallPeer {
  id: number | string;
  name: string;
  sipIdentity?: string;
}

export interface TeamCallLightState {
  status: TeamCallStatus;
  peer: TeamCallPeer | null;
  duration: number;
  isMuted: boolean;
  isOnHold: boolean;
  remoteMuted: boolean;
  remoteOnHold: boolean;
}

export type TeamCallAction =
  | { type: "ACCEPT" }
  | { type: "REJECT" }
  | { type: "MUTE" }
  | { type: "HOLD" }
  | { type: "HANGUP" };
