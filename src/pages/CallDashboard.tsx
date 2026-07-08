// @ts-nocheck

import { useEffect, useRef, useState, useMemo, useCallback, memo } from "react";
import { Device, Call } from "@twilio/voice-sdk";
import { useAuth } from "../context/AuthContext";
import api from "../api";
import {
  Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed,
  Delete, Globe, Clock, MessageCircle, UserPlus,
  User, Trash2, Lock, RadioTower, Loader2, SkipForward,
} from "lucide-react";
import { AsYouType, parsePhoneNumberFromString } from "libphonenumber-js";
import { useCall } from "../context/CallContext";
import { io } from "socket.io-client";
import { API_URL } from "../main";
import { Toaster } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { useFloatingChat } from "../context/FloatingChatContext";
import { useTheme } from "../context/ThemeContext";
import { formatTime, formatDate, formatFullDate, formatDuration } from "../hooks/dateFormat";
import AgentAutoDialPanel from "../components/AgentAutoDialPanel";


// ─── Helpers ──────────────────────────────────────────────────────────────────
const detectRegion = (input: string): "US" | "PK" => {
  if (input.startsWith("+")) return "US";
  if (/^0(3|4|5|6|7|8|9)/.test(input)) return "PK";
  return "US";
};

// ── FIX 1: formatPretty now preserves * and # ──
// AsYouType strips special chars, so we handle them separately.
const formatPretty = (raw: string): string => {
  if (!raw) return "";
  // If the input contains * or #, return as-is (no phone formatting)
  if (/[*#]/.test(raw)) return raw;
  if (raw.startsWith("+")) return new AsYouType().input(raw);
  return new AsYouType(detectRegion(raw)).input(raw);
};

const toE164 = (raw: string): string => {
  if (!raw) return "";
  // * and # are valid dialpad inputs — pass through as-is
  if (/[*#]/.test(raw)) return raw;
  try {
    const region = raw.startsWith("+") ? undefined : detectRegion(raw);
    const p = parsePhoneNumberFromString(raw, region);
    if (p?.isValid()) return p.number;
    return raw.replace(/[^\d+]/g, "");
  } catch {
    return raw.replace(/[^\d+]/g, "");
  }
};

const AVATAR_COLORS = [
  { bg: "#EEF2FF", text: "#4F46E5" },
  { bg: "#F0FDF4", text: "#16A34A" },
  { bg: "#FFF7ED", text: "#EA580C" },
  { bg: "#EFF6FF", text: "#5B5BD6" },
  { bg: "#FFF1F2", text: "#E11D48" },
  { bg: "#F0FDFA", text: "#0D9488" },
  { bg: "#FFFBEB", text: "#D97706" },
  { bg: "#FDF4FF", text: "#A21CAF" },
];

const AVATAR_COLORS_DARK = [
  { bg: "#1E1E3A", text: "#818CF8" },
  { bg: "#0F2A1E", text: "#34D399" },
  { bg: "#2A1A0A", text: "#FB923C" },
  { bg: "#1A1A3A", text: "#818CF8" },
  { bg: "#2A0F1A", text: "#FB7185" },
  { bg: "#0A2A28", text: "#2DD4BF" },
  { bg: "#2A1F00", text: "#FCD34D" },
  { bg: "#2A0A2A", text: "#E879F9" },
];

const getAvatarColor = (str: string, isDark = false) => {
  let hash = 0;
  for (let i = 0; i < (str || "").length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  const palette = isDark ? AVATAR_COLORS_DARK : AVATAR_COLORS;
  return palette[Math.abs(hash) % palette.length];
};

const getInitials = (name: string) =>
  (name || "?").trim().split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

// ─── Dialpad buttons ──────────────────────────────────────────────────────────
const DIALPAD: [string, string][] = [
  ["1", ""], ["2", "ABC"], ["3", "DEF"],
  ["4", "GHI"], ["5", "JKL"], ["6", "MNO"],
  ["7", "PQRS"], ["8", "TUV"], ["9", "WXYZ"],
  ["*", ""], ["0", "+"], ["#", ""],
];

// Long-press threshold in ms
const LONG_PRESS_MS = 500;

type CallType = "all" | "incoming" | "outgoing" | "missed";

// ─── Log Item Component ───────────────────────────────────────────────────────
const LogItem = memo(({ log, onClick, isDark }: any) => {
  const [hovered, setHovered] = useState(false);
  const name      = log?.contactName || "Unknown";
  const color     = getAvatarColor(name, isDark);
  const isMissed  = log?.type === "missed";
  const isInbound = log?.direction === "inbound";

  const accentColor = isMissed ? "#D0281A" : isInbound ? "#17A363" : (isDark ? "#7C7CF0" : "#5B5BD6");
  const accentBg    = isMissed
    ? (isDark ? "#2A0F0F" : "#FEE2E2")
    : isInbound
    ? (isDark ? "#0F2A1E" : "#DCFCE7")
    : (isDark ? "#1E1E3A" : "#EDEDFB");

  const dirIcon  = isMissed
    ? <PhoneMissed size={11} />
    : isInbound
    ? <PhoneIncoming size={11} />
    : <PhoneOutgoing size={11} />;
  const dirLabel = isMissed ? "Missed" : isInbound ? "Inbound" : "Outbound";
  const dragNumber = log?.number || log?.phoneNumber || "";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -8 }}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      draggable={!!dragNumber}
      onDragStart={(e: any) => {
        e.dataTransfer.setData("application/x-phone-number", dragNumber);
        e.dataTransfer.setData("text/plain", dragNumber);
        e.dataTransfer.effectAllowed = "copy";
      }}
      style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "10px 14px 10px 12px", borderRadius: 14, cursor: "pointer",
        background: hovered ? (isDark ? "#1E1E28" : "#fff") : "transparent",
        border: `1px solid ${hovered ? (isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)") : "transparent"}`,
        boxShadow: hovered ? (isDark ? "0 2px 12px rgba(0,0,0,0.30)" : "0 2px 12px rgba(0,0,0,0.07)") : "none",
        transition: "all 0.14s ease",
        position: "relative", overflow: "hidden",
      }}
    >
      {/* Left accent strip */}
      <div style={{
        position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)",
        width: 3, height: 32, borderRadius: "0 3px 3px 0",
        background: accentColor,
        opacity: hovered ? 1 : 0, transition: "opacity 0.14s",
      }} />

      {/* Avatar */}
      <div style={{
        width: 40, height: 40, borderRadius: "50%",
        background: color.bg, color: color.text,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 13, fontWeight: 700, flexShrink: 0,
        border: `1.5px solid ${color.text}33`,
      }}>
        {getInitials(name)}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13, fontWeight: 600,
          color: isMissed ? "#D0281A" : (isDark ? "#F0F0F5" : "#0D0D12"),
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          lineHeight: 1.3,
        }}>
          {name}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 3 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 3,
            fontSize: 10, fontWeight: 600, color: accentColor,
            background: accentBg, padding: "1px 6px", borderRadius: 20,
          }}>
            {dirIcon} {dirLabel}
          </div>
          <span style={{ fontSize: 10, color: isDark ? "#3A3A4A" : "#BBBBC8" }}>·</span>
          <span style={{ fontSize: 10, color: isDark ? "#68687A" : "#9E9EAD" }}>
            {formatTime(log?.startTime)}
          </span>
        </div>
      </div>

      {/* Right: duration pill OR hover call-back */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
        {hovered ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{
              display: "flex", alignItems: "center", gap: 5,
              background: isDark ? "#7C7CF0" : "#5B5BD6", color: "#fff",
              padding: "5px 11px", borderRadius: 20,
              fontSize: 11, fontWeight: 600,
              boxShadow: isDark ? "0 2px 10px rgba(124,124,240,0.35)" : "0 2px 10px rgba(91,91,214,0.30)",
            }}
          >
            <Phone size={11} /> Call back
          </motion.div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
            {log?.duration > 0 && (
              <div style={{
                display: "flex", alignItems: "center", gap: 3,
                fontSize: 10, color: isDark ? "#68687A" : "#9E9EAD",
                background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
                padding: "2px 7px", borderRadius: 20,
                border: `1px solid ${isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)"}`,
              }}>
                <Clock size={9} />
                {formatDuration(log.duration)}
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
});

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function CallDashboard() {
  const { openChat } = useFloatingChat();
  const { user, token } = useAuth();
  const {
    startCall,
    missedCount,
    resetMissed,
  
    autoDialEnabled,
    autoDialCurrentItem,
    autoDialLoading,
    autoDialError,
    toggleAutoDial,
    reserveNextAutoDial,
    startAutoDialQueueCall,
    clearAutoDialCurrentItem,
  } = useCall();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const socketRef       = useRef<any>(null);
  const timerRef        = useRef<NodeJS.Timeout | null>(null);
  // ── FIX 2: ref for long-press timer on "0" button ──
  const longPressRef    = useRef<NodeJS.Timeout | null>(null);
  const longFiredRef    = useRef(false);

  const [callActive, setCallActive] = useState(false);
  const [duration,   setDuration]   = useState(0);
  const [rawInput,   setRawInput]   = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const [callLogs,   setCallLogs]   = useState<any[]>([]);
  const [activeTab,  setActiveTab]  = useState<CallType>("all");

  const canMakeCall = user?.role === "ADMIN" || user?.additionalRole?.makeCall === true;

  // ── Socket ──
  useEffect(() => {
    if (!user?.id || !token) return;
    const socket = io(API_URL, {
      path: "/socket.io", transports: ["websocket"], auth: { token },
    });
    socketRef.current = socket;
    socket.emit("join-user-room", { userId: user.id });
    const onNewLog = (newLog: any) => {
      if (newLog.agent_id !== user.id) return;
      setCallLogs((prev) => {
        if (prev.some((l) => l.sessionId === newLog.sessionId)) return prev;
        return [newLog, ...prev];
      });
    };
    socket.on("onCallLogsUpdates", onNewLog);
    return () => {
      socket.off("onCallLogsUpdates", onNewLog);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user?.id, token]);

  // ── Timer ──
  useEffect(() => {
    if (!callActive) { clearInterval(timerRef.current!); setDuration(0); return; }
    timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    return () => clearInterval(timerRef.current!);
  }, [callActive]);

// ── Fetch logs ──
  useEffect(() => {
    if (!token) return;
    api.get("/voice/logs?filter=today&page=1&limit=10&tab=all", { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => setCallLogs(res.data.data || []))
      .catch(console.error);
  }, [token]);

  // ── Keyboard ──
  // FIX 1 also applies here: * and # from keyboard now reach rawInput correctly
  // because formatPretty no longer strips them.
  const handleKey = useCallback((e: KeyboardEvent) => {
    if (/^[0-9*#+]$/.test(e.key)) setRawInput((p) => p + e.key);
    else if (e.key === "Backspace") setRawInput((p) => p.slice(0, -1));
    else if (e.key === "Enter" && rawInput) startCall(rawInput);
  }, [rawInput, startCall]);

  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  // ── FIX 2: Long-press handlers for "0" → "+" ──
  const handleZeroPointerDown = useCallback(() => {
    longFiredRef.current = false;
    longPressRef.current = setTimeout(() => {
      longFiredRef.current = true;
      // Replace trailing "0" with "+" if it was just added, else just append "+"
      setRawInput((p) => (p.endsWith("0") ? p.slice(0, -1) + "+" : p + "+"));
    }, LONG_PRESS_MS);
  }, []);

  const handleZeroPointerUp = useCallback(() => {
    if (longPressRef.current) clearTimeout(longPressRef.current);
  }, []);

  // Normal tap on "0": only fires if long-press did NOT fire
  const handleZeroClick = useCallback(() => {
    if (!longFiredRef.current) {
      setRawInput((p) => p + "0");
    }
    longFiredRef.current = false;
  }, []);

  // ── Filtered logs ──
  const filteredLogs = useMemo(() => {
    if (activeTab === "incoming") return callLogs.filter((l) => l.direction === "inbound" && l.type === "connected");
    if (activeTab === "outgoing") return callLogs.filter((l) => l.direction === "outbound");
    if (activeTab === "missed")   return callLogs.filter((l) => l.type === "missed");
    return callLogs;
  }, [callLogs, activeTab]);

  const phoneNumber = useMemo(() => formatPretty(rawInput), [rawInput]);
  const missedTotal = callLogs.filter((l) => l.type === "missed").length;

  // ── Group filtered logs by date label ──
  const groupedLogs = useMemo(() => {
    const map = new Map<string, any[]>();
    filteredLogs.forEach((log) => {
      const key = formatDate(log?.startTime);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(log);
    });
    return Array.from(map.entries()).map(([date, logs]) => ({ date, logs }));
  }, [filteredLogs]);

  // ── Shared style tokens ──
  const panelBg     = isDark ? "rgba(23,23,31,0.92)"    : "rgba(255,255,255,0.88)";
  const panelBorder = isDark ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.60)";
  const panelShadow = isDark
    ? "0 8px 32px rgba(0,0,0,0.40), 0 0 0 1px rgba(255,255,255,0.04)"
    : "0 8px 32px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)";
  const dividerColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
  const textPrimary  = isDark ? "#F0F0F5" : "#0D0D12";
  const textSecondary = isDark ? "#68687A" : "#9E9EAD";
  const textMuted    = isDark ? "#A0A0B0" : "#6B6B7B";
  const accentMain   = isDark ? "#7C7CF0" : "#5B5BD6";

  const handleToggleAutoDial = useCallback(
    async (checked: boolean) => {
      try {
        await toggleAutoDial?.(checked);
      } catch (err) {
        console.error(err);
      }
    },
    [toggleAutoDial]
  );
  
  const handleAutoDialNext = useCallback(async () => {
    const item = await reserveNextAutoDial?.();
  
    if (item?.phoneNumber) {
      setRawInput(item.phoneNumber);
    }
  }, [reserveNextAutoDial]);
  
  const handleAutoDialStart = useCallback(async () => {
    if (!autoDialCurrentItem) return;
  
    setRawInput(autoDialCurrentItem.phoneNumber || "");
    await startAutoDialQueueCall?.(autoDialCurrentItem);
  }, [autoDialCurrentItem, startAutoDialQueueCall]);

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <>
   
      {/* <Toaster position="top-right" /> */}
      <style>{`
  .spin {
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`}</style>
      <div style={{
        height: "calc(100vh - 5rem)", display: "flex",
        fontFamily: "'Inter', -apple-system, sans-serif",
        background: "var(--bg-app)", gap: 0, overflow: "hidden",
      }}>

        {!canMakeCall ? (
          /* ── No Permission ── */
        <div style={{
            flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
            flexDirection: "column", gap: 16, textAlign: "center", padding: 40,
          }}>
            <div style={{
              width: 72, height: 72, borderRadius: "50%",
              background: isDark ? "rgba(248,113,113,0.10)" : "rgba(208,40,26,0.08)",
              display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 8,
            }}>
              <Lock size={28} style={{ color: isDark ? "#F87171" : "#D0281A" }} />
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: textPrimary, margin: 0 }}>
              Dialer Access Restricted
            </h2>
            <p style={{ fontSize: 14, color: textMuted, maxWidth: 360, lineHeight: 1.6, margin: 0 }}>
              Your current role doesn't have outbound calling permissions. Contact your admin to enable this feature.
            </p>
          </div>
        ) : (
          <div style={{ flex: 1, display: "flex", gap: 16, padding: 20, overflow: "hidden", alignItems: "flex-start" }}>

            {/* ══════════════════════════════════════════════════
                LEFT — DIALER PANEL
            ══════════════════════════════════════════════════ */}
            <motion.div
              initial={{ opacity: 0, x: -24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ type: "spring", damping: 24, stiffness: 200 }}
              style={{
                width: 300, flexShrink: 0,
                background: panelBg,
                backdropFilter: "blur(24px) saturate(180%)",
                WebkitBackdropFilter: "blur(24px) saturate(180%)",
                borderRadius: 22,
                border: `1px solid ${panelBorder}`,
                display: "flex", flexDirection: "column",
                overflow: "hidden", height: "auto",
                boxShadow: panelShadow,
              }}
            >
              {/* ── Agent info bar ── */}
              <div style={{
                padding: "14px 18px",
                borderBottom: `1px solid ${dividerColor}`,
                display: "flex", alignItems: "center", gap: 10,
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: "50%",
                  background: isDark
                    ? "linear-gradient(135deg, #1E1E3A, #2A2A4A)"
                    : "linear-gradient(135deg, #EDEDFB, #C7C7F5)",
                  border: "1.5px solid rgba(91,91,214,0.25)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: accentMain, fontSize: 13, fontWeight: 700, flexShrink: 0,
                }}>
                  {user?.name?.[0]?.toUpperCase() || "U"}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{
                    fontSize: 12.5, fontWeight: 600, color: textPrimary,
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  }}>
                    {user?.name || "Agent"}
                  </div>
                  <div style={{ fontSize: 10.5, color: textSecondary, fontFamily: "monospace" }}>
                    {formatPretty(user?.phoneNumber || "")}
                  </div>
                </div>
                <div style={{
                  width: 7, height: 7, borderRadius: "50%", background: "#17A363",
                  boxShadow: "0 0 0 3px rgba(23,163,99,0.22)", flexShrink: 0,
                }} />
              </div>

              {/* ── Phone input ── */}
              <div style={{ padding: "16px 18px 10px" }}>
                <div style={{ position: "relative" }}>
                  <input
                    type="text"
                    value={phoneNumber}
                    placeholder={isDragOver ? "Drop number here…" : "Enter number..."}
                    onPaste={(e) => {
                      e.preventDefault();
                      const pasted = e.clipboardData.getData("text").replace(/[^\d+*#]/g, "");
                      setRawInput(pasted);
                    }}
                    onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; setIsDragOver(true); }}
                    onDragLeave={() => setIsDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragOver(false);
                      const dropped = (e.dataTransfer.getData("application/x-phone-number") || e.dataTransfer.getData("text/plain"))
                        .replace(/[^\d+*#]/g, "");
                      if (dropped) setRawInput(dropped);
                    }}
                    style={{
                      width: "100%", boxSizing: "border-box",
                      padding: "13px 44px 13px 16px",
                      fontSize: 22, fontWeight: 700,
                      color: textPrimary,
                      border: isDragOver
                        ? `1.5px dashed ${accentMain}`
                        : (isDark ? "1.5px solid rgba(255,255,255,0.08)" : "1.5px solid rgba(0,0,0,0.08)"),
                      borderRadius: 14,
                      background: isDragOver ? (isDark ? "#1A1A2E" : "#EFEFFC") : (isDark ? "#0F0F14" : "#F6F7F9"),
                      outline: "none",
                      textAlign: "center", letterSpacing: "0.06em",
                      fontFamily: "'JetBrains Mono', monospace",
                      caretColor: accentMain,
                      transition: "border-color 140ms ease, background 140ms ease",
                    }}
                    onFocus={(e) => (e.target.style.borderColor = isDark ? "rgba(124,124,240,0.45)" : "rgba(91,91,214,0.40)")}
                    onBlur={(e)  => (e.target.style.borderColor = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)")}
                    readOnly
                  />
                  {rawInput && (
                    <button
                      onClick={() => setRawInput((p) => p.slice(0, -1))}
                      style={{
                        position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                        background: "none", border: "none", cursor: "pointer", padding: 4,
                        display: "flex", alignItems: "center",
                      }}
                    >
                      <Delete size={17} style={{ color: textSecondary }} />
                    </button>
                  )}
                </div>
              </div>

              {/* ── Dialpad ── */}
              <div style={{
                display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
                gap: 6, padding: "4px 18px 12px",
                justifyItems: "center",
              }}>
                {DIALPAD.map(([digit, letters]) => {
                  const isZero = digit === "0";

                  return (
                    <motion.button
                      key={digit}
                      whileHover={{ scale: 1.07, background: isDark ? "rgba(124,124,240,0.12)" : "rgba(91,91,214,0.08)" }}
                      whileTap={{ scale: 0.90 }}
                      // ── FIX 2: "0" uses long-press handlers; others use normal onClick ──
                      onClick={isZero ? handleZeroClick : () => setRawInput((p) => p + digit)}
                      onPointerDown={isZero ? handleZeroPointerDown : undefined}
                      onPointerUp={isZero ? handleZeroPointerUp : undefined}
                      onPointerLeave={isZero ? handleZeroPointerUp : undefined}
                      style={{
                        display: "flex", flexDirection: "column",
                        alignItems: "center", justifyContent: "center",
                        borderRadius: "50%",
                        border: isDark ? "1.5px solid rgba(255,255,255,0.08)" : "1.5px solid rgba(0,0,0,0.07)",
                        background: isDark ? "#1E1E28" : "#FAFAFA",
                        cursor: "pointer", transition: "all 0.12s",
                        boxShadow: isDark ? "0 1px 4px rgba(0,0,0,0.30)" : "0 1px 4px rgba(0,0,0,0.05)",
                        width: 62, height: 62,
                        userSelect: "none", WebkitUserSelect: "none",
                      }}
                    >
                      <span style={{ fontSize: 19, fontWeight: 600, color: textPrimary, lineHeight: 1 }}>
                        {digit}
                      </span>
                      {letters && (
                        <span style={{ fontSize: 7.5, color: textSecondary, letterSpacing: "0.12em", marginTop: 2, fontWeight: 700 }}>
                          {letters}
                        </span>
                      )}
                      {/* Hint: show "+" under 0 in muted style */}
                     
                    </motion.button>
                  );
                })}
              </div>


              {/* ── Call Button ── */}
              <div style={{ padding: "6px 18px 20px", display: "flex", justifyContent: "center" }}>
                <motion.button
                  onClick={() => startCall(rawInput)}
                  disabled={!toE164(rawInput)}
                  whileHover={toE164(rawInput) ? { scale: 1.09 } : {}}
                  whileTap={toE164(rawInput) ? { scale: 0.92 } : {}}
                  style={{
                    width: 62, height: 62, borderRadius: "50%", border: "none",
                    background: toE164(rawInput)
                      ? (isDark ? "linear-gradient(135deg, #7C7CF0, #6060D8)" : "linear-gradient(135deg, #5B5BD6, #4747C2)")
                      : (isDark ? "#2A2A38" : "#EBEBEB"),
                    color: toE164(rawInput) ? "#fff" : (isDark ? "#4A4A5A" : "#BBBBC8"),
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: toE164(rawInput) ? "pointer" : "not-allowed",
                    boxShadow: toE164(rawInput)
                      ? (isDark ? "0 6px 22px rgba(124,124,240,0.45)" : "0 6px 22px rgba(91,91,214,0.42)")
                      : "none",
                    transition: "all 0.18s",
                  }}
                >
                  <Phone size={24} />
                </motion.button>
              </div>

            </motion.div>

            {/* ══════════════════════════════════════════════════
                RIGHT — CALL LOGS
            ══════════════════════════════════════════════════ */}
            <motion.div
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ type: "spring", damping: 24, stiffness: 200, delay: 0.08 }}
              style={{
                flex: 1,
                height: "calc(100vh - 7rem)",
                background: panelBg,
                backdropFilter: "blur(24px) saturate(180%)",
                WebkitBackdropFilter: "blur(24px) saturate(180%)",
                borderRadius: 22,
                border: `1px solid ${panelBorder}`,
                display: "flex", flexDirection: "column", overflow: "hidden",
                boxShadow: panelShadow,
              }}
            >
              {/* ── Header ── */}
              <div style={{ padding: "16px 20px 0", borderBottom: `1px solid ${dividerColor}`, flexShrink: 0 }}>
                {/* Title row */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: textPrimary, letterSpacing: "-0.02em" }}>
                      Call History
                    </div>
                    <div style={{ fontSize: 11, color: textSecondary, marginTop: 2 }}>
                      {callLogs.length} calls today
                      {missedTotal > 0 && (
                        <span style={{ color: isDark ? "#F87171" : "#D0281A", fontWeight: 600, marginLeft: 6 }}>
                          · {missedTotal} missed
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Quick stat pills */}
                  <div style={{ display: "flex", gap: 6 }}>
                    {[
                      { label: "In",     count: callLogs.filter((l) => l.direction === "inbound" && l.type === "connected").length, color: "#22C77A", bg: isDark ? "#0F2A1E" : "#DCFCE7" },
                      { label: "Out",    count: callLogs.filter((l) => l.direction === "outbound").length,                          color: accentMain, bg: isDark ? "#1E1E3A" : "#EDEDFB" },
                      { label: "Missed", count: missedTotal,                                                                        color: isDark ? "#F87171" : "#D0281A", bg: isDark ? "#2A0F0F" : "#FEE2E2" },
                    ].map(({ label, count, color, bg }) => count > 0 && (
                      <div key={label} style={{
                        display: "flex", alignItems: "center", gap: 4,
                        padding: "3px 10px", borderRadius: 20, background: bg,
                        fontSize: 11, fontWeight: 600, color,
                      }}>
                        {count} {label}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tabs */}
                <div style={{ display: "flex" }}>
                  {([
                    { key: "all",      label: "All",      icon: Phone },
                    { key: "incoming", label: "Incoming", icon: PhoneIncoming },
                    { key: "outgoing", label: "Outgoing", icon: PhoneOutgoing },
                    { key: "missed",   label: "Missed",   icon: PhoneMissed },
                  ] as const).map(({ key, label, icon: Icon }) => {
                    const isActive = activeTab === key;
                    const count = key === "all"      ? callLogs.length
                      : key === "incoming" ? callLogs.filter((l) => l.direction === "inbound" && l.type === "connected").length
                      : key === "outgoing" ? callLogs.filter((l) => l.direction === "outbound").length
                      : callLogs.filter((l) => l.type === "missed").length;

                    return (
                      <button
                        key={key}
                        onClick={() => { setActiveTab(key); if (key === "missed") resetMissed(); }}
                        style={{
                          display: "flex", alignItems: "center", gap: 5,
                          padding: "8px 14px", border: "none", background: "none",
                          cursor: "pointer", fontSize: 12,
                          fontWeight: isActive ? 600 : 500,
                          color: isActive ? accentMain : textMuted,
                          borderBottom: isActive ? `2px solid ${accentMain}` : "2px solid transparent",
                          transition: "all 0.14s", marginBottom: -1, whiteSpace: "nowrap",
                          fontFamily: "inherit",
                        }}
                      >
                        <Icon size={12} />
                        {label}
                        {count > 0 && (
                          <span style={{
                            fontSize: 10, fontWeight: 700, padding: "1px 5px",
                            borderRadius: 20, minWidth: 16, textAlign: "center",
                            background: isActive
                              ? (isDark ? "rgba(124,124,240,0.15)" : "rgba(91,91,214,0.12)")
                              : key === "missed" && missedCount > 0
                              ? (isDark ? "#2A0F0F" : "#FEE2E2")
                              : (isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)"),
                            color: isActive ? accentMain
                              : key === "missed" && missedCount > 0
                              ? (isDark ? "#F87171" : "#D0281A")
                              : textMuted,
                          }}>
                            {key === "missed" && missedCount > 0 ? missedCount : count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ── Scrollable grouped list ── */}
              <div style={{ flex: 1, overflowY: "auto", padding: "10px 10px 14px" }}>
                <AnimatePresence mode="wait">
                  {groupedLogs.length === 0 ? (
                    <motion.div
                      key="empty"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      style={{
                        display: "flex", flexDirection: "column",
                        alignItems: "center", justifyContent: "center",
                        height: 220, gap: 10,
                      }}
                    >
                      <div style={{
                        width: 56, height: 56, borderRadius: "50%",
                        background: isDark ? "rgba(124,124,240,0.10)" : "rgba(91,91,214,0.07)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <Phone size={22} style={{ color: isDark ? "#3A3A5A" : "#BBBBC8" }} />
                      </div>
                      <div style={{ fontSize: 13, color: textSecondary, fontWeight: 500 }}>
                        No calls in this category
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      {groupedLogs.map(({ date, logs }) => (
                        <div key={date}>
                          {/* Date group header */}
                          <div style={{
                            display: "flex", alignItems: "center", gap: 10,
                            padding: "8px 12px 4px",
                          }}>
                            <span style={{
                              fontSize: 10, fontWeight: 700, color: textSecondary,
                              textTransform: "uppercase", letterSpacing: "0.08em",
                              whiteSpace: "nowrap",
                            }}>
                              {date}
                            </span>
                            <div style={{ flex: 1, height: 1, background: dividerColor }} />
                            <span style={{ fontSize: 10, fontWeight: 600, color: isDark ? "#3A3A4A" : "#BBBBC8" }}>
                              {logs.length}
                            </span>
                          </div>

                          {/* Items in this group */}
                          <AnimatePresence>
                            {logs.map((log, idx) => (
                              <LogItem
                                key={log.sessionId || idx}
                                log={log}
                                isDark={isDark}
                                onClick={() => setRawInput(log.number || log.phoneNumber || "")}
                              />
                            ))}
                          </AnimatePresence>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>

          </div>
        )}
      </div>
      {user?.role === "AGENT" && <AgentAutoDialPanel />}
    </>
  );
}