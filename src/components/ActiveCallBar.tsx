// src/components/ActiveCallBar.tsx
// @ts-nocheck
import { motion } from "framer-motion";
import {
  Mic, MicOff, Pause, PlayCircle, PhoneOff,
  Plus, BookOpen, ArrowRightLeft, Ban, Phone,
  Users, UserMinus, User,
} from "lucide-react";
import BlockNumberConfirmModal from "./BlockNumberConfirmModal";
import { useState, useEffect, useMemo } from "react";
import api from "../api";

/* ─── Local theme hook (same as call.tsx) ─── */
function useLocalTheme(): "dark" | "light" {
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    try { return (localStorage.getItem("theme") as "dark" | "light") || "light"; }
    catch { return "light"; }
  });
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === "theme" && (e.newValue === "dark" || e.newValue === "light"))
        setTheme(e.newValue);
    };
    window.addEventListener("storage", handler);
    const interval = setInterval(() => {
      try {
        const val = localStorage.getItem("theme") as "dark" | "light" | null;
        if (val === "dark" || val === "light") setTheme(val);
      } catch {}
    }, 500);
    return () => { window.removeEventListener("storage", handler); clearInterval(interval); };
  }, []);
  return theme;
}

/* ─── Design tokens ─── */
function getTokens(isDark: boolean) {
  return {
    accent:        isDark ? "#7C7CF0"                        : "#5B5BD6",
    accentBg:      isDark ? "rgba(124,124,240,0.12)"         : "rgba(91,91,214,0.08)",
    accentBord:    isDark ? "rgba(124,124,240,0.25)"         : "rgba(91,91,214,0.18)",
    red:           "#EF4444",
    redBg:         isDark ? "rgba(239,68,68,0.14)"           : "#FEF2F2",
    redBord:       isDark ? "rgba(239,68,68,0.28)"           : "rgba(239,68,68,0.18)",
    amber:         "#F59E0B",
    amberBg:       isDark ? "rgba(245,158,11,0.14)"          : "#FEF3C7",
    amberBord:     isDark ? "rgba(245,158,11,0.28)"          : "rgba(211,138,0,0.18)",
    amberText:     isDark ? "#FCD34D"                         : "#92400E",
    green:         "#22C55E",
    greenBg:       isDark ? "rgba(34,197,94,0.12)"           : "#F0FDF4",
    text:          isDark ? "#F0F0F8"                         : "#0D0D12",
    textSec:       isDark ? "#A0A0B8"                         : "#4B4B5A",
    muted:         isDark ? "#68687A"                         : "#9E9EAD",
    surface:       isDark ? "#1E1E2E"                         : "#F6F7F9",
    surface2:      isDark ? "#16161F"                         : "#F0F0F8",
    bg:            isDark ? "rgba(20,20,30,0.97)"             : "rgba(255,255,255,0.92)",
    border:        isDark ? "rgba(255,255,255,0.08)"          : "rgba(0,0,0,0.07)",
    border2:       isDark ? "rgba(255,255,255,0.05)"          : "rgba(0,0,0,0.05)",
    shadow:        isDark
      ? "0 8px 40px rgba(0,0,0,0.60), 0 0 0 1px rgba(255,255,255,0.06)"
      : "0 8px 40px rgba(0,0,0,0.10), 0 0 0 1px rgba(0,0,0,0.05)",
    avatarBg:      isDark
      ? "linear-gradient(135deg, rgba(91,91,214,0.25), rgba(91,91,214,0.15))"
      : "linear-gradient(135deg, #EDEDFB, #D8D8F7)",
    avatarBord:    isDark ? "rgba(124,124,240,0.30)"          : "rgba(91,91,214,0.18)",
    avatarColor:   isDark ? "#A5B4FC"                         : "#5B5BD6",
    holdBadgeBg:   isDark ? "rgba(245,158,11,0.14)"          : "#FEF3C7",
    holdBadgeClr:  isDark ? "#FCD34D"                         : "#92400E",
    holdBadgeBord: isDark ? "rgba(245,158,11,0.28)"          : "rgba(211,138,0,0.18)",
    timerColor:    isDark ? "#F0F0F8"                         : "#0D0D12",
    numberFont:    "'JetBrains Mono', 'SF Mono', monospace",
    divider:       isDark ? "rgba(255,255,255,0.06)"          : "rgba(0,0,0,0.06)",
    liveGreenBg:   isDark ? "rgba(34,197,94,0.15)"           : "rgba(23,163,99,0.12)",
    liveGreenRing: isDark ? "rgba(34,197,94,0.20)"           : "rgba(23,163,99,0.20)",
  };
}

/* ─── palette for avatar ─── */
const PALETTES      = [
  { bg:"#EEF2FF", ring:"#818CF8", text:"#4338CA" },
  { bg:"#ECFDF5", ring:"#34D399", text:"#065F46" },
  { bg:"#FFF7ED", ring:"#FB923C", text:"#9A3412" },
  { bg:"#FDF4FF", ring:"#C084FC", text:"#7E22CE" },
  { bg:"#EFF6FF", ring:"#60A5FA", text:"#1D4ED8" },
  { bg:"#FFF1F2", ring:"#FB7185", text:"#BE123C" },
];
const PALETTES_DARK = [
  { bg:"#1E1E3A", ring:"#818CF8", text:"#A5B4FC" },
  { bg:"#0F2A1E", ring:"#34D399", text:"#6EE7B7" },
  { bg:"#2A1A0F", ring:"#FB923C", text:"#FDBA74" },
  { bg:"#2A1030", ring:"#C084FC", text:"#D8B4FE" },
  { bg:"#0F1E3A", ring:"#60A5FA", text:"#93C5FD" },
  { bg:"#2A0F14", ring:"#FB7185", text:"#FCA5A5" },
];
function getPalette(name: string, isDark: boolean) {
  let h = 0;
  for (let i = 0; i < (name || "").length; i++)
    h = (h * 31 + name.charCodeAt(i)) % PALETTES.length;
  return isDark ? PALETTES_DARK[h] : PALETTES[h];
}

/* ─── helpers ─── */
const fmt = (s: number) =>
  `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

/* ─── Props ─── */
interface ActiveCallBarProps {
  isMuted: boolean; isRecording?: boolean; isOnHold: boolean;
  isSupervisedMode?: boolean; duration: number;
  customerName: string; customerNumber: string; privileges?: any;
  onMute: () => void; onHold: () => void; onHangup: () => void;
  onAdd?: () => void; onNotes?: () => void;
  onMakeLead?: () => void; onBlock?: () => void;
  participants?: any[]; selfCallSid?: string | null;
  onRemoveParticipant?: (participantCallSid: string) => void;
}

export function ActiveCallBar({
  isMuted, isOnHold, duration, customerName, customerNumber,
  privileges, onMute, onHold, onHangup,
  onAdd = () => {}, onNotes = () => {}, onMakeLead = () => {},
  participants = [], selfCallSid = null, onRemoveParticipant = () => {},
}: ActiveCallBarProps) {
  const theme  = useLocalTheme();
  const isDark = theme === "dark";
  const tk     = useMemo(() => getTokens(isDark), [isDark]);
  const pal    = getPalette(customerName || "?", isDark);

  const [showBlockConfirm, setShowBlockConfirm] = useState(false);

  const handleConfirmBlock = async (reason: string) => {
    setShowBlockConfirm(false);
    try {
      await api.post("/voice/block-number", { number: customerNumber, reason: reason || null });
      onHangup();
    } catch { alert("Failed to block number. Please try again."); }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 240, damping: 22 }}
      style={{
        position: "fixed", top: 16, right: 16, width: 350,
        zIndex: 9999, borderRadius: 22,
        background: tk.bg,
        backdropFilter: "blur(28px) saturate(200%)",
        WebkitBackdropFilter: "blur(28px) saturate(200%)",
        border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.70)"}`,
        boxShadow: tk.shadow,
        overflow: "hidden",
        fontFamily: "'Inter', -apple-system, sans-serif",
        maxHeight: "88vh",
        display: "flex", flexDirection: "column",
      }}
    >
      {/* Top accent bar */}
      <div style={{ height: 3, background: `linear-gradient(90deg, ${tk.accent}, #818CF8, ${tk.accent})`, backgroundSize: "200% 100%", animation: "accentShimmer 3s linear infinite" }} />

      {/* ── Header: timer + status ── */}
      <div style={{ padding: "13px 16px 11px", borderBottom: `1px solid ${tk.divider}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Live dot */}
          <span style={{
            width: 8, height: 8, borderRadius: "50%", display: "inline-block",
            background: isOnHold ? tk.amber : tk.green,
            boxShadow: isOnHold
              ? `0 0 0 3px ${tk.amberBg}`
              : `0 0 0 3px ${tk.liveGreenRing}`,
            animation: "pulseDot 2s ease-in-out infinite",
          }} />
          <span style={{ fontFamily: tk.numberFont, fontSize: 19, fontWeight: 600, color: tk.timerColor, letterSpacing: "0.5px" }}>
            {fmt(duration)}
          </span>
        </div>

        {isOnHold ? (
          <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.6px", background: tk.holdBadgeBg, color: tk.holdBadgeClr, border: `1px solid ${tk.holdBadgeBord}`, borderRadius: 9999, padding: "3px 10px" }}>
            On Hold
          </span>
        ) : (
          <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.6px", background: tk.greenBg, color: tk.green, border: `1px solid rgba(34,197,94,0.22)`, borderRadius: 9999, padding: "3px 10px" }}>
            Live
          </span>
        )}
      </div>

      {/* ── Caller info ── */}
      <div style={{ padding: "13px 16px 12px", display: "flex", alignItems: "center", gap: 12, borderBottom: `1px solid ${tk.divider}` }}>
        <div style={{
          width: 44, height: 44, borderRadius: 14,
          background: pal.bg, border: `1.5px solid ${pal.ring}40`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 16, fontWeight: 700, color: pal.text, flexShrink: 0,
        }}>
          {(customerName?.[0] || "?").toUpperCase()}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: tk.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", letterSpacing: "-0.01em" }}>
            {customerName || "Unknown"}
          </div>
          <div style={{ fontSize: 11.5, color: tk.muted, fontFamily: "monospace", marginTop: 2, letterSpacing: "0.04em" }}>
            {customerNumber || "—"}
          </div>
        </div>
        {/* Status chip */}
        <div style={{ display: "inline-flex", alignItems: "center", gap: 5, background: isMuted ? tk.redBg : isOnHold ? tk.amberBg : tk.accentBg, border: `1px solid ${isMuted ? tk.redBord : isOnHold ? tk.amberBord : tk.accentBord}`, borderRadius: 9999, padding: "4px 9px", flexShrink: 0 }}>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: isMuted ? tk.red : isOnHold ? tk.amber : tk.accent, flexShrink: 0 }} />
          <span style={{ fontSize: 10, fontWeight: 600, color: isMuted ? tk.red : isOnHold ? tk.amberText : tk.accent, letterSpacing: "0.04em" }}>
            {isMuted ? "Muted" : isOnHold ? "Hold" : "Live"}
          </span>
        </div>
      </div>

      {/* ── Participants (transfer status + remove) ── */}
      {participants.length > 0 && (
        <div style={{ padding: "10px 14px 4px", maxHeight: 200, overflowY: "auto", borderBottom: `1px solid ${tk.divider}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 7, fontSize: 9.5, fontWeight: 800, letterSpacing: "0.10em", textTransform: "uppercase", color: tk.muted }}>
            <Users size={12} /> In this call · {participants.length}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {participants.map((p) => {
              const isSelf     = !!selfCallSid && p.callSid === selfCallSid;
              const isTransfer = p.kind === "transfer" || p.isTransfer;
              const s          = (p.status || "").toLowerCase();
              const ringing    = ["ringing", "queued", "initiated", "dialing"].includes(s);
              const dead       = ["no-answer", "busy", "failed", "canceled"].includes(s);
              const stColor    = ringing ? tk.amber : dead ? tk.red : tk.green;
              const stLabel    = ringing ? "Ringing…" : dead ? "No answer" : "Connected";
              const label      = p.displayName || p.number || p.identity || "Unknown";
              return (
                <div key={p.callSid} style={{ display: "flex", alignItems: "center", gap: 9, padding: "7px 9px", borderRadius: 11, background: isDark ? "rgba(255,255,255,0.04)" : "#F6F7F9", border: `1px solid ${tk.border}` }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", flexShrink: 0, background: isTransfer ? tk.accentBg : tk.surface, border: `1px solid ${isTransfer ? tk.accentBord : tk.border}`, display: "flex", alignItems: "center", justifyContent: "center", color: isTransfer ? tk.accent : tk.muted }}>
                    {isTransfer ? <ArrowRightLeft size={12} /> : <User size={13} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: tk.text, lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {label}{isSelf && <span style={{ color: tk.muted, fontWeight: 600 }}> · You</span>}
                    </div>
                    <div style={{ fontSize: 9.5, fontWeight: 600, color: tk.muted, marginTop: 1, textTransform: "capitalize" }}>
                      {isTransfer ? "Transfer target" : p.kind || "participant"}
                    </div>
                  </div>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 9, fontWeight: 800, color: stColor, background: ringing ? tk.amberBg : dead ? tk.redBg : tk.greenBg, border: `1px solid ${ringing ? tk.amberBord : dead ? tk.redBord : "rgba(34,197,94,0.22)"}`, borderRadius: 999, padding: "3px 8px", flexShrink: 0, whiteSpace: "nowrap" }}>
                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: stColor, animation: ringing ? "pulseDot 1.4s ease-in-out infinite" : "none" }} />
                    {stLabel}
                  </span>
                  {!isSelf && (
                    <button onClick={() => onRemoveParticipant(p.callSid)} title="Remove from call" style={{ width: 26, height: 26, borderRadius: "50%", flexShrink: 0, border: `1px solid ${tk.redBord}`, background: tk.redBg, color: tk.red, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <UserMinus size={12} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Action buttons ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, padding: "12px 12px 10px" }}>
        <ActionBtn
          label={isMuted ? "Unmute" : "Mute"}
          icon={isMuted ? <MicOff size={15} /> : <Mic size={15} />}
          onClick={onMute} active={isMuted}
          activeBg={tk.redBg} activeColor={tk.red} activeBord={tk.redBord}
          isDark={isDark} tk={tk}
        />
        <ActionBtn
          label={isOnHold ? "Resume" : "Hold"}
          icon={isOnHold ? <PlayCircle size={15} /> : <Pause size={15} />}
          onClick={onHold} active={isOnHold}
          activeBg={tk.amberBg} activeColor={tk.amber} activeBord={tk.amberBord}
          isDark={isDark} tk={tk}
        />
        {privileges?.transcription && (
          <ActionBtn label="Notes" icon={<BookOpen size={15} />} onClick={onNotes} isDark={isDark} tk={tk} />
        )}
        {privileges?.transfer && (
          <ActionBtn label="Transfer" icon={<ArrowRightLeft size={15} />} onClick={onAdd} isDark={isDark} tk={tk} />
        )}
        <ActionBtn label="Lead" icon={<Plus size={15} />} onClick={onMakeLead} isDark={isDark} tk={tk} />
        <ActionBtn
          label="Block"
          icon={<Ban size={15} />}
          onClick={() => setShowBlockConfirm(true)}
          hoverBg={tk.redBg} hoverColor={tk.red} hoverBord={tk.redBord}
          isDark={isDark} tk={tk}
        />
      </div>

      {/* ── Hang up ── */}
      <div style={{ padding: "2px 12px 14px" }}>
        <motion.button
          whileTap={{ scale: 0.94 }} whileHover={{ scale: 1.02 }}
          onClick={onHangup}
          style={{
            width: "100%",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            background: "linear-gradient(135deg, #EF4444 0%, #DC2626 100%)",
            color: "#fff", border: "none", borderRadius: 13,
            padding: "11px 0", fontSize: 13.5, fontWeight: 600,
            cursor: "pointer",
            boxShadow: isDark
              ? "0 4px 18px rgba(239,68,68,0.45)"
              : "0 4px 16px rgba(208,40,26,0.30)",
            fontFamily: "inherit", letterSpacing: "-0.01em",
          }}
        >
          <PhoneOff size={15} /> End Call
        </motion.button>
      </div>

      <BlockNumberConfirmModal
        isOpen={showBlockConfirm}
        onClose={() => setShowBlockConfirm(false)}
        onConfirm={handleConfirmBlock}
        customerNumber={customerNumber}
      />

      <style>{`
        @keyframes accentShimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes pulseDot { 0%,100%{opacity:1} 50%{opacity:0.35} }
      `}</style>
    </motion.div>
  );
}

/* ── Reusable action button — enhanced ── */
function ActionBtn({
  icon, label, onClick,
  active = false,
  activeBg, activeColor, activeBord,
  hoverBg, hoverColor, hoverBord,
  isDark, tk,
}: any) {
  const [hovered, setHovered] = useState(false);

  const bg    = active ? activeBg    : hovered && hoverBg    ? hoverBg    : isDark ? "rgba(255,255,255,0.06)" : "#F6F7F9";
  const color = active ? activeColor : hovered && hoverColor ? hoverColor : tk.muted;
  const bord  = active ? activeBord  : hovered && hoverBord  ? hoverBord  : tk.border;

  return (
    <motion.button
      whileTap={{ scale: 0.88 }}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex", flexDirection: "column", alignItems: "center", gap: 5,
        background: bg, border: `1px solid ${bord}`,
        borderRadius: 12, padding: "9px 4px",
        cursor: "pointer", transition: "all 120ms ease",
        color, fontFamily: "inherit",
        transform: hovered && !active ? "translateY(-1px)" : "none",
        boxShadow: active
          ? `0 2px 8px ${activeColor}25`
          : hovered ? (isDark ? "0 2px 8px rgba(0,0,0,0.30)" : "0 2px 8px rgba(0,0,0,0.08)")
          : "none",
      }}
    >
      {icon}
      <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.2px", lineHeight: 1 }}>{label}</span>
    </motion.button>
  );
}