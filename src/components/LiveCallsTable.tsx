// src/components/LiveCallsTable.tsx  —  GHOST MONITOR (admin)
// @ts-nocheck

import { useEffect, useRef, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  PhoneIncoming, PhoneOutgoing, PhoneOff,
  Volume2, VolumeX, Ear, User, Radio, Mic,
} from "lucide-react";
import api from "../api";
import { toast } from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { Device } from "@twilio/voice-sdk";
import { API_URL } from "../main";
import { io } from "socket.io-client";

/* ── Local theme hook ── */
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
    const iv = setInterval(() => {
      try {
        const v = localStorage.getItem("theme") as "dark" | "light" | null;
        if (v === "dark" || v === "light") setTheme(v);
      } catch {}
    }, 500);
    return () => { window.removeEventListener("storage", handler); clearInterval(iv); };
  }, []);
  return theme;
}

/* ── Tokens ── */
function getTokens(isDark: boolean) {
  return {
    P: "#5B5BD6",
    P_FOCUS: "rgba(91,91,214,0.45)",
    P_SHADOW: "rgba(91,91,214,0.10)",
    P_BG: isDark ? "rgba(91,91,214,0.14)" : "rgba(91,91,214,0.04)",
    P_BORDER: isDark ? "rgba(91,91,214,0.25)" : "rgba(91,91,214,0.12)",
    TEXT: isDark ? "#F0F0F8" : "#0D0D12",
    TEXT2: isDark ? "#A0A0B8" : "#6B6B7B",
    MUTED: isDark ? "#68687A" : "#9E9EAD",
    BG: isDark ? "rgba(18,18,28,0.97)" : "rgba(255,255,255,0.96)",
    BG_BODY: isDark ? "rgba(20,20,32,0.60)" : "rgba(246,247,249,0.40)",
    BG_CARD: isDark ? "#1A1A28" : "#ffffff",
    BG_INPUT: isDark ? "#22223A" : "#F6F7F9",
    BG_TABLE_HEAD: isDark ? "#202033" : "#FAFAFA",
    BG_ROW_HOVER: isDark ? "#202033" : "#FAFBFF",
    BG_MODAL_OVERLAY: isDark ? "rgba(0,0,0,0.70)" : "rgba(0,0,0,0.45)",
    BG_MODAL_HEADER: isDark
      ? "linear-gradient(135deg,#4E4EBB,#6B6BE0)"
      : "linear-gradient(135deg,#5B5BD6,#7B7BE8)",
    BORDER: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)",
    BORDER_HDR: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)",
    BORDER_INPUT: isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.10)",
    SHADOW: isDark
      ? "0 24px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.06)"
      : "0 24px 80px rgba(0,0,0,0.16), 0 0 0 1px rgba(255,255,255,0.60)",
    LIVE_BG: isDark ? "rgba(23,163,99,0.16)" : "rgba(23,163,99,0.10)",
    LIVE_BORDER: isDark ? "rgba(23,163,99,0.28)" : "rgba(23,163,99,0.20)",
    LIVE_TEXT: "#17A363",
    RED: "#D0281A",
    RED_BG: isDark ? "rgba(208,40,26,0.14)" : "rgba(208,40,26,0.08)",
    RED_BORDER: isDark ? "rgba(208,40,26,0.28)" : "rgba(208,40,26,0.20)",
    YELLOW_BG: isDark ? "rgba(245,158,11,0.14)" : "rgba(245,158,11,0.10)",
    YELLOW_BORDER: isDark ? "rgba(245,158,11,0.34)" : "rgba(245,158,11,0.30)",
    // ★ barge-in color
    BARGE_BG: isDark ? "rgba(208,40,26,0.14)" : "rgba(208,40,26,0.07)",
    BARGE_BORDER: isDark ? "rgba(208,40,26,0.28)" : "rgba(208,40,26,0.18)",
    BARGE_COLOR: "#D0281A",
  };
}

const fmt = (s: number) =>
  `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

/* ════════════════════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════════════════════ */
export default function LiveCallsTable({ calls }: { calls: any[] }) {
  const { user } = useAuth();
  const theme  = useLocalTheme();
  const isDark = theme === "dark";
  const tk     = useMemo(() => getTokens(isDark), [isDark]);

  /* ── Device refs ── */
  const deviceRef    = useRef<Device | null>(null);
  const activeCallRef = useRef<any>(null);
  const deviceReadyRef = useRef(false);

  /* ── Monitor state ── */
  const [monitorCall, setMonitorCall] = useState<{
    conferenceName: string;
    agentName: string;
    customerNumber: string;
    supervisorCallSid: string;
    mode: "listen" | "coach";
  } | null>(null);

  const [monitorDuration, setMonitorDuration] = useState(0);
  const [speakerOn, setSpeakerOn]             = useState(true);
  const [actionLoading, setActionLoading]     = useState<string | null>(null); // conferenceName
  const [carrierMap, setCarrierMap]           = useState<Record<string, "twilio" | "commio">>({});

  /* ────────────────────────────────────────────────────────
     Device init — mount pe ek baar
     participants.create() se Twilio Device ko ring milti hai
     Device.on('incoming') usse auto-accept karta hai
  ──────────────────────────────────────────────────────── */
  useEffect(() => {
    if (user?.role !== "ADMIN") return;

    let dev: Device | null = null;

    const initDevice = async () => {
      try {
        // ★ Correct endpoint — same as LiveCallsPage
        const res = await api.get("/token/sip", { params: { purpose: "monitor" } });
        const { token } = res.data;

        dev = new Device(token, {
          logLevel:         1,
          codecPreferences: ["opus", "pcmu"] as any,
        });

        dev.on("incoming", (call: any) => {
          console.log("📞 Admin monitor incoming call — auto accepting");
          activeCallRef.current = call;

          call.on("disconnect", () => {
            console.log("Monitor call disconnected");
            activeCallRef.current = null;
            setMonitorCall(null);
            setMonitorDuration(0);
            setSpeakerOn(true);
          });

          call.on("error", (err: any) => console.error("Monitor call error:", err));

          // Auto accept — no user interaction needed
          call.accept();

          // Default: muted (listen mode)
          // handleAction will adjust mute state after 800ms
        });

        dev.on("registered",   () => { console.log("✅ Admin monitor Device registered"); deviceReadyRef.current = true; });
        dev.on("unregistered", () => { deviceReadyRef.current = false; });
        dev.on("error",        (err: any) => console.error("Monitor Device error:", err));

        await dev.register();
        deviceRef.current = dev;
      } catch (err) {
        console.error("Monitor device init failed:", err);
        toast.error("Monitor device failed to initialize");
      }
    };

    initDevice();

    return () => {
      try {
        activeCallRef.current?.disconnect();
        dev?.unregister();
        dev?.destroy();
      } catch {}
      deviceRef.current = null;
      activeCallRef.current = null;
    };
  }, [user?.role]);

  /* ── Socket: call ended pe cleanup ── */
  useEffect(() => {
    const socket = io(API_URL, { transports: ["websocket"], autoConnect: true, auth: { token: localStorage.getItem("token") } });

    // ✅ FIX #2: Handle new payload with type and reason fields
    socket.on("admin-call-ended", ({ conferenceName, type, reason }: any) => {
      if (monitorCall?.conferenceName === conferenceName) {
        cleanupMonitorState();
        toast(`Call ended (${type || 'unknown'})`);
      }
      setCarrierMap(prev => {
        const { [conferenceName]: _drop, ...rest } = prev;
        return rest;
      });
    });

    // ★ Reflects which carrier (Twilio direct or Commio via BYOC trunk)
    // ended up handling the PSTN leg, set after the failover dial resolves.
    socket.on("call-carrier", ({ conferenceName, carrier }) => {
      setCarrierMap(prev => ({ ...prev, [conferenceName]: carrier }));
    });

    return () => { socket.disconnect(); };
  }, [monitorCall?.conferenceName]);

  /* ── Monitor duration ticker ── */
  useEffect(() => {
    if (!monitorCall) return;
    const iv = setInterval(() => setMonitorDuration(d => d + 1), 1000);
    return () => clearInterval(iv);
  }, [monitorCall]);

  /* ── State cleanup (without Twilio calls) ── */
  const cleanupMonitorState = () => {
    setMonitorCall(null);
    setMonitorDuration(0);
    setSpeakerOn(true);
  };

  /* ────────────────────────────────────────────────────────
     handleAction — listen ya barge in
     mode: "listen" → muted = true  (sirf sunega)
     mode: "barge"  → muted = false (bol bhi sakta)
  ──────────────────────────────────────────────────────── */
  const handleAction = async (call: any, mode: "listen" | "coach") => {
    // Already monitoring this call — stop first
    if (monitorCall) await stopMonitor();

    setActionLoading(call.conferenceName);
    try {
      // ★ Naya endpoint — participants.create() karta hai backend pe
      const res = await api.post(
        `/voice/admin/calls/${encodeURIComponent(call.conferenceName)}/supervisor/join`,
        { mode }
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
      setSpeakerOn(mode === "coach"); // barge mein speaker "on" means unmuted

      // ★ Mute/unmute set karo — 800ms delay taaki call fully connect ho jaaye
      setTimeout(() => {
        if (activeCallRef.current) {
          activeCallRef.current.mute(mode === "listen"); // listen=true muted, barge=false unmuted
        }
      }, 800);

      toast.success(mode === "listen" ? "🎧 Listening to call…" : "🎤 Whispering to agent", { duration: 3000 });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || `Failed to ${mode} call`);
    } finally {
      setActionLoading(null);
    }
  };

  /* ────────────────────────────────────────────────────────
     stopMonitor — browser disconnect + backend remove
  ──────────────────────────────────────────────────────── */
  const stopMonitor = async () => {
    // 1. Browser side disconnect
    try {
      activeCallRef.current?.disconnect();
      activeCallRef.current = null;
    } catch {}

    // 2. Backend se Twilio participant remove karo
    if (monitorCall?.supervisorCallSid) {
      try {
        await api.post("/voice/admin/calls/supervisor/stop", {
          supervisorCallSid: monitorCall.supervisorCallSid,
        });
      } catch {}
    }

    cleanupMonitorState();
  };

  /* ── Toggle speaker (mute/unmute supervisor's outgoing) ── */
  const handleToggleSpeaker = () => {
    const next = !speakerOn;
    // speakerOn=true means admin ki awaaz ja rahi hai (unmuted)
    // speakerOn=false means muted
    activeCallRef.current?.mute(!next);
    setSpeakerOn(next);
  };

  /* ── Switch mode on-the-fly ── */
  const handleSwitchMode = async (newMode: "listen" | "coach") => {
    if (!monitorCall || monitorCall.mode === newMode) return;

    try {
      await api.patch("/voice/admin/calls/supervisor/mode", {
        conferenceName:    monitorCall.conferenceName,
        supervisorCallSid: monitorCall.supervisorCallSid,
        mode:              newMode,
      });

      // Browser side bhi adjust karo
      if (activeCallRef.current) {
        activeCallRef.current.mute(newMode === "listen");
      }

      setMonitorCall(prev => prev ? { ...prev, mode: newMode } : prev);
      setSpeakerOn(newMode === "coach");
      toast.success(newMode === "listen" ? "🎧 Switched to listen" : "🎤 Switched to whisper", { duration: 2000 });
    } catch {
      toast.error("Failed to switch mode");
    }
  };

  /* ── Empty state ── */
  if (!calls.length) {
    return (
      <div style={{
        background: tk.BG_CARD, border: `1px solid ${tk.BORDER}`,
        borderRadius: 18, padding: "34px 20px", textAlign: "center",
        marginTop: 16, boxShadow: tk.SHADOW,
      }}>
        <Radio size={28} color={tk.MUTED} style={{ marginBottom: 10 }} />
        <div style={{ fontSize: 14, color: tk.MUTED, fontWeight: 500 }}>No active calls right now</div>
      </div>
    );
  }

  return (
    <>
      <div style={{
        background: tk.BG_CARD, border: `1px solid ${tk.BORDER}`,
        borderRadius: 22, boxShadow: tk.SHADOW, marginTop: 16, overflow: "hidden",
      }}>
        {/* HEADER */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "18px 20px", borderBottom: `1px solid ${tk.BORDER_HDR}`,
          background: tk.BG,
        }}>
          <span style={{
            width: 9, height: 9, borderRadius: "50%", background: "#17A363",
            boxShadow: "0 0 0 3px rgba(23,163,99,0.22)", display: "inline-block",
            animation: "livePulse 1.6s ease-in-out infinite",
          }} />
          <span style={{ fontWeight: 700, fontSize: 15, color: tk.TEXT }}>Live Calls</span>
          <span style={{
            background: tk.LIVE_BG, color: tk.LIVE_TEXT,
            border: `1px solid ${tk.LIVE_BORDER}`,
            borderRadius: 9999, fontSize: 11, fontWeight: 700, padding: "2px 9px",
          }}>
            {calls.length}
          </span>
        </div>

        {/* TABLE */}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Agent", "Customer", "Direction", "Carrier", "Status", ""].map(h => (
                  <th key={h} style={{
                    textAlign: "left", padding: "12px 18px",
                    fontSize: 11, fontWeight: 700, color: tk.MUTED,
                    textTransform: "uppercase", letterSpacing: "0.05em",
                    borderBottom: `1px solid ${tk.BORDER}`, background: tk.BG_TABLE_HEAD,
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {calls.map((call, i) => (
                <CallRow
                  key={call.conferenceName}
                  call={call}
                  carrier={carrierMap[call.conferenceName] || call.carrier}
                  isLast={i === calls.length - 1}
                  isActive={monitorCall?.conferenceName === call.conferenceName}
                  activeMode={monitorCall?.conferenceName === call.conferenceName ? monitorCall?.mode : undefined}
                  loadingThis={actionLoading === call.conferenceName}
                  onListen={() => handleAction(call, "listen")}
                  onBarge={() => handleAction(call, "coach")}
                  tk={tk}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MONITOR MODAL */}
      <AnimatePresence>
        {monitorCall && (
          <MonitorModal
            tk={tk}
            agentName={monitorCall.agentName}
            customerNumber={monitorCall.customerNumber}
            conferenceName={monitorCall.conferenceName}
            duration={monitorDuration}
            mode={monitorCall.mode}
            speakerOn={speakerOn}
            onToggleSpeaker={handleToggleSpeaker}
            onSwitchMode={handleSwitchMode}
            onStop={stopMonitor}
          />
        )}
      </AnimatePresence>

      <style>{`
        @keyframes livePulse {
          0%, 100% { box-shadow: 0 0 0 3px rgba(23,163,99,0.22); }
          50%       { box-shadow: 0 0 0 6px rgba(23,163,99,0.08); }
        }
        @keyframes lc-spin { to { transform: rotate(360deg) } }
      `}</style>
    </>
  );
}

/* ════════════════════════════════════════════════════════════
   TABLE ROW — Listen + Barge In buttons
════════════════════════════════════════════════════════════ */
function CallRow({ call, carrier, isLast, isActive, activeMode, loadingThis, onListen, onBarge, tk }: any) {
  const [hovered, setHovered] = useState(false);
  const isInbound = call.direction === "inbound";

  const cell: React.CSSProperties = {
    padding: "14px 18px", fontSize: 13, color: tk.TEXT,
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
          <span style={{ fontWeight: 600, color: tk.TEXT }}>{call.agentName || "—"}</span>
        </div>
      </td>

      {/* CUSTOMER */}
      <td style={cell}>
        <span style={{ fontFamily: "monospace", fontSize: 12.5, color: tk.TEXT2 }}>
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
          {isInbound ? <><PhoneIncoming size={12} /> Inbound</> : <><PhoneOutgoing size={12} /> Outbound</>}
        </div>
      </td>

      {/* CARRIER */}
      <td style={cell}>
        {carrier ? (
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            background: carrier === "commio" ? "rgba(245,158,11,0.10)" : "rgba(91,91,214,0.08)",
            color: carrier === "commio" ? "#B45309" : "#5B5BD6",
            border: `1px solid ${carrier === "commio" ? "rgba(245,158,11,0.30)" : "rgba(91,91,214,0.18)"}`,
            borderRadius: 9999, padding: "3px 10px", fontSize: 11, fontWeight: 700,
          }}>
            {carrier === "commio" ? "Commio (BYOC)" : "Twilio"}
          </span>
        ) : (
          <span style={{ fontSize: 12, color: tk.MUTED }}>—</span>
        )}
      </td>

      {/* STATUS */}
      <td style={cell}>
        {isActive ? (
          <span style={{
            background: activeMode === "coach" ? tk.BARGE_BG : tk.P_BG,
            color: activeMode === "coach" ? tk.BARGE_COLOR : tk.P,
            border: `1px solid ${activeMode === "coach" ? tk.BARGE_BORDER : tk.P_BORDER}`,
            borderRadius: 9999, padding: "3px 10px",
            fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase",
          }}>
            {activeMode === "coach" ? "🎤 Whispering" : "🎧 Listening"}
          </span>
        ) : (
          <span style={{
            background: tk.LIVE_BG, color: tk.LIVE_TEXT,
            border: `1px solid ${tk.LIVE_BORDER}`,
            borderRadius: 9999, padding: "3px 10px",
            fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase",
          }}>
            Live
          </span>
        )}
      </td>

      {/* ACTIONS — Listen + Barge */}
      <td style={{ ...cell, textAlign: "right" }}>
        <div style={{ display: "inline-flex", gap: 8 }}>
          {/* Listen */}
          <button
            onClick={onListen}
            disabled={!!loadingThis}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              background: isActive && activeMode === "listen" ? tk.P : tk.P_BG,
              color: isActive && activeMode === "listen" ? "#fff" : tk.P,
              border: `1px solid ${tk.P_BORDER}`,
              borderRadius: 9, padding: "6px 14px",
              fontSize: 12.5, fontWeight: 600, cursor: loadingThis ? "not-allowed" : "pointer",
              fontFamily: "inherit", transition: "all 0.12s",
              opacity: loadingThis ? 0.6 : 1,
            }}
          >
            {loadingThis
              ? <span style={{ width: 12, height: 12, borderRadius: "50%", border: `2px solid ${tk.P}`, borderTopColor: "transparent", animation: "lc-spin 0.7s linear infinite" }} />
              : <Ear size={13} />
            }
            Listen
          </button>

          {/* Barge In */}
          <button
            onClick={onBarge}
            disabled={!!loadingThis}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              background: isActive && activeMode === "coach" ? tk.BARGE_COLOR : tk.BARGE_BG,
              color: isActive && activeMode === "coach" ? "#fff" : tk.BARGE_COLOR,
              border: `1px solid ${tk.BARGE_BORDER}`,
              borderRadius: 9, padding: "6px 14px",
              fontSize: 12.5, fontWeight: 600, cursor: loadingThis ? "not-allowed" : "pointer",
              fontFamily: "inherit", transition: "all 0.12s",
              opacity: loadingThis ? 0.6 : 1,
            }}
          >
            <Mic size={13} />
            Whisper
          </button>
        </div>
      </td>
    </tr>
  );
}

/* ════════════════════════════════════════════════════════════
   MONITOR MODAL
════════════════════════════════════════════════════════════ */
function MonitorModal({
  tk, agentName, customerNumber, conferenceName,
  duration, mode, speakerOn,
  onToggleSpeaker, onSwitchMode, onStop,
}: any) {
  const isBarge = mode === "coach";

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{
        position: "fixed", inset: 0, background: tk.BG_MODAL_OVERLAY,
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
          background: tk.BG, borderRadius: 22,
          width: "100%", maxWidth: 440,
          boxShadow: tk.SHADOW, overflow: "hidden",
          border: `1px solid ${tk.BORDER}`,
        }}
      >
        {/* HEADER */}
        <div style={{
          background: isBarge
            ? "linear-gradient(135deg,#B91C1C,#D0281A)"
            : tk.BG_MODAL_HEADER,
          padding: "22px 22px 20px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: "50%",
              background: "rgba(255,255,255,0.18)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {isBarge ? <Mic size={20} color="#fff" /> : <Ear size={20} color="#fff" />}
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>
                {isBarge ? "Barged Into Call" : "Monitoring Live Call"}
              </div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.70)", marginTop: 1 }}>
                {isBarge ? "Agent & customer can hear you" : "Silent · No one can hear you"}
              </div>
            </div>
          </div>

          {/* Duration */}
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
          <InfoRow tk={tk} icon={<User size={14} color={tk.MUTED} />}  label="Agent"      value={agentName} />
          <InfoRow tk={tk} icon={<div style={{ width:14, height:14, borderRadius:"50%", background:"#17A363", boxShadow:"0 0 0 3px rgba(23,163,99,0.22)" }} />} label="Customer" value={customerNumber} mono />
          <InfoRow tk={tk} icon={<Ear size={14} color={tk.MUTED} />}   label="Conference" value={conferenceName} mono />

          {/* Mode switch buttons */}
          <div style={{ display: "flex", gap: 8, marginTop: 18, marginBottom: 4 }}>
            <button
              onClick={() => onSwitchMode("listen")}
              style={{
                flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                padding: "10px 0", borderRadius: 10, border: `1px solid ${tk.P_BORDER}`,
                background: !isBarge ? tk.P : tk.P_BG,
                color: !isBarge ? "#fff" : tk.P,
                fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                transition: "all 0.12s",
              }}
            >
              <Ear size={14} /> Listen Only
            </button>
            <button
              onClick={() => onSwitchMode("coach")}
              style={{
                flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                padding: "10px 0", borderRadius: 10, border: `1px solid ${tk.BARGE_BORDER}`,
                background: isBarge ? tk.BARGE_COLOR : tk.BARGE_BG,
                color: isBarge ? "#fff" : tk.BARGE_COLOR,
                fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                transition: "all 0.12s",
              }}
            >
              <Mic size={14} /> Whisper
            </button>
          </div>

          {/* Speaker toggle + Stop */}
          <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
            <SpeakerBtn tk={tk} speakerOn={speakerOn} onClick={onToggleSpeaker} />
            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={onStop}
              style={{
                flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                background: tk.RED, color: "#fff", border: "none",
                borderRadius: 12, padding: "12px 20px",
                fontSize: 13.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
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

/* ── Info Row ── */
function InfoRow({ tk, icon, label, value, mono = false }: any) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "10px 0", borderBottom: `1px solid ${tk.BORDER}`,
    }}>
      <div style={{ width: 20, display: "flex", justifyContent: "center" }}>{icon}</div>
      <span style={{ fontSize: 12, color: tk.MUTED, width: 80, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: tk.TEXT, fontFamily: mono ? "monospace" : "inherit" }}>
        {value || "—"}
      </span>
    </div>
  );
}

/* ── Speaker Button ── */
function SpeakerBtn({ tk, speakerOn, onClick }: { tk: any; speakerOn: boolean; onClick: () => void }) {
  const [hov, setHov] = useState(false);
  return (
    <motion.button
      whileTap={{ scale: 0.94 }}
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        background: speakerOn ? (hov ? "rgba(245,158,11,0.15)" : tk.YELLOW_BG) : (hov ? "rgba(0,0,0,0.08)" : tk.BG_INPUT),
        color: speakerOn ? "#92400E" : tk.TEXT2,
        border: `1px solid ${speakerOn ? tk.YELLOW_BORDER : tk.BORDER}`,
        borderRadius: 12, padding: "12px 16px",
        fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "all 0.12s",
      }}
    >
      {speakerOn ? <Volume2 size={15} /> : <VolumeX size={15} />}
      {speakerOn ? "Speaker On" : "Muted"}
    </motion.button>
  );
}