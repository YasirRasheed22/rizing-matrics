// src/components/TeamCallWebOverlay.tsx
// @ts-nocheck
// Web (non-Electron) fallback for the free P2P Team Call feature.
import { useState } from "react";
import { Phone, PhoneOff, Mic, MicOff, Pause, Play, Users } from "lucide-react";
import { useTeamCall } from "../context/TeamCallContext";

const fmt = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

export default function TeamCallWebOverlay() {
  const call = useTeamCall();
  const [hover, setHover] = useState<string | null>(null);

  // Electron has its own dedicated window for this UI.
  if (typeof window !== "undefined" && (window as any).electronAPI?.openTeamCallWindow) return null;
  if (!call || call.status === "IDLE") return null;

  const isIncoming = call.status === "INCOMING";
  const isOutgoing = call.status === "OUTGOING";
  const isOnCall   = call.status === "ON_CALL";
  const name = call.peer?.name || "Agent";

  const btn = (key: string, active: boolean) => ({
    width: 44, height: 44, borderRadius: "50%", border: "none", cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center", color: "#fff",
    background: active ? "rgba(245,158,11,0.85)" : "rgba(255,255,255,0.14)",
    backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
    transform: hover === key ? "translateY(-2px)" : "none",
    transition: "all 0.12s ease",
  });

  return (
    <div
      style={{
        position: "fixed", top: 18, right: 18, zIndex: 9999,
        width: 280, borderRadius: 18, overflow: "hidden",
        background: "rgba(15,18,34,0.78)",
        backdropFilter: "blur(20px) saturate(160%)",
        WebkitBackdropFilter: "blur(20px) saturate(160%)",
        border: "1px solid rgba(255,255,255,0.12)",
        color: "#fff", fontFamily: "'Inter',-apple-system,sans-serif",
      }}
    >
      <div style={{ padding: "14px 16px 10px", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
          background: "rgba(99,102,241,0.25)", border: "1.5px solid rgba(99,102,241,0.4)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontWeight: 800, fontSize: 14,
        }}>
          {(name[0] || "?").toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {name}
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", display: "flex", alignItems: "center", gap: 5 }}>
            <Users size={10} />
            {isIncoming ? "Incoming team call (free)" : isOutgoing ? "Calling…" : `On call · ${fmt(call.duration)}`}
          </div>
          {/* Remote peer mute/hold status pills */}
          {isOnCall && (call.remoteMuted || call.remoteOnHold) && (
            <div style={{ display: "flex", gap: 4, marginTop: 4, flexWrap: "wrap" }}>
              {call.remoteMuted && (
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 3,
                  fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 999,
                  background: "rgba(239,68,68,0.22)", border: "1px solid rgba(239,68,68,0.35)", color: "#fca5a5",
                }}>
                  <MicOff size={8} /> {name.split(" ")[0]} muted
                </span>
              )}
              {call.remoteOnHold && (
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 3,
                  fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 999,
                  background: "rgba(245,158,11,0.22)", border: "1px solid rgba(245,158,11,0.35)", color: "#fcd34d",
                }}>
                  <Pause size={8} /> {name.split(" ")[0]} on hold
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      <div style={{ padding: "10px 16px 16px", display: "flex", justifyContent: "center", gap: 12 }}>
        {isIncoming && (
          <>
            <button onMouseEnter={() => setHover("reject")} onMouseLeave={() => setHover(null)}
              onClick={() => call.reject()} title="Decline"
              style={{ ...btn("reject", false), background: "rgba(239,68,68,0.85)" }}>
              <PhoneOff size={18} />
            </button>
            <button onMouseEnter={() => setHover("accept")} onMouseLeave={() => setHover(null)}
              onClick={() => call.accept()} title="Accept"
              style={{ ...btn("accept", false), background: "rgba(34,197,94,0.85)" }}>
              <Phone size={18} />
            </button>
          </>
        )}
        {(isOutgoing || isOnCall) && (
          <>
            {isOnCall && (
              <button onMouseEnter={() => setHover("mute")} onMouseLeave={() => setHover(null)}
                onClick={() => call.toggleMute()} title={call.isMuted ? "Unmute" : "Mute"} style={btn("mute", call.isMuted)}>
                {call.isMuted ? <MicOff size={16} /> : <Mic size={16} />}
              </button>
            )}
            {isOnCall && (
              <button onMouseEnter={() => setHover("hold")} onMouseLeave={() => setHover(null)}
                onClick={() => call.toggleHold()} title={call.isOnHold ? "Resume" : "Hold"} style={btn("hold", call.isOnHold)}>
                {call.isOnHold ? <Play size={16} /> : <Pause size={16} />}
              </button>
            )}
            <button onMouseEnter={() => setHover("end")} onMouseLeave={() => setHover(null)}
              onClick={() => call.hangup()} title="End call"
              style={{ ...btn("end", false), background: "rgba(239,68,68,0.85)" }}>
              <PhoneOff size={16} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
