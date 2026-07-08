export type IncomingState = null | {
  from: string;
  customerName: string;
  isTransfer?: boolean;
  transferFrom?: string;
};

// ── Conference participant (live legs in the call) ───────────
export type CallParticipant = {
  callSid: string;
  /** "agent" | "customer" | "transfer" | "supervisor" */
  kind: "agent" | "customer" | "transfer" | "supervisor";
  /** client SIP identity for client legs, "" otherwise */
  identity?: string;
  /** PSTN number for non-client legs, "" otherwise */
  number?: string;
  /** human-friendly label resolved on the backend when possible */
  displayName?: string;
  /** raw Twilio call status: ringing | in-progress | answered | ... */
  status?: string;
  hold?: boolean;
  muted?: boolean;
  isTransfer?: boolean;
  transferFrom?: string;
};
// ────────────────────────────────────────────────────────────

// ── ADD: SPEAKER action ──────────────────────────────────────
export type CallAction =
  | { type: "ACCEPT" }
  | { type: "REJECT" }
  | { type: "MUTE" }
  | { type: "HOLD" }
  | { type: "HANGUP" }
  | { type: "TRANSFER"; payload?: unknown }
  | { type: "FETCH_CONTACT_INFO"; payload?: { number: string } }
  | { type: "DTMF"; payload: { digit: string } }
  | { type: "SPEAKER"; payload: { deviceId: string } }          // ← NEW
  | { type: "REMOVE_PARTICIPANT"; payload: { participantCallSid: string } };  // ← NEW
// ────────────────────────────────────────────────────────────

export type LightCallState = {
  status: "READY" | "INCOMING" | "DIALING" | "ON_CALL" | "OFFLINE";
  customerName: string;
  customerNumber: string;
  duration: number;
  isMuted: boolean;
  isOnHold: boolean;
  conferenceName: string | null;
  callSid: string | null;
  missedCount?: number;
  messageCount?: number;
  contactInfo?: { name?: string; address?: string } | null;
  incoming?: null | {
    from: string;
    customerName: string;
    isTransfer?: boolean;
    transferFrom?: string;
  };
  agentList?: Array<{ id?: string; name?: string; phoneNumber?: string | null }>;
  contacts?: Array<{ id?: string; name?: string; phoneNumber?: string | null }>;

  // ── Live conference participants (transfer targets, etc.) ──
  participants?: CallParticipant[];   // ← NEW

  // ── ADD: active speaker deviceId (synced back from main window) ──
  activeSpeakerDeviceId?: string | null;   // ← NEW
};

export type CallSyncState = {
  status: "READY" | "INCOMING" | "DIALING" | "ON_CALL" | "OFFLINE";
  customerName: string;
  customerNumber: string;
  duration: number;
  isMuted: boolean;
  isOnHold: boolean;
  conferenceName: string | null;
  callSid: string | null;
  missedCount?: number;
  messageCount?: number;
  contactInfo?: { name?: string; address?: string } | null;
  incoming: IncomingState;
  agentList?: Array<{ id?: string; name?: string; phoneNumber?: string | null }>;
  contacts?: Array<{ id?: string; name?: string; phoneNumber?: string | null }>;
  participants?: CallParticipant[];   // ← NEW
  activeSpeakerDeviceId?: string | null;   // ← NEW
};