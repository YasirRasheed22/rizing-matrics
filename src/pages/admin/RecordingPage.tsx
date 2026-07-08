// src/pages/admin/RecordingPage.tsx
//@ts-nocheck
import React, { useState, useEffect, useCallback } from "react";
import api from "../../api";
import Select from "react-select";
import { motion, AnimatePresence } from "framer-motion";
import { DateTimeInput } from "../../components/ui/AppDatePicker";
import { Mic, PhoneIncoming, PhoneOutgoing, X, CheckCircle } from "lucide-react";
import InlineAudioPlayer from "../../components/teams/InlineAudioPlayer";
import { API_URL } from "../../main";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import CallLogsTable from "../../components/admin/CallLogsTable";

export default function RecordingPage() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // ── Design tokens ──
  const textPrimary   = isDark ? "#F0F0F5" : "#0D0D12";
  const textSecondary = isDark ? "#A0A0B0" : "#6B6B7B";
  const textMuted     = isDark ? "#68687A"  : "#9E9EAD";
  const accentMain    = isDark ? "#7C7CF0"  : "#5B5BD6";
  const accentBg      = isDark ? "rgba(124,124,240,0.12)" : "rgba(91,91,214,0.12)";
  const cardBg        = isDark ? "rgba(23,23,31,0.92)"    : "rgba(255,255,255,0.92)";
  const cardBorder    = isDark ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.60)";
  const cardShadow    = isDark
    ? "0 4px 24px rgba(0,0,0,0.40), 0 0 0 1px rgba(255,255,255,0.04)"
    : "0 4px 24px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.04)";
  const inputBg       = isDark ? "rgba(30,30,42,0.90)"    : "#F6F7F9";
  const inputBorder   = isDark ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.10)";
  const labelColor    = isDark ? "#68687A"                : "#6B6B7B";
  const modalOverlay  = isDark ? "rgba(0,0,0,0.70)"       : "rgba(0,0,0,0.45)";
  const closeBtnBg    = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)";
  const closeBtnColor = isDark ? "#A0A0B0"                : "#6B6B7B";
  const footerBtnBg   = isDark ? "rgba(255,255,255,0.06)" : "#F6F7F9";
  const footerBtnBorder = isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.10)";

  const card: React.CSSProperties = {
    background: cardBg,
    backdropFilter: "blur(24px) saturate(180%)",
    WebkitBackdropFilter: "blur(24px) saturate(180%)",
    borderRadius: 18,
    border: `1px solid ${cardBorder}`,
    boxShadow: cardShadow,
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", boxSizing: "border-box", padding: "9px 13px", borderRadius: 10,
    border: `1px solid ${inputBorder}`, background: inputBg, fontSize: 13,
    color: textPrimary, outline: "none", fontFamily: "inherit",
  };

  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: 11.5, fontWeight: 700, color: labelColor,
    marginBottom: 5, letterSpacing: "0.04em", textTransform: "uppercase",
  };

  const selectStyles = {
    control: (p: any, s: any) => ({
      ...p,
      border: `1px solid ${inputBorder}`,
      borderRadius: 10,
      background: inputBg,
      minHeight: 40,
      boxShadow: s.isFocused ? `0 0 0 3px ${isDark ? "rgba(124,124,240,0.20)" : "rgba(91,91,214,0.18)"}` : "none",
      "&:hover": { borderColor: isDark ? "rgba(124,124,240,0.40)" : "rgba(91,91,214,0.40)" },
      fontSize: 13,
    }),
    menu: (p: any) => ({
      ...p, borderRadius: 12, overflow: "hidden",
      boxShadow: isDark ? "0 16px 40px rgba(0,0,0,0.60)" : "0 16px 40px rgba(0,0,0,0.14)",
      zIndex: 9999,
      background: isDark ? "rgba(23,23,31,0.98)" : "#fff",
      border: isDark ? "1px solid rgba(255,255,255,0.09)" : "none",
    }),
    option: (p: any, s: any) => ({
      ...p,
      background: s.isSelected
        ? accentMain
        : s.isFocused
          ? isDark ? "rgba(124,124,240,0.10)" : "rgba(91,91,214,0.06)"
          : isDark ? "transparent" : "white",
      color: s.isSelected ? "white" : textPrimary,
      fontSize: 13, padding: "9px 14px",
    }),
    singleValue: (p: any) => ({ ...p, color: textPrimary, fontSize: 13 }),
    placeholder: (p: any) => ({ ...p, color: isDark ? "#3A3A4A" : "#BBBBC8", fontSize: 13 }),
    indicatorSeparator: () => ({ display: "none" }),
    dropdownIndicator: (p: any) => ({ ...p, color: textMuted }),
    input: (p: any) => ({ ...p, color: textPrimary }),
  };

  const [logs, setLogs]       = useState<any[]>([]);
  const [stats, setStats]     = useState({ total: 0, outbound: 0, inbound: 0, connected: 0 });
  const [loading, setLoading] = useState(true);
  const [agentOptions, setAgentOptions] = useState<any[]>([{ value: "all", label: "All Agents" }]);
  const [modal, setModal]     = useState<{ open: boolean; url?: string }>({ open: false });

  const [page, setPage]             = useState(1);
  const [limit, setLimit]           = useState(50);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [filters, setFilters] = useState({
    dateRange: "today", customStart: "", customEnd: "",
    agentId: "all", status: "", fromNumber: "", toNumber: "",
    durationMin: "", durationMax: "",
  });

  useEffect(() => {
    api.get("/auth/available").then((res) => {
      const opts = (res.data || []).map((a: any) => ({ value: a.value ?? a.id, label: a.label ?? a.name }));
      setAgentOptions([{ value: "all", label: "All Agents" }, ...opts]);
    }).catch(() => {});
  }, []);

  const fetchLogs = useCallback(async (overridePage?: number, overrideLimit?: number) => {
    setLoading(true);
    const p = overridePage  ?? page;
    const l = overrideLimit ?? limit;
    try {
      const res = await api.get("/voice/recording-logs", {
        params: {
          ...filters, page: p, limit: l,
          durationMin: filters.durationMin ? Number(filters.durationMin) : undefined,
          durationMax: filters.durationMax ? Number(filters.durationMax) : undefined,
        },
      });
      setLogs(res.data.logs ?? []);
      setStats(res.data.stats ?? {});
      setTotalPages(res.data.pagination?.totalPages ?? 1);
      setTotalCount(res.data.pagination?.total ?? 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filters, page, limit]);

  useEffect(() => { fetchLogs(); }, []);

  const set = (k: string, v: any) => setFilters((f) => ({ ...f, [k]: v }));
  const handleApply       = ()          => { setPage(1); fetchLogs(1, limit); };
  const handlePageChange  = (p: number) => { setPage(p); fetchLogs(p, limit); };
  const handleLimitChange = (l: number) => { setLimit(l); setPage(1); fetchLogs(1, l); };

  const dateOptions = [
    { value: "today",  label: "Today" },
    { value: "yesterday",  label: "Yesterday" },
    { value: "week",   label: "This Week" },
    { value: "month",  label: "This Month" },
    { value: "custom", label: "Custom Range" },
  ];

  const statusOptions = [
    { value: "",          label: "All Statuses" },
    { value: "completed", label: "Completed" },
    { value: "connected", label: "Connected" },
  ];

  const statCards = [
    { label: "Total",     value: stats.total,     icon: Mic,           accent: accentMain },
    { label: "Outbound",  value: stats.outbound,  icon: PhoneOutgoing, accent: accentMain },
    { label: "Inbound",   value: stats.inbound,   icon: PhoneIncoming, accent: "#17A363" },
    { label: "Connected", value: stats.connected, icon: CheckCircle,   accent: "#17A363" },
  ];

  return (
    <div style={{ fontFamily: "'Inter', -apple-system, sans-serif", minHeight: "100vh" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: accentBg,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Mic size={20} color={accentMain} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: textPrimary, letterSpacing: "-0.4px" }}>
              Recordings
            </h1>
            <p style={{ margin: 0, fontSize: 12.5, color: textMuted }}>All recorded calls with playback</p>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12, marginBottom: 20 }}>
        {statCards.map(({ label, value, icon: Icon, accent }) => (
          <motion.div
            key={label}
            whileHover={{ y: -2, boxShadow: isDark ? "0 8px 28px rgba(0,0,0,0.45)" : "0 8px 28px rgba(0,0,0,0.10)" }}
            style={{ ...card, padding: "14px 16px" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 8,
                background: `${accent}${isDark ? "22" : "18"}`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Icon size={14} color={accent} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: textMuted, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                {label}
              </span>
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: textPrimary, letterSpacing: "-0.5px" }}>
              {value ?? 0}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ ...card, padding: "16px 20px", marginBottom: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 14, alignItems: "end" }}>

          <div>
            <label style={labelStyle}>Date Range</label>
            <Select
              options={dateOptions}
              value={dateOptions.find((o) => o.value === filters.dateRange) ?? dateOptions[0]}
              onChange={(opt) => set("dateRange", opt?.value ?? "today")}
              styles={selectStyles} menuPortalTarget={document.body}
            />
          </div>

          {filters.dateRange === "custom" && (<>
            <div style={{ zIndex: 9999 }}>
              <label style={labelStyle}>Start Date</label>
              <DateTimeInput value={filters.customStart} onChange={(val) => set("customStart", val)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>End Date</label>
              <DateTimeInput value={filters.customEnd} onChange={(val) => set("customEnd", val)} style={inputStyle} />
            </div>
          </>)}

          <div>
            <label style={labelStyle}>Agent</label>
            <Select
              options={agentOptions}
              value={agentOptions.find((o) => o.value === filters.agentId) ?? agentOptions[0]}
              onChange={(opt) => set("agentId", opt?.value ?? "all")}
              styles={selectStyles} menuPortalTarget={document.body}
            />
          </div>

          <div>
            <label style={labelStyle}>Status</label>
            <Select
              options={statusOptions}
              value={statusOptions.find((o) => o.value === filters.status) ?? statusOptions[0]}
              onChange={(opt) => set("status", opt?.value ?? "")}
              styles={selectStyles} menuPortalTarget={document.body}
            />
          </div>

          <div>
            <label style={labelStyle}>From Number</label>
            <input type="text" value={filters.fromNumber} placeholder="+1234567890"
              onChange={(e) => set("fromNumber", e.target.value)} style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = isDark ? "rgba(124,124,240,0.45)" : "rgba(91,91,214,0.40)")}
              onBlur={(e)  => (e.target.style.borderColor = inputBorder)} />
          </div>

          <div>
            <label style={labelStyle}>To Number</label>
            <input type="text" value={filters.toNumber} placeholder="+1234567890"
              onChange={(e) => set("toNumber", e.target.value)} style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = isDark ? "rgba(124,124,240,0.45)" : "rgba(91,91,214,0.40)")}
              onBlur={(e)  => (e.target.style.borderColor = inputBorder)} />
          </div>

          <div>
            <label style={labelStyle}>Min Duration (s)</label>
            <input type="number" min={0} placeholder="e.g. 30" value={filters.durationMin}
              onChange={(e) => set("durationMin", e.target.value)} style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = isDark ? "rgba(124,124,240,0.45)" : "rgba(91,91,214,0.40)")}
              onBlur={(e)  => (e.target.style.borderColor = inputBorder)} />
          </div>

          <div>
            <label style={labelStyle}>Max Duration (s)</label>
            <input type="number" min={0} placeholder="e.g. 300" value={filters.durationMax}
              onChange={(e) => set("durationMax", e.target.value)} style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = isDark ? "rgba(124,124,240,0.45)" : "rgba(91,91,214,0.40)")}
              onBlur={(e)  => (e.target.style.borderColor = inputBorder)} />
          </div>

          <div>
            <label style={{ ...labelStyle, opacity: 0 }}>_</label>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              onClick={handleApply} disabled={loading}
              style={{
                width: "100%", padding: "10px 0", borderRadius: 10, border: "none",
                background: loading ? (isDark ? "#2A2A3A" : "#BBBBC8") : accentMain,
                color: loading ? (isDark ? "#68687A" : "#fff") : "#fff",
                fontWeight: 700, fontSize: 13,
                cursor: loading ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                fontFamily: "inherit", transition: "background 0.15s",
              }}>
              {loading ? "Loading…" : "Apply Filter"}
            </motion.button>
          </div>
        </div>
      </div>

      {/* Table + Pagination */}
      <CallLogsTable
        logs={logs}
        loading={loading}
        page={page}
        limit={limit}
        total={totalCount}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        onLimitChange={handleLimitChange}
        onPlayRecording={(url) => setModal({ open: true, url })}
        isDark={isDark}
      />

      {/* Recording modal */}
      <AnimatePresence>
        {modal.open && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <div onClick={() => setModal({ open: false })}
              style={{ position: "absolute", inset: 0, background: modalOverlay, backdropFilter: "blur(4px)" }} />
            <motion.div
              initial={{ scale: 0.93, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.93, opacity: 0 }} transition={{ type: "spring", damping: 22, stiffness: 340 }}
              style={{ ...card, position: "relative", zIndex: 1, width: "90%", maxWidth: 480, padding: 24 }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: accentBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Mic size={16} color={accentMain} />
                  </div>
                  <span style={{ fontSize: 15, fontWeight: 800, color: textPrimary }}>Call Recording</span>
                </div>
                <button onClick={() => setModal({ open: false })}
                  style={{
                    width: 30, height: 30, borderRadius: 8, border: "none",
                    background: closeBtnBg, cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                  <X size={14} color={closeBtnColor} />
                </button>
              </div>

              {modal.url && (
                <InlineAudioPlayer
                  user={user}
                  src={`${API_URL}/voice/play-recording?recordingUrl=${encodeURIComponent(modal.url)}`}
                />
              )}

              <div style={{ marginTop: 18, display: "flex", justifyContent: "flex-end" }}>
                <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  onClick={() => setModal({ open: false })}
                  style={{
                    padding: "8px 20px", borderRadius: 9,
                    border: `1px solid ${footerBtnBorder}`,
                    background: footerBtnBg, color: textSecondary,
                    fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                  }}>
                  Close
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}