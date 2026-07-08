// src/pages/admin/CallLogs.tsx
//@ts-nocheck
import React, { useState, useEffect, useCallback } from "react";
import api from "../../api";
import {
  PhoneIncoming, PhoneOutgoing, PhoneMissed, Phone, Users,
  X, Download, SlidersHorizontal,
} from "lucide-react";
import Select from "react-select";
import { DateInput } from "../../components/ui/AppDatePicker";
import { API_URL } from "../../main";
import InlineAudioPlayer from "../../components/teams/InlineAudioPlayer";
import { useAuth } from "../../context/AuthContext";
import CallLogsTable from "../../components/admin/CallLogsTable";
import { useTheme } from "../../context/ThemeContext";

export default function CallLogs() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // ── Design tokens ──
  const panelBg      = isDark ? "rgba(23,23,31,0.92)"    : "rgba(255,255,255,0.90)";
  const panelBorder  = isDark ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.60)";
  const panelShadow  = isDark
    ? "0 4px 24px rgba(0,0,0,0.40), 0 0 0 1px rgba(255,255,255,0.04)"
    : "0 4px 24px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.04)";
  const inputBg      = isDark ? "#0F0F14"                : "#F6F7F9";
  const inputBorder  = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.09)";
  const textPrimary  = isDark ? "#F0F0F5"                : "#0D0D12";
  const textSecondary = isDark ? "#68687A"               : "#9E9EAD";
  const textMuted    = isDark ? "#A0A0B0"                : "#6B6B7B";
  const accentMain   = isDark ? "#7C7CF0"                : "#5B5BD6";

  const card: React.CSSProperties = {
    background: panelBg,
    backdropFilter: "blur(24px) saturate(180%)",
    WebkitBackdropFilter: "blur(24px) saturate(180%)",
    borderRadius: 18,
    border: `1px solid ${panelBorder}`,
    boxShadow: panelShadow,
  };

  const inputStyle: React.CSSProperties = {
    padding: "8px 12px", borderRadius: 10, width: "100%", boxSizing: "border-box",
    border: `1px solid ${inputBorder}`, background: inputBg,
    fontSize: 13, color: textPrimary, outline: "none", fontFamily: "inherit",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, color: textSecondary,
    textTransform: "uppercase", letterSpacing: "0.06em",
    display: "block", marginBottom: 6,
  };

  const selectStyles = {
    control: (p: any, s: any) => ({
      ...p,
      border: `1px solid ${s.isFocused ? (isDark ? "rgba(124,124,240,0.45)" : "rgba(91,91,214,0.40)") : inputBorder}`,
      borderRadius: 10, padding: "1px 4px", minHeight: 38,
      background: inputBg,
      boxShadow: s.isFocused ? `0 0 0 3px ${isDark ? "rgba(124,124,240,0.12)" : "rgba(91,91,214,0.10)"}` : "none",
      "&:hover": { borderColor: isDark ? "rgba(124,124,240,0.30)" : "rgba(91,91,214,0.30)" },
      fontFamily: "inherit", fontSize: 13,
    }),
    menu: (p: any) => ({
      ...p, borderRadius: 12,
      background: isDark ? "#1E1E28" : "#fff",
      boxShadow: isDark ? "0 12px 28px rgba(0,0,0,0.50)" : "0 12px 28px rgba(0,0,0,0.12)",
      zIndex: 9999, marginTop: 4,
      border: isDark ? "1px solid rgba(255,255,255,0.07)" : "none",
    }),
    option: (p: any, s: any) => ({
      ...p,
      background: s.isSelected ? accentMain : s.isFocused ? (isDark ? "rgba(124,124,240,0.10)" : "rgba(91,91,214,0.07)") : "transparent",
      color: s.isSelected ? "#fff" : textPrimary,
      fontSize: 13, padding: "9px 14px",
    }),
    singleValue: (p: any) => ({ ...p, color: textPrimary, fontSize: 13 }),
    placeholder: (p: any) => ({ ...p, color: textSecondary, fontSize: 13 }),
    indicatorSeparator: () => ({ display: "none" }),
    dropdownIndicator: (p: any) => ({ ...p, color: textSecondary }),
  };

  const [logs, setLogs]       = useState<any[]>([]);
  const [stats, setStats]     = useState({ total: 0, outbound: 0, inbound: 0, missed: 0, connected: 0 });
  const [loading, setLoading] = useState(true);
  const [agentOptions, setAgentOptions] = useState<any[]>([{ value: "all", label: "All Agents" }]);
  const [recordingModal, setRecordingModal] = useState<{ open: boolean; recordingUrl?: string }>({ open: false });

  const [page, setPage]             = useState(1);
  const [limit, setLimit]           = useState(50);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [filters, setFilters] = useState({
    dateRange: "today", customStart: "", customEnd: "",
    agentId: "all", status: "", fromNumber: "", toNumber: "",
    durationMin: "", durationMax: "",
  });

  const dateOptions = [
    { value: "today",  label: "Today" },
    { value: "yesterday",  label: "Yesterday" },
    { value: "week",   label: "This Week" },
    { value: "month",  label: "This Month" },
    { value: "custom", label: "Custom" },
  ];
  const statusOptions = [
    { value: "",          label: "All Statuses" },
    { value: "connected", label: "Connected" },
    { value: "missed",    label: "Missed" },
  ];

  useEffect(() => {
    api.get("/auth/available").then((res) => {
      const opts = res.data.map((a: any) => ({ value: a.id, label: a.name }));
      setAgentOptions([{ value: "all", label: "All Agents" }, ...opts]);
    }).catch(console.error);
  }, []);

  const fetchLogs = useCallback(async (overridePage?: number, overrideLimit?: number) => {
    setLoading(true);
    const p = overridePage  ?? page;
    const l = overrideLimit ?? limit;
    try {
      const res = await api.get("/voice/call-logs", {
        params: {
          ...filters, page: p, limit: l,
          durationMin: filters.durationMin ? Number(filters.durationMin) : undefined,
          durationMax: filters.durationMax ? Number(filters.durationMax) : undefined,
        },
      });
      setLogs(res.data.logs ?? []);
      setStats(res.data.stats);
      setTotalPages(res.data.pagination?.totalPages ?? 1);
      setTotalCount(res.data.pagination?.total ?? 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filters, page, limit]);

  useEffect(() => { fetchLogs(); }, []);

  const set = (k: string, v: any) => setFilters((p) => ({ ...p, [k]: v }));
  const handleApply       = ()          => { setPage(1);  fetchLogs(1, limit); };
  const handlePageChange  = (p: number) => { setPage(p);  fetchLogs(p, limit); };
  const handleLimitChange = (l: number) => { setLimit(l); setPage(1); fetchLogs(1, l); };

  const statCards = [
    { label: "Total",     value: stats.total,     icon: Phone,         color: accentMain,                      bg: isDark ? "#1E1E3A" : "#EDEDFB" },
    { label: "Outbound",  value: stats.outbound,  icon: PhoneOutgoing, color: accentMain,                      bg: isDark ? "#1E1E3A" : "#EDEDFB" },
    { label: "Inbound",   value: stats.inbound,   icon: PhoneIncoming, color: "#22C77A",                       bg: isDark ? "#0F2A1E" : "#DCFCE7" },
    { label: "Missed",    value: stats.missed,    icon: PhoneMissed,   color: isDark ? "#F87171" : "#D0281A",  bg: isDark ? "#2A0F0F" : "#FEE2E2" },
    { label: "Connected", value: stats.connected, icon: Users,         color: "#0D9488",                       bg: isDark ? "#0A2A28" : "#F0FDFA" },
  ];

  return (
    <div style={{ padding: 24, fontFamily: "'Inter', -apple-system, sans-serif", display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: textPrimary, letterSpacing: "-0.02em" }}>Call Logs</div>
          <div style={{ fontSize: 12, color: textSecondary, marginTop: 2 }}>Full history of all inbound & outbound calls</div>
        </div>
        <button
          onClick={() => {}}
          style={{
            display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 10,
            border: `1px solid ${inputBorder}`, background: inputBg,
            fontSize: 12, fontWeight: 600, color: textMuted, cursor: "pointer", fontFamily: "inherit",
          }}
        >
          <Download size={13} /> Export CSV
        </button>
      </div>

      {/* Stat pills */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10 }}>
        {statCards.map((s) => (
          <div key={s.label} style={{ ...card, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <s.icon size={15} style={{ color: s.color }} />
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: textSecondary, textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.label}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: textPrimary, marginTop: 1 }}>{s.value ?? 0}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ ...card, padding: "16px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
          <SlidersHorizontal size={14} style={{ color: textSecondary }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: textSecondary, textTransform: "uppercase", letterSpacing: "0.07em" }}>Filters</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 14, alignItems: "end" }}>
          <div>
            <label style={labelStyle}>Date Range</label>
            <Select options={dateOptions} value={dateOptions.find((o) => o.value === filters.dateRange) || dateOptions[0]}
              onChange={(o: any) => set("dateRange", o?.value || "today")} styles={selectStyles} menuPortalTarget={document.body} />
          </div>

          {filters.dateRange === "custom" && (<>
            <div>
              <label style={labelStyle}>Start</label>
              <DateInput value={filters.customStart} onChange={(val) => set("customStart", val)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>End</label>
              <DateInput value={filters.customEnd} onChange={(val) => set("customEnd", val)} style={inputStyle} />
            </div>
          </>)}

          <div>
            <label style={labelStyle}>Status</label>
            <Select options={statusOptions} value={statusOptions.find((o) => o.value === filters.status)}
              onChange={(o: any) => set("status", o?.value || "")} styles={selectStyles} menuPortalTarget={document.body} />
          </div>

          <div>
            <label style={labelStyle}>Agent</label>
            <Select options={agentOptions} value={agentOptions.find((o) => o.value === filters.agentId)}
              onChange={(o: any) => set("agentId", o?.value || "all")} styles={selectStyles} menuPortalTarget={document.body} />
          </div>

          <div>
            <label style={labelStyle}>From Number</label>
            <input type="text" value={filters.fromNumber} onChange={(e) => set("fromNumber", e.target.value)}
              placeholder="+1234567890" style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>To Number</label>
            <input type="text" value={filters.toNumber} onChange={(e) => set("toNumber", e.target.value)}
              placeholder="+1234567890" style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>Duration (s)</label>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input type="number" min={0} placeholder="Min" value={filters.durationMin}
                onChange={(e) => set("durationMin", e.target.value)}
                style={{ ...inputStyle, width: "calc(50% - 3px)" }} />
              <span style={{ color: textSecondary, fontSize: 12 }}>–</span>
              <input type="number" min={0} placeholder="Max" value={filters.durationMax}
                onChange={(e) => set("durationMax", e.target.value)}
                style={{ ...inputStyle, width: "calc(50% - 3px)" }} />
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <button onClick={handleApply} disabled={loading} style={{
              width: "100%", padding: "9px 0", borderRadius: 10, border: "none",
              background: loading ? (isDark ? "rgba(124,124,240,0.35)" : "rgba(91,91,214,0.40)") : accentMain,
              color: "#fff", fontSize: 13, fontWeight: 700,
              cursor: loading ? "wait" : "pointer", fontFamily: "inherit",
              boxShadow: loading ? "none" : (isDark ? "0 4px 14px rgba(124,124,240,0.35)" : "0 4px 14px rgba(91,91,214,0.28)"),
              transition: "all 0.14s",
            }}>
              {loading ? "Loading…" : "Apply Filters"}
            </button>
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
        onPlayRecording={(url) => setRecordingModal({ open: true, recordingUrl: url })}
        isDark={isDark}
      />

      {/* Recording modal */}
      {recordingModal.open && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 99999,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: isDark ? "rgba(0,0,0,0.60)" : "rgba(0,0,0,0.38)",
          backdropFilter: "blur(12px)",
        }}>
          <div style={{ ...card, width: "100%", maxWidth: 480, padding: 24, position: "relative", fontFamily: "inherit" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: textPrimary }}>Call Recording</div>
              <button onClick={() => setRecordingModal({ open: false })}
                style={{
                  width: 32, height: 32, borderRadius: 8,
                  border: `1px solid ${inputBorder}`, background: inputBg,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", color: textMuted,
                }}>
                <X size={15} />
              </button>
            </div>
            {recordingModal.recordingUrl && (
              <InlineAudioPlayer user={user} src={`${API_URL}/voice/play-recording?recordingUrl=${encodeURIComponent(recordingModal.recordingUrl)}`} />
            )}
            <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
              <button onClick={() => setRecordingModal({ open: false })}
                style={{
                  padding: "8px 20px", borderRadius: 10,
                  border: `1px solid ${inputBorder}`, background: inputBg,
                  color: textMuted, fontSize: 13, fontWeight: 600,
                  cursor: "pointer", fontFamily: "inherit",
                }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}