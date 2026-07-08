// pages/CallLogsPage.tsx
// @ts-nocheck
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed,
  Clock, Mail, MessageCircle, Filter,
  ChevronDown, ChevronLeft, ChevronRight, Plus, Search, X, Mic,
  Calendar, Copy,
} from "lucide-react";
import { DateInput } from "../components/ui/AppDatePicker";
import { useAuth } from "../context/AuthContext";
import api from "../api";
import { format } from "date-fns";
import { useCall } from "../context/CallContext";
import { useFloatingChat } from "../context/FloatingChatContext";
import { io } from "socket.io-client";
import { API_URL } from "../main";
import { motion, AnimatePresence } from "framer-motion";
import { Toaster } from "react-hot-toast";
import TranscriptionSidebar from "../components/TranscriptionSidebar";
import { useSendEmailModal } from "../components/useSendEmailModal";
import { useNavigate } from "react-router-dom";
import CallLeadSaleModal from "../components/LeadSaleModal";
import { useTheme } from "../context/ThemeContext";
import { formatTime, formatDate, formatFullDate, formatDuration } from "../hooks/dateFormat";
import InlineAudioPlayer from "../components/teams/InlineAudioPlayer";

/* ─── types ──────────────────────────────────────────── */
type CallType   = "all" | "incoming" | "outgoing" | "missed" | "voicemail";
type DateFilter = "all" | "today" | "week" | "month" | "custom";

/* ─── Call type meta ─────────────────────────────────── */
function getCallMeta(log: any, isDark = false) {
  const isMissed    = log.type === "missed" || log.status === "no-answer" || log.status === "busy";
  const isVoicemail = log.isVoicemail || log.type === "voicemail";
  const isInbound   = log.direction === "inbound";

  if (isVoicemail)
    return { icon: Mic,           color: "#8B5CF6", bg: isDark ? "rgba(139,92,246,0.15)" : "rgba(139,92,246,0.10)", label: "Voicemail", textColor: "#8B5CF6" };
  if (isMissed)
    return { icon: PhoneMissed,   color: isDark ? "#F87171" : "#EF4444", bg: isDark ? "rgba(248,113,113,0.15)" : "rgba(239,68,68,0.10)",  label: "Missed",     textColor: isDark ? "#F87171" : "#EF4444" };
  if (isInbound)
    return { icon: PhoneIncoming, color: "#10B981", bg: isDark ? "rgba(16,185,129,0.15)" : "rgba(16,185,129,0.10)", label: "Incoming",   textColor: "#10B981" };
  return   { icon: PhoneOutgoing, color: isDark ? "#7C7CF0" : "#5B5BD6", bg: isDark ? "rgba(124,124,240,0.15)" : "rgba(91,91,214,0.10)",  label: "Outgoing",   textColor: isDark ? "#7C7CF0" : "#5B5BD6" };
}

/* ─── Action icon button ─────────────────────────────── */
function ActBtn({ icon: Icon, color, bg, onClick, title }: any) {
  return (
    <motion.button
      whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.92 }}
      onClick={e => { e.stopPropagation(); onClick?.(); }}
      title={title}
      style={{
        width: 32, height: 32, borderRadius: 9, border: "none",
        background: bg, color, display: "flex", alignItems: "center",
        justifyContent: "center", cursor: "pointer", flexShrink: 0,
      }}
    >
      <Icon size={14} />
    </motion.button>
  );
}
function CopyablePhoneNumber({ phone, isDark, textSecondary, textPrimary, accentMain }: any) {
  const [copied, setCopied] = useState(false);

  const copyWithFallback = (text: string) => {
    const textarea = document.createElement("textarea");
    textarea.value = text;

    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    textarea.style.top = "-9999px";
    textarea.style.opacity = "0";
    textarea.setAttribute("readonly", "");

    document.body.appendChild(textarea);

    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);

    const successful = document.execCommand("copy");

    document.body.removeChild(textarea);

    if (!successful) {
      throw new Error("Fallback copy failed");
    }
  };

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!phone) return;

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(phone);
      } else {
        copyWithFallback(phone);
      }

      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 1200);
    } catch (error) {
      try {
        copyWithFallback(phone);

        setCopied(true);

        window.setTimeout(() => {
          setCopied(false);
        }, 1200);
      } catch (fallbackError) {
        console.error("Failed to copy phone number:", error);
        console.error("Fallback copy failed:", fallbackError);
      }
    }
  };

  if (!phone) return null;

  return (
    <span
      onClick={handleCopy}
      title={copied ? "Copied" : "Click to copy"}
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        fontSize: 12,
        color: copied ? accentMain : textSecondary,
        fontFamily: "monospace, monospace",
        cursor: "pointer",
        userSelect: "none",
        padding: "2px 5px",
        borderRadius: 6,
        background: copied
          ? isDark
            ? "rgba(124,124,240,0.14)"
            : "rgba(91,91,214,0.10)"
          : "transparent",
        transition: "all 0.15s ease",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = copied
          ? isDark
            ? "rgba(124,124,240,0.14)"
            : "rgba(91,91,214,0.10)"
          : isDark
            ? "rgba(255,255,255,0.06)"
            : "rgba(0,0,0,0.05)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = copied
          ? isDark
            ? "rgba(124,124,240,0.14)"
            : "rgba(91,91,214,0.10)"
          : "transparent";
      }}
    >
      {phone}
      <Copy size={11} color={copied ? accentMain : textSecondary} />

      <span
        style={{
          position: "absolute",
          left: "50%",
          bottom: "calc(100% + 7px)",
          transform: "translateX(-50%)",
          background: isDark ? "#2A2A38" : "#111827",
          color: "#fff",
          fontSize: 10.5,
          fontFamily: "'Inter',-apple-system,sans-serif",
          fontWeight: 700,
          padding: "5px 8px",
          borderRadius: 7,
          whiteSpace: "nowrap",
          opacity: copied ? 1 : 0,
          pointerEvents: "none",
          transition: "opacity 0.15s ease",
          boxShadow: "0 6px 16px rgba(0,0,0,0.18)",
          zIndex: 20,
        }}
        className="copy-phone-tooltip"
      >
        {copied ? "Copied" : "Click to copy"}
      </span>

      <style>{`
        span:hover > .copy-phone-tooltip {
          opacity: 1 !important;
        }
      `}</style>
    </span>
  );
}

/* ─── DatePickerDropdown ─────────────────────────────── */
function DatePickerDropdown({ dateFilter, setDateFilter, customStart, setCustomStart, customEnd, setCustomEnd, isDark }: any) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const textPrimary   = isDark ? "#F0F0F5" : "#0D0D12";
  const textSecondary = isDark ? "#68687A"  : "#9E9EAD";
  const accentMain    = isDark ? "#7C7CF0"  : "#5B5BD6";
  const dropBg        = isDark ? "#1E1E28"  : "#fff";
  const dropBorder    = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
  const btnBg         = isDark ? "#1E1E28"  : "#fff";
  const btnBorder     = isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.10)";
  const inputBg       = isDark ? "#0F0F14"  : "#F6F7F9";
  const inputBorder   = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.10)";

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const presets: { key: DateFilter; label: string }[] = [
    { key: "all",   label: "All Time"   },
    { key: "today", label: "Today"      },
    { key: "week",  label: "This Week"  },
    { key: "month", label: "This Month" },
  ];

  const activeLabel =
    dateFilter === "custom" && customStart && customEnd
      ? `${format(new Date(customStart), "MMM d")} – ${format(new Date(customEnd), "MMM d")}`
      : presets.find(p => p.key === dateFilter)?.label ?? "Custom";

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <motion.button
        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
        onClick={() => setOpen(o => !o)}
        style={{
          display: "flex", alignItems: "center", gap: 7,
          padding: "8px 14px", background: btnBg,
          border: `1px solid ${btnBorder}`, borderRadius: 10,
          cursor: "pointer", fontSize: 13, color: textPrimary, fontWeight: 600,
          fontFamily: "inherit",
        }}
      >
        <Filter size={13} color={textSecondary} />
        {activeLabel}
        <ChevronDown size={12} color={textSecondary}
          style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.14 }}
            style={{
              position: "absolute", top: "calc(100% + 8px)", right: 0, width: 230,
              background: dropBg, borderRadius: 14,
              border: `1px solid ${dropBorder}`,
              boxShadow: isDark ? "0 12px 36px rgba(0,0,0,0.50)" : "0 12px 36px rgba(0,0,0,0.12)",
              zIndex: 999, overflow: "hidden",
            }}
          >
            <div style={{ padding: "8px 6px" }}>
              {presets.map(({ key, label }) => (
                <button key={key}
                  onClick={() => { setDateFilter(key); setCustomStart(""); setCustomEnd(""); setOpen(false); }}
                  style={{
                    display: "block", width: "100%", textAlign: "left",
                    padding: "9px 12px", borderRadius: 8, border: "none",
                    cursor: "pointer", fontSize: 13.5, fontFamily: "inherit",
                    fontWeight: dateFilter === key ? 700 : 500,
                    background: dateFilter === key ? (isDark ? "rgba(124,124,240,0.12)" : "rgba(91,91,214,0.09)") : "transparent",
                    color: dateFilter === key ? accentMain : textPrimary,
                  }}>
                  {label}
                </button>
              ))}
              <button
                onClick={() => setDateFilter("custom")}
                style={{
                  display: "block", width: "100%", textAlign: "left",
                  padding: "9px 12px", borderRadius: 8, border: "none",
                  cursor: "pointer", fontSize: 13.5, fontFamily: "inherit",
                  fontWeight: dateFilter === "custom" ? 700 : 500,
                  background: dateFilter === "custom" ? (isDark ? "rgba(124,124,240,0.12)" : "rgba(91,91,214,0.09)") : "transparent",
                  color: dateFilter === "custom" ? accentMain : textPrimary,
                }}>
                Custom Range
              </button>
            </div>

            <AnimatePresence>
              {dateFilter === "custom" && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  style={{ overflow: "hidden", borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.07)"}` }}
                >
                  <div style={{ padding: "12px 14px 10px" }}>
                    {[
                      { label: "Start Date", val: customStart, set: setCustomStart },
                      { label: "End Date",   val: customEnd,   set: setCustomEnd   },
                    ].map(({ label, val, set }) => (
                      <div key={label} style={{ marginBottom: 10 }}>
                        <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: textSecondary, marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</label>
                        <DateInput value={val} onChange={(v) => set(v)}
                          style={{ width: "100%", boxSizing: "border-box", padding: "8px 10px", borderRadius: 8, border: `1px solid ${inputBorder}`, background: inputBg, fontSize: 13, color: textPrimary, outline: "none", fontFamily: "inherit" }} />
                      </div>
                    ))}
                    <motion.button
                      whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                      onClick={() => { if (customStart && customEnd) setOpen(false); }}
                      disabled={!customStart || !customEnd}
                      style={{
                        width: "100%", padding: "9px", borderRadius: 9, border: "none",
                        background: (!customStart || !customEnd) ? (isDark ? "#2A2A38" : "#BBBBC8") : accentMain,
                        color: "#fff", fontWeight: 700, fontSize: 13, fontFamily: "inherit",
                        cursor: (!customStart || !customEnd) ? "not-allowed" : "pointer", marginTop: 2,
                      }}>
                      Apply Range
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────── */
export default function CallLogsPage() {
  const { openChat }                            = useFloatingChat();
  const { openSendEmailModal, SendEmailModal }  = useSendEmailModal();
  const socketRef                               = useRef<any>(null);
  const { user, token }                         = useAuth();
  const { theme }                               = useTheme();
  const isDark                                  = theme === "dark";
  const canComposeEmail = user?.role === "ADMIN" || user?.additionalRole?.composeEmail === true;
  const canMessage = user?.role === "ADMIN" || user?.additionalRole?.viewMessages === true;
  const { startCall, resetMissed, missedCount } = useCall();
  const navigate                                = useNavigate();

  // ── Design tokens ──
  const pageBg        = isDark ? "#0F0F14"                : "#F6F7F9";
  const headerBg      = isDark ? "rgba(23,23,31,0.95)"   : "#fff";
  const headerBorder  = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)";
  const cardBg        = isDark ? "#17171F"                : "#fff";
  const cardBorder    = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)";
  const expandedBg    = isDark ? "#1E1E28"                : "#FAFAFA";
  const expandedBorder= isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
  const inputBg       = isDark ? "#1E1E28"                : "#F6F7F9";
  const inputBorder   = isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.10)";
  const textPrimary   = isDark ? "#F0F0F5"                : "#0D0D12";
  const textSecondary = isDark ? "#68687A"                : "#9E9EAD";
  const textMuted     = isDark ? "#A0A0B0"                : "#9E9EAD";
  const accentMain    = isDark ? "#7C7CF0"                : "#5B5BD6";
  const dividerColor  = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.15)";

  const [logs, setLogs]                         = useState<any[]>([]);
  const [filteredLogs, setFilteredLogs]         = useState<any[]>([]);
  const [activeTab, setActiveTab]               = useState<CallType>("all");
  const [dateFilter, setDateFilter]             = useState<DateFilter>("week");
  const [customStart, setCustomStart]           = useState("");
  const [customEnd, setCustomEnd]               = useState("");
  const [loading, setLoading]                   = useState(true);
  const [page, setPage]                         = useState(1);
  const [limit, setLimit]                       = useState(10);
  const [totalPages, setTotalPages]             = useState(1);
  const [selectedLog, setSelectedLog]           = useState<any>(null);
  const [transcript, setTranscript]             = useState<any>(null);
  const [transLoading, setTransLoading]         = useState(false);
  const [showSidebar, setShowSidebar]           = useState(false);
  const [isLeadModalOpen, setIsLeadModalOpen]   = useState(false);
  const [contactName, setContactName]           = useState("");
  const [contactPhone, setContactPhone]         = useState("");
  const [contactInfo, setContactInfo]           = useState<any>(null);
  const [searchQuery, setSearchQuery]           = useState("");
  const [expandedLog, setExpandedLog]           = useState<string | null>(null);

  /* ── Socket ── */
  useEffect(() => { resetMissed(); }, [missedCount]);

  useEffect(() => {
    if (!user?.id || !token) return;
    if (!socketRef.current) {
      socketRef.current = io(API_URL, { path: "/socket.io", transports: ["websocket"], auth: { token } });
      socketRef.current.emit("joinUserRoom", user.id);
    }
    const onNew = (newLog: any) => {
      if (newLog.agent_id !== user.id) return;
      setLogs(prev => {
        if (prev.some(l => l.sessionId === newLog.sessionId || l.callSid === newLog.callSid)) return prev;
        return [newLog, ...prev];
      });
    };
    socketRef.current.on("onCallLogsUpdates", onNew);
    return () => { socketRef.current?.off("onCallLogsUpdates", onNew); };
  }, [user?.id, token]);

  /* ── Fetch ── */
  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("page", String(page));
      params.append("limit", String(limit));
      params.append("tab", activeTab);
      if (dateFilter !== "all") params.append("filter", dateFilter);
      if (dateFilter === "custom" && customStart && customEnd) {
        params.append("startDate", customStart);
        params.append("endDate", customEnd);
      }
      const res = await api.get(`/voice/logs?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      setLogs(res.data.data || []);
      setTotalPages(res.data.pagination?.totalPages || 1);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { setPage(1); }, [activeTab, dateFilter, customStart, customEnd]);
  useEffect(() => { if (token) fetchLogs(); }, [token, page, limit, activeTab, dateFilter, customStart, customEnd]);

  /* ── Client filter + search ── */
  useEffect(() => {
    let f = logs;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      f = f.filter(l =>
        (l.contactName || "").toLowerCase().includes(q) ||
        (l.number || l.from || l.to || "").includes(q)
      );
    }
    setFilteredLogs(f);
  }, [logs, searchQuery]);

  /* ── Lead actions ── */
  const fetchContactInfo = useCallback(async (number: string) => {
    if (!number) return;
    try {
      const { data } = await api.get(`/contacts/lookup?number=${number}`, { headers: { Authorization: `Bearer ${token}` } });
      setContactInfo({ name: data.callerName, address: data.address || "" });
    } catch { setContactInfo(null); }
  }, [token]);

  const toggleLeadModal = async (name: string, phone: string) => {
    setContactName(name); setContactPhone(phone);
    try {
      const res = await api.post("/voice/leads/phone", { phone });
      if (res.data.leads?.[0]?.id) { navigate("/lead/single/" + res.data.leads[0].id); return; }
      setIsLeadModalOpen(true);
    } catch (e) { console.error(e); }
  };

  /* ── Tab config ── */
  const TABS: { key: CallType; label: string; icon: any; accent: string }[] = [
    { key: "all",       label: "All",       icon: Phone,         accent: accentMain },
    { key: "incoming",  label: "Incoming",  icon: PhoneIncoming, accent: "#10B981"  },
    { key: "outgoing",  label: "Outgoing",  icon: PhoneOutgoing, accent: accentMain },
    { key: "missed",    label: "Missed",    icon: PhoneMissed,   accent: isDark ? "#F87171" : "#EF4444" },
    { key: "voicemail", label: "Voicemail", icon: Mic,           accent: "#8B5CF6"  },
  ];

  const counts = {
    all:       logs.length,
    incoming:  logs.filter(l => l.direction === "inbound" && l.type === "connected").length,
    outgoing:  logs.filter(l => l.direction === "outbound").length,
    missed:    logs.filter(l => l.type === "missed").length,
    voicemail: logs.filter(l => l.isVoicemail || l.type === "voicemail").length,
  };

  /* ─────────────────────────────────────────────────────────────────────────── */
  return (
    <>
      {/* <Toaster position="top-right" /> */}

      <div style={{ minHeight: "100vh", background: pageBg, fontFamily: "'Inter',-apple-system,sans-serif" }}>

        {/* ── Page Header ── */}
        <motion.div
          initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
          style={{ background: headerBg, borderBottom: `1px solid ${headerBorder}`, padding: "16px 24px" }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
            {/* Title */}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 38, height: 38, borderRadius: 11,
                background: isDark ? "rgba(124,124,240,0.12)" : "rgba(91,91,214,0.10)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Phone size={18} color={accentMain} />
              </div>
              <div>
                <h1 style={{ fontSize: 18, fontWeight: 800, color: textPrimary, margin: 0, letterSpacing: "-0.02em" }}>Call History</h1>
                <p style={{ color: textSecondary, fontSize: 12, margin: 0, fontWeight: 500 }}>
                  {activeTab === "all" ? "All Types" : TABS.find(t => t.key === activeTab)?.label}
                </p>
              </div>
            </div>

            {/* Controls */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {/* Search */}
              <div style={{ position: "relative" }}>
                <Search size={14} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: textSecondary, pointerEvents: "none" }} />
                <input
                  type="text" placeholder="Search calls…"
                  value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  style={{
                    paddingLeft: 32, paddingRight: searchQuery ? 30 : 12,
                    paddingTop: 8, paddingBottom: 8,
                    border: `1px solid ${inputBorder}`, borderRadius: 10,
                    fontSize: 13, color: textPrimary, background: inputBg,
                    outline: "none", width: 210, fontFamily: "inherit", transition: "border 0.15s",
                  }}
                  onFocus={e => (e.target.style.borderColor = isDark ? "rgba(124,124,240,0.45)" : "rgba(91,91,214,0.40)")}
                  onBlur={e  => (e.target.style.borderColor = inputBorder)}
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")}
                    style={{ position: "absolute", right: 9, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", display: "flex", padding: 2 }}>
                    <X size={13} color={textSecondary} />
                  </button>
                )}
              </div>
              <DatePickerDropdown
                dateFilter={dateFilter} setDateFilter={setDateFilter}
                customStart={customStart} setCustomStart={setCustomStart}
                customEnd={customEnd} setCustomEnd={setCustomEnd}
                isDark={isDark}
              />
            </div>
          </div>
        </motion.div>

        {/* ── Tabs ── */}
        <div style={{ background: headerBg, borderBottom: `1px solid ${headerBorder}`, padding: "0 24px" }}>
          <div style={{ display: "flex", gap: 2, overflowX: "auto" }}>
            {TABS.map(({ key, label, icon: Icon, accent }) => {
              const isActive  = activeTab === key;
              const count     = counts[key as keyof typeof counts];
              const isMissed  = key === "missed";
              const badgeCount = isMissed && missedCount > 0 ? missedCount : count;

              return (
                <button
                  key={key}
                  onClick={() => { setActiveTab(key as CallType); if (isMissed) resetMissed(); }}
                  style={{
                    display: "flex", alignItems: "center", gap: 7,
                    padding: "13px 16px", border: "none", background: "none",
                    cursor: "pointer", fontSize: 13.5, fontWeight: isActive ? 700 : 500,
                    color: isActive ? accent : textSecondary,
                    borderBottom: isActive ? `2.5px solid ${accent}` : "2.5px solid transparent",
                    transition: "all 0.15s", marginBottom: -1, whiteSpace: "nowrap",
                    fontFamily: "inherit",
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = textPrimary; }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = textSecondary; }}
                >
                  <div style={{
                    width: 22, height: 22, borderRadius: 6,
                    background: isActive ? `${accent}20` : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "background 0.15s",
                  }}>
                    <Icon size={13} color={isActive ? accent : "currentColor"} />
                  </div>
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Content ── */}
        <div style={{ padding: "20px 24px" }}>
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 0", gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", border: `3px solid ${isDark ? "rgba(124,124,240,0.15)" : "rgba(91,91,214,0.15)"}`, borderTopColor: accentMain, animation: "spin 0.7s linear infinite" }} />
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
              <span style={{ color: textSecondary, fontSize: 13 }}>Loading calls…</span>
            </div>
          ) : filteredLogs.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              style={{ textAlign: "center", padding: "80px 0" }}
            >
              <div style={{
                width: 56, height: 56, borderRadius: 16,
                background: isDark ? "rgba(124,124,240,0.10)" : "rgba(91,91,214,0.08)",
                display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px",
              }}>
                <Phone size={24} color={accentMain} />
              </div>
              <p style={{ color: textPrimary, fontWeight: 700, fontSize: 15, margin: "0 0 6px" }}>No calls found</p>
              <p style={{ color: textSecondary, fontSize: 13, margin: 0 }}>Try adjusting your filters or date range</p>
            </motion.div>
          ) : (
            <>
              <motion.div
                initial="hidden" animate="visible"
                variants={{ hidden: { opacity: 1 }, visible: { opacity: 1, transition: { staggerChildren: 0.05 } } }}
                style={{ display: "flex", flexDirection: "column", gap: 8 }}
              >
                <AnimatePresence mode="popLayout">
                  {filteredLogs.map((log, index) => {
                    const name      = log.contactName || "Unknown Caller";
                    const phone     = log.number || log.from || log.to;
                    const meta      = getCallMeta(log, isDark);
                    const logKey    = log.sessionId || log.callSid || String(index);
                    const isExpanded = expandedLog === logKey;
                    const isMissed  = meta.label === "Missed";
                    const CallIcon  = meta.icon;

                    return (
                      <motion.div
                        key={logKey}
                        initial={{ opacity: 0, y: 10, scale: 0.99 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, x: -16 }}
                        transition={{ type: "spring", stiffness: 180, damping: 22 }}
                        layout
                        style={{
                          background: cardBg, borderRadius: 14,
                          border: `1px solid ${isExpanded ? (isDark ? "rgba(124,124,240,0.22)" : "rgba(91,91,214,0.18)") : cardBorder}`,
                          overflow: "hidden", transition: "border-color 0.15s, box-shadow 0.15s",
                        }}
                        onMouseEnter={e => (e.currentTarget.style.boxShadow = isDark ? "0 3px 16px rgba(0,0,0,0.40)" : "0 3px 16px rgba(0,0,0,0.07)")}
                        onMouseLeave={e => (e.currentTarget.style.boxShadow = "none")}
                      >
                        {/* ── Main Row ── */}
                        <div
                          style={{ display: "flex", alignItems: "center", gap: 14, padding: "13px 16px", cursor: "pointer" }}
                          onClick={() => setExpandedLog(isExpanded ? null : logKey)}
                        >
                          {/* Call-type icon tile */}
                          <div style={{
                            width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                            background: meta.bg,
                            display: "flex", alignItems: "center", justifyContent: "center",
                          }}>
                            <CallIcon size={19} color={meta.color} />
                          </div>

                          {/* Info */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            {/* Name row */}
                            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                              <span style={{
                                fontSize: 14, fontWeight: 700, letterSpacing: "-0.01em",
                                color: isMissed ? (isDark ? "#F87171" : "#EF4444") : textPrimary,
                                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                              }}>
                                {name}
                              </span>
                              {log.isBlocked && (
                                <span style={{ fontSize: 10.5, background: isDark ? "#2A0F0F" : "#FEE2E2", color: isDark ? "#F87171" : "#DC2626", padding: "1px 7px", borderRadius: 20, fontWeight: 700, flexShrink: 0 }}>Blocked</span>
                              )}
                            </div>
                            {/* Meta row */}
                            <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 3, flexWrap: "wrap" }}>
                            {phone && (
                                <CopyablePhoneNumber
                                  phone={phone}
                                  isDark={isDark}
                                  textSecondary={textSecondary}
                                  textPrimary={textPrimary}
                                  accentMain={accentMain}
                                />
                              )}
                              {phone && <span style={{ color: dividerColor, fontSize: 11 }}>·</span>}
                              <span style={{ fontSize: 12, color: textSecondary }}>
                                {formatDate(log.startTime)}, {formatTime(log.startTime)}
                              </span>
                              {log.duration > 0 && (
                                <>
                                  <span style={{ color: dividerColor, fontSize: 11 }}>·</span>
                                  <span style={{ fontSize: 12, color: textSecondary, display: "flex", alignItems: "center", gap: 3 }}>
                                    <Clock size={10} />{formatDuration(log.duration)}
                                  </span>
                                </>
                              )}
                            </div>
                            {/* Voicemail transcription preview */}
                            {log.isVoicemail && log.transcription && (
                              <p style={{
                                fontSize: 12, color: "#8B5CF6", margin: "5px 0 0",
                                fontStyle: "italic", lineHeight: 1.4,
                                overflow: "hidden", display: "-webkit-box",
                                WebkitLineClamp: 1, WebkitBoxOrient: "vertical",
                              }}>
                                "{log.transcription.slice(0, 90)}{log.transcription.length > 90 ? "…" : ""}"
                              </p>
                            )}
                          
                          </div>

                          {/* Actions */}
                          <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                            <ActBtn icon={Phone}         color={accentMain}  bg={isDark ? "rgba(124,124,240,0.12)" : "rgba(91,91,214,0.10)"}   onClick={() => startCall(phone)}                      title="Call back"  />
                            {
                              canMessage &&
                            <ActBtn icon={MessageCircle} color="#10B981"     bg={isDark ? "rgba(16,185,129,0.12)"  : "rgba(16,185,129,0.10)"}   onClick={() => openChat(phone, log.contactName)}       title="Send SMS"   />
                            }
                            {canComposeEmail && (
                              <ActBtn icon={Mail}        color="#F59E0B"     bg={isDark ? "rgba(245,158,11,0.12)"  : "rgba(245,158,11,0.10)"}   onClick={() => openSendEmailModal(["customer"])}       title="Send Email" />
                            )}
                            <ActBtn icon={Plus}          color="#8B5CF6"     bg={isDark ? "rgba(139,92,246,0.12)"  : "rgba(139,92,246,0.10)"}   onClick={() => toggleLeadModal(log.contactName, phone)} title="Add Lead"   />
                            <div style={{ width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", color: textSecondary, transform: isExpanded ? "rotate(180deg)" : "none", transition: "transform 0.22s", marginLeft: 2 }}>
                              <ChevronDown size={14} />
                            </div>
                          </div>
                        </div>

                        {/* ── Expanded Panel ── */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }}
                              style={{ overflow: "hidden" }}
                            >
                              <div style={{ borderTop: `1px solid ${expandedBorder}`, background: expandedBg, padding: "14px 20px" }}>
                                {/* Detail grid */}
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: "10px 20px" }}>
                                  {[
                                    {
                                      label: "Phone",
                                      value: phone ? (
                                        <CopyablePhoneNumber
                                          phone={phone}
                                          isDark={isDark}
                                          textSecondary={textSecondary}
                                          textPrimary={textPrimary}
                                          accentMain={accentMain}
                                        />
                                      ) : "—"
                                    },
                                    { label: "Direction", value: log.direction === "inbound" ? "Incoming" : "Outgoing" },
                                    { label: "Type",      value: meta.label },
                                    { label: "Duration",  value: log.duration > 0 ? formatDuration(log.duration) : "—" },
                                    { label: "Date",      value: formatFullDate(log.startTime) },
                                    { label: "Time",      value: formatTime(log.startTime) },
                                  ].map(({ label, value }) => (
                                    <div key={label}>
                                      <div style={{ fontSize: 10.5, color: textSecondary, fontWeight: 700, marginBottom: 3, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
                                      <div style={{ fontSize: 13, color: textPrimary, fontWeight: 600 }}>{value}</div>
                                    </div>
                                  ))}
                                   
                                </div>

                                {/* Voicemail transcription full */}
                                {log.isVoicemail && log.transcription && (
                                  <div style={{ marginTop: 14 }}>
                                    <div style={{ fontSize: 10.5, color: "#8B5CF6", fontWeight: 700, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em", display: "flex", alignItems: "center", gap: 5 }}>
                                      <Mic size={11} /> Transcription
                                    </div>
                                    <p style={{
                                      margin: 0, fontSize: 13, color: isDark ? "#A0A0B0" : "#6B6B7B",
                                      fontStyle: "italic", lineHeight: 1.65,
                                      background: isDark ? "rgba(139,92,246,0.08)" : "rgba(139,92,246,0.05)",
                                      borderRadius: 9, padding: "10px 14px",
                                      border: "1px solid rgba(139,92,246,0.14)",
                                    }}>
                                      "{log.transcription}"
                                    </p>
                                  </div>
                                )}
                                <div style={{marginTop:10}}/>
                                 {log.isVoicemail && log?.recordingUrl && (
                              <InlineAudioPlayer
                              user={user}
                              src={`${API_URL}/voice/play-recording?recordingUrl=${encodeURIComponent(log?.recordingUrl)}`}
                            />
                            )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </motion.div>

              {/* ── Pagination ── */}
              {totalPages > 1 && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 20, flexWrap: "wrap", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 12.5, color: textSecondary, fontWeight: 600 }}>Rows per page:</span>
                    <select value={limit} onChange={e => { setLimit(Number(e.target.value)); setPage(1); }}
                      style={{ padding: "5px 10px", borderRadius: 8, border: `1px solid ${inputBorder}`, background: inputBg, fontSize: 13, color: textPrimary, cursor: "pointer", outline: "none" }}>
                      {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                      disabled={page === 1}
                      onClick={() => setPage(p => Math.max(p - 1, 1))}
                      style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${inputBorder}`, background: inputBg, display: "flex", alignItems: "center", justifyContent: "center", cursor: page === 1 ? "not-allowed" : "pointer", opacity: page === 1 ? 0.4 : 1, color: textPrimary }}>
                      <ChevronLeft size={15} />
                    </motion.button>
                    <span style={{ padding: "4px 14px", borderRadius: 8, background: accentMain, color: "#fff", fontSize: 13, fontWeight: 700 }}>{page}</span>
                    <span style={{ fontSize: 13, color: textSecondary }}>of {totalPages}</span>
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                      disabled={page === totalPages}
                      onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                      style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${inputBorder}`, background: inputBg, display: "flex", alignItems: "center", justifyContent: "center", cursor: page === totalPages ? "not-allowed" : "pointer", opacity: page === totalPages ? 0.4 : 1, color: textPrimary }}>
                      <ChevronRight size={15} />
                    </motion.button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Modals ── */}
      <CallLeadSaleModal
        isOpen={isLeadModalOpen}
        onClose={() => setIsLeadModalOpen(false)}
        customerName={contactName}
        customerNumber={contactPhone}
        contactInfo={contactInfo}
        fetchContactInfo={fetchContactInfo}
        isDark={isDark}
      />
      <TranscriptionSidebar
        isOpen={showSidebar}
        onClose={() => { setShowSidebar(false); setTranscript(null); setSelectedLog(null); }}
        transcript={transcript}
        recordingUrl={selectedLog ? `${API_URL}/voice/play-recording?recordingUrl=${encodeURIComponent(selectedLog.recordingUrl)}` : ""}
        loading={transLoading}
      />
      {SendEmailModal}
    </>
  );
}
