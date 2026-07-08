// @ts-nocheck
import { useEffect, useRef, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  PhoneIncoming, PhoneOutgoing, PhoneOff,
  Ear, User, Radio, Mic, Volume2, VolumeX, MessageSquare,
} from "lucide-react";
import api from "../api";
import { toast } from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { Device } from "@twilio/voice-sdk";
import { API_URL } from "../main";
import { io } from "socket.io-client";
import { useTheme } from "../context/ThemeContext";

/* ── Design tokens ── */
const getTokens = (dark: boolean) => ({
  BG_CARD:         dark ? "#111827"                    : "#ffffff",
  BG_HEAD:         dark ? "#0F172A"                    : "#FAFAFA",
  BG_ROW_HOVER:    dark ? "#111C2E"                    : "#FAFBFF",
  BG_INPUT:        dark ? "#1E2638"                    : "#F6F7F9",
  TEXT:            dark ? "#E5E7EB"                    : "#0D0D12",
  MUTED:           dark ? "#9CA3AF"                    : "#9E9EAD",
  BORDER:          dark ? "rgba(255,255,255,0.08)"     : "rgba(0,0,0,0.07)",
  SHADOW:          dark
    ? "0 24px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.06)"
    : "0 24px 80px rgba(0,0,0,0.14), 0 0 0 1px rgba(255,255,255,0.60)",
  MODAL_OVERLAY:   dark ? "rgba(0,0,0,0.70)"           : "rgba(0,0,0,0.45)",
  MODAL_HEADER:    dark
    ? "linear-gradient(135deg,#4E4EBB,#6B6BE0)"
    : "linear-gradient(135deg,#5B5BD6,#7B7BE8)",
  BARGE_HEADER:    "linear-gradient(135deg,#B91C1C,#D0281A)",
  LIVE_BG:         dark ? "rgba(23,163,99,0.16)"       : "rgba(23,163,99,0.10)",
  LIVE_BORDER:     dark ? "rgba(23,163,99,0.28)"       : "rgba(23,163,99,0.20)",
  LIVE_TEXT:       "#17A363",
  P:               "#5B5BD6",
  P_BG:            dark ? "rgba(91,91,214,0.14)"       : "rgba(91,91,214,0.07)",
  P_BORDER:        dark ? "rgba(91,91,214,0.25)"       : "rgba(91,91,214,0.14)",
  BARGE_COLOR:     "#D0281A",
  BARGE_BG:        dark ? "rgba(208,40,26,0.14)"       : "rgba(208,40,26,0.07)",
  BARGE_BORDER:    dark ? "rgba(208,40,26,0.28)"       : "rgba(208,40,26,0.18)",
  YELLOW_BG:       dark ? "rgba(245,158,11,0.14)"      : "rgba(245,158,11,0.10)",
  YELLOW_BORDER:   dark ? "rgba(245,158,11,0.34)"      : "rgba(245,158,11,0.30)",
  RED:             "#D0281A",
  DISABLED_BG:     dark ? "rgba(255,255,255,0.05)"     : "rgba(0,0,0,0.04)",
  DISABLED_TEXT:   dark ? "#3A3A4A"                    : "#C0C0C8",
  WHISPER_COLOR:   "#D97706",
  WHISPER_BG:      dark ? "rgba(217,119,6,0.14)"       : "rgba(217,119,6,0.08)",
  WHISPER_BORDER:  dark ? "rgba(217,119,6,0.30)"       : "rgba(217,119,6,0.20)",
  WHISPER_HEADER:  "linear-gradient(135deg,#B45309,#D97706)",
});

const fmt = (s: number) =>
  `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

/* ════════════════════════════════════════════════════════════
   MAIN
════════════════════════════════════════════════════════════ */
export default function LiveCallForAgent({ calls,teamId }: { calls: any[],teamId:Number }) {
  const { theme }         = useTheme();
  const isDark            = theme === "dark";
  const tk                = useMemo(() => getTokens(isDark), [isDark]);
  const { user }          = useAuth();

  /* ── Permission check ──
     Matches the actual TeamPrivilege schema fields — listenLiveCalls and
     bargeCalls are independent permissions, each gating its own button. */
  const matchedTeam       = user?.supervisedTeams?.find(
    (team: any) => String(team.id) === String(teamId)
  );
  const teamPrivileges    = matchedTeam?.privileges?.[0];
  const canListen         = teamPrivileges?.listenLiveCalls ?? false;
  const canBarge          = teamPrivileges?.bargeCalls ?? false;
  const canWhisper        = canBarge; // whisper requires barge permission
  const canMonitorAtAll   = canListen || canBarge;

  /* ── Refs ── */
  const deviceRef         = useRef<Device | null>(null);
  const activeCallRef     = useRef<any>(null);

  /* ── State ── */
  const [monitorCall, setMonitorCall] = useState<{
    conferenceName:    string;
    agentName:         string;
    customerNumber:    string;
    supervisorCallSid: string;
    mode:              "listen" | "barge" | "whisper";
  } | null>(null);

  const [monitorDuration, setMonitorDuration] = useState(0);
  const [speakerOn, setSpeakerOn]             = useState(true);
  const [actionLoading, setActionLoading]     = useState<string | null>(null);

  /* ────────────────────────────────────────────────────────
     Device init — mount pe ek baar
     /voice/token/supervisor se Voice token lo
     Device.on('incoming') → auto accept + mute for listen
  ──────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!canMonitorAtAll) return;

    let dev: Device | null = null;

    const initDevice = async () => {
      try {
        const res = await api.get("/token/sip", { params: { purpose: "monitor" } });
        const { token } = res.data;

        dev = new Device(token, {
          logLevel:         1,
          codecPreferences: ["opus", "pcmu"] as any,
        });

        dev.on("incoming", (call: any) => {
          console.log("📞 Supervisor incoming call — auto accepting");
          activeCallRef.current = call;

          call.on("disconnect", () => {
            console.log("Supervisor call disconnected");
            activeCallRef.current = null;
            cleanupState();
          });

          call.on("error", (err: any) => console.error("Supervisor call error:", err));

          call.accept();
          // mute state will be set by handleAction after 800ms
        });

        dev.on("registered",   () => console.log("✅ Supervisor Device registered"));
        dev.on("unregistered", () => console.log("Supervisor Device unregistered"));
        dev.on("error",        (err: any) => console.error("Device error:", err));

        await dev.register();
        deviceRef.current = dev;
      } catch (err) {
        console.error("Supervisor device init failed:", err);
      }
    };

    initDevice();

    return () => {
      try {
        activeCallRef.current?.disconnect();
        dev?.unregister();
        dev?.destroy();
      } catch {}
      deviceRef.current  = null;
      activeCallRef.current = null;
    };
  }, [canMonitorAtAll]);

  /* ── Socket: call ended ── */
  useEffect(() => {
    const socket = io(API_URL, { transports: ["websocket"], autoConnect: true });

    // ✅ FIX #3: Handle new payload with type and reason fields
    socket.on("admin-call-ended", ({ conferenceName, type, reason }: any) => {
      if (monitorCall?.conferenceName === conferenceName) {
        cleanupState();
        toast(`Call ended (${type || 'unknown'})`);
      }
    });

    return () => { socket.disconnect(); };
  }, [monitorCall?.conferenceName]);

  /* ── Duration timer ── */
  useEffect(() => {
    if (!monitorCall) return;
    const iv = setInterval(() => setMonitorDuration(d => d + 1), 1000);
    return () => clearInterval(iv);
  }, [monitorCall]);

  const cleanupState = () => {
    setMonitorCall(null);
    setMonitorDuration(0);
    setSpeakerOn(true);
  };

  /* ────────────────────────────────────────────────────────
     handleAction — listen ya barge
  ──────────────────────────────────────────────────────── */
  const handleAction = async (call: any, mode: "listen" | "barge" | "whisper") => {
    if (mode === "listen"  && !canListen)  return;
    if (mode === "barge"   && !canBarge)   return;
    if (mode === "whisper" && !canWhisper) return;
    if (monitorCall) await stopMonitor();

    setActionLoading(call.conferenceName);
    const backendMode = mode === "whisper" ? "coach" : mode;
    try {
      const res = await api.post(
        `/voice/admin/calls/${encodeURIComponent(call.conferenceName)}/supervisor/join`,
        { mode: backendMode }
      );
      const { supervisorCallSid } = res.data;

      setMonitorCall({
        conferenceName:    call.conferenceName,
        agentName:         call.agentName || "—",
        customerNumber:    call.customerNumber || "—",
        supervisorCallSid,
        mode,
      });
      setMonitorDuration(0);
      setSpeakerOn(mode !== "listen");

      setTimeout(() => {
        if (activeCallRef.current) {
          activeCallRef.current.mute(mode === "listen");
        }
      }, 800);

      const msg = mode === "listen" ? "🎧 Listening to call…" : mode === "whisper" ? "🤫 Whispering to agent only" : "🎤 Barged into call";
      toast.success(msg, { duration: 3000 });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || `Failed to ${mode} call`);
    } finally {
      setActionLoading(null);
    }
  };

  /* ── Stop monitor ── */
  const stopMonitor = async () => {
    try {
      activeCallRef.current?.disconnect();
      activeCallRef.current = null;
    } catch {}

    if (monitorCall?.supervisorCallSid) {
      try {
        await api.post("/voice/admin/calls/supervisor/stop", {
          supervisorCallSid: monitorCall.supervisorCallSid,
        });
      } catch {}
    }

    cleanupState();
  };

  /* ── Switch mode on-the-fly ── */
  const handleSwitchMode = async (newMode: "listen" | "barge" | "whisper") => {
    if (!monitorCall || monitorCall.mode === newMode) return;
    if (newMode === "listen"  && !canListen)  return;
    if (newMode === "barge"   && !canBarge)   return;
    if (newMode === "whisper" && !canWhisper) return;
    const backendMode = newMode === "whisper" ? "coach" : newMode;
    try {
      await api.patch("/voice/admin/calls/supervisor/mode", {
        conferenceName:    monitorCall.conferenceName,
        supervisorCallSid: monitorCall.supervisorCallSid,
        mode:              backendMode,
      });
      if (activeCallRef.current) {
        activeCallRef.current.mute(newMode === "listen");
      }
      setMonitorCall(prev => prev ? { ...prev, mode: newMode } : prev);
      setSpeakerOn(newMode !== "listen");
      const msg = newMode === "listen" ? "🎧 Listen only" : newMode === "whisper" ? "🤫 Whispering to agent" : "🎤 Barged in";
      toast.success(msg, { duration: 2000 });
    } catch {
      toast.error("Failed to switch mode");
    }
  };

  /* ── Toggle speaker ── */
  const handleToggleSpeaker = () => {
    const next = !speakerOn;
    activeCallRef.current?.mute(!next);
    setSpeakerOn(next);
  };

  /* ── No monitoring privilege at all → don't render this component ── */
  if (!canMonitorAtAll) return null;

  /* ── Empty state ── */
  if (!calls.length) {
    return (
      <div style={{
        background: tk.BG_CARD, border: `1px solid ${tk.BORDER}`,
        borderRadius: 16, padding: "32px 20px", textAlign: "center",
        marginTop: 16, color: tk.MUTED,
        display:'flex',
        justifyContent:'center'
      }}>
        <Radio size={28} style={{ marginBottom: 10 }} />
        <div style={{ fontSize: 14, fontWeight: 500 }}>No active calls right now</div>
      </div>
    );
  }

  /* ════════════════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════════════════ */
  return (
    <>
      <div style={{
        background: tk.BG_CARD, border: `1px solid ${tk.BORDER}`,
        borderRadius: 18, marginTop: 16, overflow: "hidden",
        boxShadow: tk.SHADOW,
      }}>
        {/* HEADER */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "16px 20px", borderBottom: `1px solid ${tk.BORDER}`,
          background: tk.BG_HEAD,
        }}>
          <span style={{
            width: 9, height: 9, borderRadius: "50%", background: "#17A363",
            boxShadow: "0 0 0 3px rgba(23,163,99,0.22)", display: "inline-block",
            animation: "agentLivePulse 1.6s ease-in-out infinite",
          }} />
          <span style={{ fontWeight: 700, fontSize: 15, color: tk.TEXT }}>Live Calls</span>
          <span style={{
            background: tk.LIVE_BG, color: tk.LIVE_TEXT,
            border: `1px solid ${tk.LIVE_BORDER}`,
            borderRadius: 9999, fontSize: 11, fontWeight: 700, padding: "2px 9px",
          }}>
            {calls.length}
          </span>

          {/* Permission warning — component only renders at all when at
              least one of listen/barge is granted, so this only ever
              flags the OTHER one being missing. */}
          {(!canListen || !canBarge) && (
            <span style={{
              marginLeft: "auto", fontSize: 11.5, color: tk.MUTED,
              background: tk.DISABLED_BG, padding: "3px 10px",
              borderRadius: 8, border: `1px solid ${tk.BORDER}`,
            }}>
              {!canListen ? "Listen access not granted" : "Barge access not granted"}
            </span>
          )}
        </div>

        {/* TABLE */}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Agent", "Customer", "Direction", "Status", ""].map(h => (
                  <th key={h} style={{
                    textAlign: "left", padding: "10px 18px",
                    fontSize: 11, fontWeight: 700, color: tk.MUTED,
                    textTransform: "uppercase", letterSpacing: "0.05em",
                    borderBottom: `1px solid ${tk.BORDER}`, background: tk.BG_HEAD,
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {calls.map((call, i) => {
                const isActive   = monitorCall?.conferenceName === call.conferenceName;
                const activeMode = isActive ? monitorCall?.mode : undefined;
                const loading    = actionLoading === call.conferenceName;
                const isInbound  = call.direction === "inbound";

                return (
                  <AgentCallRow
                    key={call.conferenceName}
                    call={call}
                    isLast={i === calls.length - 1}
                    isActive={isActive}
                    activeMode={activeMode}
                    loading={loading}
                    canListen={canListen}
                    canBarge={canBarge}
                    canWhisper={canWhisper}
                    isInbound={isInbound}
                    onListen={() => handleAction(call, "listen")}
                    onBarge={() => handleAction(call, "barge")}
                    onWhisper={() => handleAction(call, "whisper")}
                    tk={tk}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MONITOR MODAL */}
      <AnimatePresence>
        {monitorCall && (
          <AgentMonitorModal
            tk={tk}
            agentName={monitorCall.agentName}
            customerNumber={monitorCall.customerNumber}
            conferenceName={monitorCall.conferenceName}
            duration={monitorDuration}
            mode={monitorCall.mode}
            speakerOn={speakerOn}
            canListen={canListen}
            canBarge={canBarge}
            canWhisper={canWhisper}
            onToggleSpeaker={handleToggleSpeaker}
            onSwitchMode={handleSwitchMode}
            onStop={stopMonitor}
          />
        )}
      </AnimatePresence>

      <style>{`
        @keyframes agentLivePulse {
          0%, 100% { box-shadow: 0 0 0 3px rgba(23,163,99,0.22); }
          50%       { box-shadow: 0 0 0 6px rgba(23,163,99,0.08); }
        }
        @keyframes agent-spin { to { transform: rotate(360deg) } }
      `}</style>
    </>
  );
}

/* ════════════════════════════════════════════════════════════
   TABLE ROW
════════════════════════════════════════════════════════════ */
function AgentCallRow({
  call, isLast, isActive, activeMode, loading, canListen, canBarge, canWhisper, isInbound,
  onListen, onBarge, onWhisper, tk,
}: any) {
  const [hovered, setHovered] = useState(false);

  const cell: React.CSSProperties = {
    padding: "13px 18px", fontSize: 13, color: tk.TEXT,
    borderBottom: isLast ? "none" : `1px solid ${tk.BORDER}`,
    background: hovered ? tk.BG_ROW_HOVER : tk.BG_CARD,
    transition: "background 0.12s", verticalAlign: "middle",
  };

  return (
    <tr onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      {/* AGENT */}
      <td style={cell}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <div style={{
            width: 32, height: 32, borderRadius: "50%",
            background: "linear-gradient(135deg,#EDEDFB,#D8D8F7)",
            border: "1.5px solid rgba(91,91,214,0.18)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 12, fontWeight: 700, color: "#5B5BD6", flexShrink: 0,
          }}>
            {(call.agentName?.[0] || "?").toUpperCase()}
          </div>
          <span style={{ fontWeight: 600 }}>{call.agentName || "—"}</span>
        </div>
      </td>

      {/* CUSTOMER */}
      <td style={cell}>
        <span style={{ fontFamily: "monospace", fontSize: 12.5, color: tk.MUTED }}>
          {call.customerNumber || "—"}
        </span>
      </td>

      {/* DIRECTION */}
      <td style={cell}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          background: isInbound ? "rgba(59,130,246,0.08)" : "rgba(23,163,99,0.08)",
          color: isInbound ? "#2563EB" : "#15803D",
          border: `1px solid ${isInbound ? "rgba(59,130,246,0.18)" : "rgba(23,163,99,0.18)"}`,
          borderRadius: 9999, padding: "3px 10px", fontSize: 11.5, fontWeight: 600,
        }}>
          {isInbound
            ? <><PhoneIncoming size={12} /> Inbound</>
            : <><PhoneOutgoing size={12} /> Outbound</>}
        </div>
      </td>

      {/* STATUS */}
      <td style={cell}>
        {isActive ? (
          <span style={{
            background: activeMode === "barge" ? tk.BARGE_BG : activeMode === "whisper" ? tk.WHISPER_BG : tk.P_BG,
            color: activeMode === "barge" ? tk.BARGE_COLOR : activeMode === "whisper" ? tk.WHISPER_COLOR : tk.P,
            border: `1px solid ${activeMode === "barge" ? tk.BARGE_BORDER : activeMode === "whisper" ? tk.WHISPER_BORDER : tk.P_BORDER}`,
            borderRadius: 9999, padding: "3px 10px",
            fontSize: 11, fontWeight: 700, textTransform: "uppercase",
          }}>
            {activeMode === "barge" ? "🎤 Barged In" : activeMode === "whisper" ? "🤫 Whispering" : "🎧 Listening"}
          </span>
        ) : (
          <span style={{
            background: tk.LIVE_BG, color: tk.LIVE_TEXT,
            border: `1px solid ${tk.LIVE_BORDER}`,
            borderRadius: 9999, padding: "3px 10px",
            fontSize: 11, fontWeight: 700, textTransform: "uppercase",
          }}>
            Live
          </span>
        )}
      </td>

      {/* ACTIONS */}
      <td style={{ ...cell, textAlign: "right" }}>
        <div style={{ display: "inline-flex", gap: 8 }}>
          {/* Listen */}
          <button onClick={onListen} disabled={!canListen || !!loading} title={!canListen ? "Listen access not granted" : "Listen silently"}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, background: isActive && activeMode === "listen" ? tk.P : canListen ? tk.P_BG : tk.DISABLED_BG, color: isActive && activeMode === "listen" ? "#fff" : canListen ? tk.P : tk.DISABLED_TEXT, border: `1px solid ${canListen ? tk.P_BORDER : tk.BORDER}`, borderRadius: 9, padding: "6px 13px", fontSize: 12.5, fontWeight: 600, cursor: !canListen || loading ? "not-allowed" : "pointer", fontFamily: "inherit", transition: "all 0.12s", opacity: loading ? 0.6 : 1 }}
          >
            {loading ? <span style={{ width: 12, height: 12, borderRadius: "50%", border: `2px solid ${tk.P}`, borderTopColor: "transparent", animation: "agent-spin 0.7s linear infinite" }} /> : <Ear size={13} />}
            Listen
          </button>

          {/* Barge */}
          <button onClick={onBarge} disabled={!canBarge || !!loading} title={!canBarge ? "Barge access not granted" : "Barge into call"}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, background: isActive && activeMode === "barge" ? tk.BARGE_COLOR : canBarge ? tk.BARGE_BG : tk.DISABLED_BG, color: isActive && activeMode === "barge" ? "#fff" : canBarge ? tk.BARGE_COLOR : tk.DISABLED_TEXT, border: `1px solid ${canBarge ? tk.BARGE_BORDER : tk.BORDER}`, borderRadius: 9, padding: "6px 13px", fontSize: 12.5, fontWeight: 600, cursor: !canBarge || loading ? "not-allowed" : "pointer", fontFamily: "inherit", transition: "all 0.12s", opacity: loading ? 0.6 : 1 }}
          >
            <Mic size={13} /> Barge
          </button>

          {/* Whisper — only shown when canWhisper (= canBarge) */}
          {canWhisper && (
            <button onClick={onWhisper} disabled={!!loading} title="Whisper to agent only — customer cannot hear you"
              style={{ display: "inline-flex", alignItems: "center", gap: 6, background: isActive && activeMode === "whisper" ? tk.WHISPER_COLOR : tk.WHISPER_BG, color: isActive && activeMode === "whisper" ? "#fff" : tk.WHISPER_COLOR, border: `1px solid ${tk.WHISPER_BORDER}`, borderRadius: 9, padding: "6px 13px", fontSize: 12.5, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit", transition: "all 0.12s", opacity: loading ? 0.6 : 1 }}
            >
              <MessageSquare size={13} /> Whisper
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

/* ════════════════════════════════════════════════════════════
   MONITOR MODAL
════════════════════════════════════════════════════════════ */
function AgentMonitorModal({
  tk, agentName, customerNumber, conferenceName,
  duration, mode, speakerOn, canListen, canBarge, canWhisper,
  onToggleSpeaker, onSwitchMode, onStop,
}: any) {
  const isBarge   = mode === "barge";
  const isWhisper = mode === "whisper";

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{
        position: "fixed", inset: 0, background: tk.MODAL_OVERLAY,
        backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 9999, padding: 16,
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 12 }}
        transition={{ type: "spring", stiffness: 280, damping: 24 }}
        style={{
          background: tk.BG_CARD, borderRadius: 22,
          width: "100%", maxWidth: 420,
          boxShadow: tk.SHADOW, overflow: "hidden",
          border: `1px solid ${tk.BORDER}`,
        }}
      >
        {/* HEADER */}
        <div style={{
          background: isBarge ? tk.BARGE_HEADER : isWhisper ? tk.WHISPER_HEADER : tk.MODAL_HEADER,
          padding: "22px 22px 20px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(255,255,255,0.18)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {isBarge ? <Mic size={20} color="#fff" /> : isWhisper ? <MessageSquare size={20} color="#fff" /> : <Ear size={20} color="#fff" />}
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>
                {isBarge ? "Barged Into Call" : isWhisper ? "Whispering to Agent" : "Monitoring Live Call"}
              </div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.70)", marginTop: 1 }}>
                {isBarge ? "Agent & customer can hear you" : isWhisper ? "Only agent can hear you · Customer is unaware" : "Silent · No one can hear you"}
              </div>
            </div>
          </div>
          <div style={{
            background: "rgba(255,255,255,0.18)", borderRadius: 9999,
            padding: "4px 12px", fontSize: 15, fontWeight: 600,
            color: "#fff", letterSpacing: "0.5px", fontFamily: "monospace",
          }}>
            {fmt(duration)}
          </div>
        </div>

        {/* BODY */}
        <div style={{ padding: "20px 22px", background: tk.BG_CARD }}>
          {/* Info rows */}
          <ModalInfoRow tk={tk} label="Agent"      value={agentName} />
          <ModalInfoRow tk={tk} label="Customer"   value={customerNumber} mono />
          <ModalInfoRow tk={tk} label="Conference" value={conferenceName} mono />

          {/* Mode switch */}
          <div style={{ display: "flex", gap: 8, marginTop: 18, marginBottom: 4 }}>
            <button onClick={() => onSwitchMode("listen")} disabled={!canListen}
              style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "10px 0", borderRadius: 10, border: `1px solid ${canListen ? tk.P_BORDER : tk.BORDER}`, background: !canListen ? tk.DISABLED_BG : mode === "listen" ? tk.P : tk.P_BG, color: !canListen ? tk.DISABLED_TEXT : mode === "listen" ? "#fff" : tk.P, fontSize: 13, fontWeight: 600, cursor: canListen ? "pointer" : "not-allowed", fontFamily: "inherit", transition: "all 0.12s", opacity: canListen ? 1 : 0.6 }}
            >
              <Ear size={14} /> Listen
            </button>
            <button onClick={() => onSwitchMode("barge")} disabled={!canBarge}
              style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "10px 0", borderRadius: 10, border: `1px solid ${canBarge ? tk.BARGE_BORDER : tk.BORDER}`, background: !canBarge ? tk.DISABLED_BG : isBarge ? tk.BARGE_COLOR : tk.BARGE_BG, color: !canBarge ? tk.DISABLED_TEXT : isBarge ? "#fff" : tk.BARGE_COLOR, fontSize: 13, fontWeight: 600, cursor: canBarge ? "pointer" : "not-allowed", fontFamily: "inherit", transition: "all 0.12s", opacity: canBarge ? 1 : 0.6 }}
            >
              <Mic size={14} /> Barge
            </button>
            {canWhisper && (
              <button onClick={() => onSwitchMode("whisper")}
                style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "10px 0", borderRadius: 10, border: `1px solid ${tk.WHISPER_BORDER}`, background: isWhisper ? tk.WHISPER_COLOR : tk.WHISPER_BG, color: isWhisper ? "#fff" : tk.WHISPER_COLOR, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "all 0.12s" }}
              >
                <MessageSquare size={14} /> Whisper
              </button>
            )}
          </div>

          {/* Speaker + Stop */}
          <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
            {/* Speaker toggle */}
            <button
              onClick={onToggleSpeaker}
              style={{
                flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                padding: "12px 0", borderRadius: 12, cursor: "pointer",
                fontFamily: "inherit", fontSize: 13, fontWeight: 600, transition: "all 0.12s",
                background: speakerOn ? tk.YELLOW_BG : tk.BG_INPUT,
                color: speakerOn ? "#92400E" : tk.MUTED,
                border: `1px solid ${speakerOn ? tk.YELLOW_BORDER : tk.BORDER}`,
              }}
            >
              {speakerOn ? <Volume2 size={15} /> : <VolumeX size={15} />}
              {speakerOn ? "Speaker On" : "Muted"}
            </button>

            {/* Stop */}
            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={onStop}
              style={{
                flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                background: tk.RED, color: "#fff", border: "none",
                borderRadius: 12, padding: "12px 0",
                fontSize: 13.5, fontWeight: 600, cursor: "pointer",
                fontFamily: "inherit",
                boxShadow: "0 4px 14px rgba(208,40,26,0.26)",
              }}
            >
              <PhoneOff size={15} />
              Stop
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── Modal info row ── */
function ModalInfoRow({ tk, label, value, mono = false }: any) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "10px 0", borderBottom: `1px solid ${tk.BORDER}`,
    }}>
      <span style={{ fontSize: 12, color: tk.MUTED, width: 80, flexShrink: 0 }}>{label}</span>
      <span style={{
        fontSize: 13, fontWeight: 600, color: tk.TEXT,
        fontFamily: mono ? "monospace" : "inherit",
      }}>
        {value || "—"}
      </span>
    </div>
  );
}