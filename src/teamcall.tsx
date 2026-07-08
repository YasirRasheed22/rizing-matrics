// @ts-nocheck
// src/teamcall.tsx — Team Call (free P2P agent↔agent) Electron window.
// Mirrors call.tsx's glass design but is a fully separate window/bundle
// (teamcall.html) and a fully separate IPC channel set — never touches
// the Twilio call window/state.
import { createRoot } from "react-dom/client";
import { useEffect, useMemo, useState } from "react";
import { useTeamCallIPCState } from "./hooks/useTeamCallIPC";
import "./index.css";
import { Mic, MicOff, Pause, Play, Phone, PhoneOff, Users, Minus, X, Zap } from "lucide-react";

function useLocalTheme(): "dark" | "light" {
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    try { return (localStorage.getItem("theme") as any) || "light"; } catch { return "light"; }
  });
  useEffect(() => {
    const h = (e: StorageEvent) => { if (e.key === "theme" && (e.newValue === "dark" || e.newValue === "light")) setTheme(e.newValue); };
    window.addEventListener("storage", h);
    return () => window.removeEventListener("storage", h);
  }, []);
  return theme;
}

const fmt = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

function T(d: boolean) {
  return {
    MESH_BG: d
      ? "radial-gradient(120% 90% at 10% -10%, rgba(99,102,241,0.30) 0%, transparent 55%)," +
        "radial-gradient(110% 85% at 105% 10%, rgba(34,197,94,0.18) 0%, transparent 50%)," +
        "radial-gradient(120% 100% at 50% 120%, rgba(168,85,247,0.20) 0%, transparent 55%)," +
        "#070A14"
      : "radial-gradient(120% 90% at 10% -10%, rgba(99,102,241,0.16) 0%, transparent 55%)," +
        "radial-gradient(110% 85% at 105% 10%, rgba(34,197,94,0.12) 0%, transparent 50%)," +
        "radial-gradient(120% 100% at 50% 120%, rgba(244,114,182,0.14) 0%, transparent 55%)," +
        "#F4F5FA",
    GLASS: d ? "rgba(20,24,42,0.55)" : "rgba(255,255,255,0.55)",
    GLASS_STRONG: d ? "rgba(15,18,34,0.72)" : "rgba(255,255,255,0.78)",
    GLASS_BDR: d ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.65)",
    GLASS_HILITE: d ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.85)",
    TEXT: d ? "#F1F5F9" : "#0F172A",
    MUTED: d ? "#94A3B8" : "#64748B",
    FAINT: d ? "#475569" : "#94A3B8",
    P: "#6366F1",
    P_SOFT: d ? "rgba(99,102,241,0.16)" : "#EEF2FF",
    P_BORDER: d ? "rgba(99,102,241,0.30)" : "rgba(99,102,241,0.22)",
    GREEN: "#22C55E",
    GREEN_SOFT: d ? "rgba(34,197,94,0.14)" : "#DCFCE7",
    GREEN_BORDER: d ? "rgba(34,197,94,0.28)" : "rgba(34,197,94,0.25)",
    RED: "#EF4444",
    RED_BORDER: d ? "rgba(239,68,68,0.28)" : "rgba(239,68,68,0.25)",
    AMBER: "#F59E0B",
    AMBER_SOFT: d ? "rgba(245,158,11,0.14)" : "#FFFBEB",
    AMBER_BORDER: d ? "rgba(245,158,11,0.28)" : "rgba(245,158,11,0.25)",
  };
}

const AV_L = [
  { bg: "#EEF2FF", bd: "rgba(99,102,241,0.25)",  tx: "#4338CA" },
  { bg: "#ECFDF5", bd: "rgba(52,211,153,0.25)",  tx: "#065F46" },
  { bg: "#FFF7ED", bd: "rgba(251,146,60,0.25)",  tx: "#9A3412" },
  { bg: "#FDF4FF", bd: "rgba(192,132,252,0.25)", tx: "#7E22CE" },
  { bg: "#EFF6FF", bd: "rgba(96,165,250,0.25)",  tx: "#1D4ED8" },
];
const AV_D = [
  { bg: "#1E1B4B", bd: "rgba(129,140,248,0.35)", tx: "#C7D2FE" },
  { bg: "#052E16", bd: "rgba(52,211,153,0.35)",  tx: "#A7F3D0" },
  { bg: "#431407", bd: "rgba(251,146,60,0.35)",  tx: "#FED7AA" },
  { bg: "#3B0764", bd: "rgba(192,132,252,0.35)", tx: "#E9D5FF" },
  { bg: "#172554", bd: "rgba(96,165,250,0.35)",  tx: "#BFDBFE" },
];
function avPal(name: string, dark: boolean) {
  const c = (name || "?").trimStart().charCodeAt(0);
  return dark ? AV_D[c % AV_D.length] : AV_L[c % AV_L.length];
}

export default function TeamCallDesktopApp() {
  const { state, sendAction, minimizeWindow, closeWindow } = useTeamCallIPCState();
  const isDark = useLocalTheme() === "dark";
  const t = useMemo(() => T(isDark), [isDark]);

  const isIncoming = state.status === "INCOMING";
  const isOutgoing = state.status === "OUTGOING";
  const isOnCall   = state.status === "ON_CALL";
  const name = state.peer?.name || "Agent";
  const pal = useMemo(() => avPal(name, isDark), [name, isDark]);

  const pillCfg = isIncoming
    ? { label: "Incoming", dot: t.P, bg: t.P_SOFT, tc: t.P, bdr: t.P_BORDER }
    : isOutgoing
    ? { label: "Calling…", dot: t.AMBER, bg: t.AMBER_SOFT, tc: "#B45309", bdr: t.AMBER_BORDER }
    : { label: "Connected", dot: t.GREEN, bg: t.GREEN_SOFT, tc: "#15803D", bdr: t.GREEN_BORDER };

  return (
    <div style={{
      width: "100vw", height: "100vh",
      background: t.MESH_BG, backgroundSize: "200% 200%",
      animation: "tc-mesh-drift 22s ease-in-out infinite",
      color: t.TEXT,
      fontFamily: "'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
      userSelect: "none", display: "flex", flexDirection: "column", overflow: "hidden",
    }}>
      {/* Titlebar */}
      <div style={{
        height: 42, padding: "0 12px", flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: t.GLASS, backdropFilter: "blur(18px) saturate(160%)", WebkitBackdropFilter: "blur(18px) saturate(160%)",
        borderBottom: `1px solid ${t.GLASS_BDR}`, WebkitAppRegion: "drag",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 24, height: 24, borderRadius: 8,
            background: `linear-gradient(135deg, ${t.P}, #818CF8)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            border: `1px solid ${t.GLASS_HILITE}`,
          }}>
            <Users size={13} color="#fff" />
          </div>
          <span style={{ fontSize: 12.5, fontWeight: 800, letterSpacing: "-0.02em" }}>Team Call</span>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 3,
            fontSize: 9, fontWeight: 800, letterSpacing: "0.04em", color: t.GREEN,
            background: t.GREEN_SOFT, border: `1px solid ${t.GREEN_BORDER}`,
            padding: "2px 7px 2px 5px", borderRadius: 999,
          }}>
            <Zap size={9} fill={t.GREEN} /> FREE
          </span>
        </div>
        <div style={{ display: "flex", gap: 4, WebkitAppRegion: "no-drag" }}>
          <WinBtn icon={<Minus size={10} />} onClick={minimizeWindow} t={t} />
          <WinBtn icon={<X size={10} />} onClick={closeWindow} t={t} danger />
        </div>
      </div>

      {/* Body — glass card */}
      <div style={{
        flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        padding: "24px 20px", gap: 18,
        background: t.GLASS, backdropFilter: "blur(18px) saturate(160%)", WebkitBackdropFilter: "blur(18px) saturate(160%)",
      }}>
        {/* Status pill */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 7,
          height: 25, padding: "0 12px", borderRadius: 999,
          background: pillCfg.bg, color: pillCfg.tc, border: `1px solid ${pillCfg.bdr}`,
          fontSize: 10.5, fontWeight: 800, letterSpacing: "0.07em", textTransform: "uppercase",
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: "50%", background: pillCfg.dot, flexShrink: 0,
            animation: "tc-pulse 1.8s ease-in-out infinite",
          }} />
          {pillCfg.label}
        </div>

        {/* Avatar zone */}
        <div style={{ width: 116, height: 116, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {(isIncoming || isOutgoing) && (
            <>
              <div className="tc-r1" style={{ borderColor: pal.bd }} />
              <div className="tc-r2" style={{ borderColor: pal.bd }} />
            </>
          )}
          <div style={{
            width: 92, height: 92, borderRadius: "50%",
            background: pal.bg, border: `1.5px solid ${pal.bd}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 32, fontWeight: 800, color: pal.tx,
            position: "relative", zIndex: 2,
            boxShadow: `0 0 0 5px ${isOnCall ? "rgba(34,197,94,0.14)" : t.P_SOFT}, 0 0 26px ${isOnCall ? "rgba(34,197,94,0.35)" : "rgba(99,102,241,0.35)"}`,
          }}>
            {(name[0] || "?").toUpperCase()}
          </div>
        </div>

        {/* Name + duration */}
        <div style={{ textAlign: "center" }}>
          <h1 style={{ margin: 0, fontSize: 19, fontWeight: 800, letterSpacing: "-0.02em", maxWidth: 260, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {name}
          </h1>
          <p style={{
            margin: "6px 0 0", fontSize: 13, fontWeight: 600,
            color: t.MUTED, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          }}>
            {isOnCall ? (
              <span style={{
                fontFamily: "'SF Mono','Fira Code',ui-monospace,monospace",
                fontVariantNumeric: "tabular-nums", letterSpacing: "0.08em", color: t.TEXT, fontSize: 15, fontWeight: 400,
              }}>
                {fmt(state.duration || 0)}
              </span>
            ) : isIncoming ? (
              "wants to talk · peer-to-peer"
            ) : (
              "ringing…"
            )}
          </p>

          {/* Remote peer mute/hold indicators */}
          {isOnCall && (state.remoteMuted || state.remoteOnHold) && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
              {state.remoteMuted && (
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 4,
                  fontSize: 10, fontWeight: 700, letterSpacing: "0.04em",
                  padding: "3px 9px", borderRadius: 999,
                  background: t.RED + "22", border: `1px solid ${t.RED}44`, color: t.RED,
                }}>
                  <MicOff size={10} /> {name.split(" ")[0]} muted
                </span>
              )}
              {state.remoteOnHold && (
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 4,
                  fontSize: 10, fontWeight: 700, letterSpacing: "0.04em",
                  padding: "3px 9px", borderRadius: 999,
                  background: t.AMBER + "22", border: `1px solid ${t.AMBER}44`, color: t.AMBER,
                }}>
                  <Pause size={10} /> {name.split(" ")[0]} on hold
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* CTA zone */}
      <div style={{
        flexShrink: 0, padding: "16px 14px 18px",
        background: t.GLASS, backdropFilter: "blur(18px) saturate(160%)", WebkitBackdropFilter: "blur(18px) saturate(160%)",
        borderTop: `1px solid ${t.GLASS_BDR}`,
        display: "flex", justifyContent: "center", alignItems: "center", gap: 20,
      }}>
        {isIncoming && (
          <>
            <RoundBtn icon={<PhoneOff size={22} />} bg={t.RED} onClick={() => sendAction({ type: "REJECT" })} label="Decline" rotate />
            <RoundBtn icon={<Phone size={22} />} bg={t.GREEN} onClick={() => sendAction({ type: "ACCEPT" })} label="Accept" />
          </>
        )}
        {(isOutgoing || isOnCall) && (
          <>
            {isOnCall && (
              <RoundBtn
                icon={state.isMuted ? <MicOff size={18} /> : <Mic size={18} />}
                bg={state.isMuted ? t.RED : "rgba(255,255,255,0.14)"}
                onClick={() => sendAction({ type: "MUTE" })} label={state.isMuted ? "Unmute" : "Mute"} small t={t}
              />
            )}
            {isOnCall && (
              <RoundBtn
                icon={state.isOnHold ? <Play size={18} /> : <Pause size={18} />}
                bg={state.isOnHold ? t.AMBER : "rgba(255,255,255,0.14)"}
                onClick={() => sendAction({ type: "HOLD" })} label={state.isOnHold ? "Resume" : "Hold"} small t={t}
              />
            )}
            <RoundBtn icon={<PhoneOff size={22} />} bg={t.RED} onClick={() => sendAction({ type: "HANGUP" })} label="End" rotate={isOutgoing} />
          </>
        )}
      </div>

      {/* Footer */}
      <div style={{
        height: 24, flexShrink: 0,
        borderTop: `1px solid ${t.GLASS_BDR}`,
        background: t.GLASS, backdropFilter: "blur(18px) saturate(160%)", WebkitBackdropFilter: "blur(18px) saturate(160%)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 8, fontWeight: 900, letterSpacing: "0.16em", textTransform: "uppercase", color: t.FAINT,
      }}>
        Peer-to-peer · Ringnex
      </div>

      <style>{`
        *,*::before,*::after{box-sizing:border-box}
        body{margin:0;overflow:hidden}
        .tc-r1,.tc-r2{position:absolute;border-radius:50%;border:1.5px solid;pointer-events:none}
        .tc-r1{inset:10px;animation:tc-ring 2s ease-out infinite}
        .tc-r2{inset:0;animation:tc-ring 2s ease-out 0.4s infinite}
        @keyframes tc-ring{0%{transform:scale(0.9);opacity:.75}100%{transform:scale(1.5);opacity:0}}
        @keyframes tc-pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.35;transform:scale(.68)}}
        @keyframes tc-mesh-drift{0%,100%{background-position:0% 0%}50%{background-position:100% 60%}}
      `}</style>
    </div>
  );
}

function WinBtn({ icon, onClick, danger = false, t }: any) {
  const [h, setH] = useState(false);
  return (
    <button onClick={onClick}
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{
        width: 22, height: 22, borderRadius: "50%", border: "none", cursor: "pointer",
        background: h ? (danger ? "rgba(239,68,68,0.16)" : "rgba(255,255,255,0.10)") : "transparent",
        color: h ? (danger ? t.RED : t.TEXT) : t.MUTED,
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "all 0.12s ease",
      }}>{icon}</button>
  );
}

function RoundBtn({ icon, bg, onClick, label, small = false, rotate = false, t }: any) {
  const [h, setH] = useState(false);
  const size = small ? 52 : 62;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 7 }}>
      <button
        onClick={onClick}
        onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
        style={{
          width: size, height: size, borderRadius: "50%", border: "none", color: "#fff", cursor: "pointer",
          background: `linear-gradient(145deg, ${bg}EE, ${bg})`,
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: `0 0 0 1px rgba(255,255,255,0.18) inset, 0 0 ${h ? 26 : 18}px ${bg}55`,
          transform: h ? "translateY(-2px) scale(1.05)" : "none",
          transition: "transform 0.13s ease, box-shadow 0.13s ease, filter 0.13s ease",
          filter: h ? "brightness(1.06)" : "none",
        }}
      >
        <span style={{ display: "flex", transform: rotate ? "rotate(135deg)" : "none" }}>{icon}</span>
      </button>
      <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "-0.01em", color: "rgba(255,255,255,0.72)" }}>{label}</span>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<TeamCallDesktopApp />);
