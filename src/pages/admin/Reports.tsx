// @ts-nocheck
import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  PhoneOutgoing, PhoneIncoming, MessageSquare, Activity,
  BarChart3, ChevronRight, Filter, ChevronDown, RefreshCw,
  TrendingUp,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import api from "../../api";
import { DateInput } from "../../components/ui/AppDatePicker";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  CartesianGrid, Cell, LabelList,
  Legend,
} from "recharts";

// ── Report nav cards ────────────────────────────────────────────────────────
const reports = [
  { id: "outbound",    title: "Outbound Calls",  description: "Track all outbound call activity, durations, and outcomes by agent or team.", icon: PhoneOutgoing, accent: "#5B5BD6", route: "/admin/reports/outbound"    },
  { id: "inbound",     title: "Inbound Calls",   description: "Review inbound call volume, wait times, answered vs missed breakdowns.",      icon: PhoneIncoming, accent: "#17A363", route: "/admin/reports/inbound"     },
  { id: "messaging",   title: "Messaging",        description: "SMS delivery stats, inbound vs outbound message volume and status breakdown.", icon: MessageSquare, accent: "#D38A00", route: "/admin/reports/messages"    },
  { id: "performance", title: "Performance",      description: "Agent-level KPIs: calls handled, talk time, wrap-up, and conversion rates.",  icon: Activity,      accent: "#C2410C", route: "/admin/reports/performance" },
];

type DateFilter = "today" | "yesterday" | "week" | "month" | "custom";
const FILTER_LABELS: Record<DateFilter, string> = {
  today: "Today", yesterday: "Yesterday", week: "This Week", month: "This Month", custom: "Custom",
};

function yesterdayRange() {
  const d = new Date(); d.setDate(d.getDate() - 1);
  const s = d.toISOString().slice(0, 10);
  return { startDate: s, endDate: s };
}


// ── Custom tooltip ───────────────────────────────────────────────────────────
function CTooltip({ active, payload, label, isDark }: any) {
  if (!active || !payload?.length) return null;
  const bg  = isDark ? "#16161E" : "#fff";
  const bdr = isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.08)";
  return (
    <div style={{ background: bg, border: `1px solid ${bdr}`, borderRadius: 10, padding: "10px 14px", fontSize: 12.5, boxShadow: "0 8px 24px rgba(0,0,0,0.18)" }}>
      {label && <p style={{ margin: "0 0 5px", fontWeight: 700, color: isDark ? "#E8E8F0" : "#111" }}>{label}</p>}
      {payload.map((p: any) => (
        <p key={p.name} style={{ margin: "2px 0", color: p.color || p.fill, fontWeight: 600 }}>
          {p.name}: <span style={{ color: isDark ? "#E8E8F0" : "#111" }}>{p.value?.toLocaleString?.() ?? p.value}</span>
        </p>
      ))}
    </div>
  );
}

function ChartSkeleton({ isDark }: { isDark: boolean }) {
  const bg = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)";
  return (
    <div style={{ height: 220, display: "flex", alignItems: "flex-end", gap: 10, padding: "0 8px" }}>
      {[55, 80, 40, 90, 65, 75, 50].map((h, i) => (
        <div key={i} style={{ flex: 1, height: `${h}%`, borderRadius: 6, background: bg, animation: "pulse 1.4s ease-in-out infinite", animationDelay: `${i * 0.12}s` }} />
      ))}
    </div>
  );
}

function EmptyChart({ isDark, label }: { isDark: boolean; label: string }) {
  const c = isDark ? "#3A3A4A" : "#D1D5DB";
  return (
    <div style={{ height: 220, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
      <BarChart3 size={32} color={c} />
      <p style={{ margin: 0, fontSize: 12.5, color: c }}>{label}</p>
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function ReportingDashboard() {
  const navigate  = useNavigate();
  const { theme } = useTheme();
  const { token } = useAuth();
  const isDark    = theme === "dark";

  const textPrimary = isDark ? "#F0F0F5"                  : "#0D0D12";
  const textMuted   = isDark ? "#68687A"                  : "#9E9EAD";
  const accentMain  = isDark ? "#7C7CF0"                  : "#5B5BD6";
  const accentBg    = isDark ? "rgba(124,124,240,0.12)"   : "rgba(91,91,214,0.12)";
  const cardBg      = isDark ? "rgba(23,23,31,0.95)"      : "#fff";
  const cardBorder  = isDark ? "rgba(255,255,255,0.07)"   : "rgba(0,0,0,0.07)";
  const cardShadow  = isDark ? "0 4px 24px rgba(0,0,0,0.40), 0 0 0 1px rgba(255,255,255,0.04)" : "0 4px 24px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.04)";
  const arrowBg     = isDark ? "rgba(255,255,255,0.06)"   : "rgba(0,0,0,0.04)";
  const inputBg     = isDark ? "rgba(30,30,42,0.90)"      : "#F6F7F9";
  const inputBdr    = isDark ? "rgba(255,255,255,0.09)"   : "rgba(0,0,0,0.10)";
  const gridClr     = isDark ? "rgba(255,255,255,0.05)"   : "rgba(0,0,0,0.05)";
  const axisClr     = isDark ? "#4A4A5A"                  : "#C7C7D5";
  const pillBg      = isDark ? "rgba(255,255,255,0.04)"   : "rgba(0,0,0,0.04)";
  const dropBg      = isDark ? "rgba(18,18,24,0.98)"      : "#fff";

  // ── Filter state ──
  const [dateFilter, setDateFilter]   = useState<DateFilter>("week");
  const [customStart, setCustomStart] = useState("");
  const [customEnd,   setCustomEnd]   = useState("");
  const [filterOpen,  setFilterOpen]  = useState(false);

  // ── Data state ──
  const [outStats,  setOutStats]  = useState<any>(null);
  const [inStats,   setInStats]   = useState<any>(null);
  const [perfData,  setPerfData]  = useState<any[]>([]);
  const [msgStats,  setMsgStats]  = useState<any>(null);
  const [loading,   setLoading]   = useState(false);

  const buildParams = useCallback(() => {
    const p = new URLSearchParams();
    if (dateFilter === "yesterday") {
      p.append("dateFilter", "custom");
      const { startDate, endDate } = yesterdayRange();
      p.append("startDate", startDate); p.append("endDate", endDate);
    } else {
      p.append("dateFilter", dateFilter);
      if (dateFilter === "custom" && customStart && customEnd) {
        p.append("startDate", customStart); p.append("endDate", customEnd);
      }
    }
    return p.toString();
  }, [dateFilter, customStart, customEnd]);

  const fetchAll = useCallback(async () => {
    if (!token) return;
    if (dateFilter === "custom" && (!customStart || !customEnd)) return;
    setLoading(true);
    const q = buildParams();
    const [outR, inR, perfR, msgR] = await Promise.allSettled([
      api.get(`/voice/reports/outbound?${q}&limit=1000`),
      api.get(`/voice/reports/inbound?${q}&limit=1000`),
      api.get(`/voice/reports/agents?${q}&limit=1000`),
      api.get(`/voice/reports/messages?${q}&limit=1000`),
    ]);
    if (outR.status  === "fulfilled") setOutStats(outR.value.data.stats  ?? null);
    if (inR.status   === "fulfilled") setInStats(inR.value.data.stats    ?? null);
    if (perfR.status === "fulfilled") setPerfData(perfR.value.data.data  ?? []);
    if (msgR.status  === "fulfilled") setMsgStats(msgR.value.data.stats  ?? null);
    setLoading(false);
  }, [token, buildParams, dateFilter, customStart, customEnd]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Computed chart data ──
  const outChartData = outStats ? [
    { name: "Total",         value: outStats.totalOutbound || 0, fill: accentMain },
    { name: "Connected",     value: outStats.connected     || 0, fill: "#10B981"  },
    { name: "Not Connected", value: outStats.notConnected  || 0, fill: "#EF4444"  },
  ] : [];

  const inChartData = inStats ? [
    { name: "Total",    value: inStats.totalInbound || 0, fill: "#17A363" },
    { name: "Answered", value: inStats.connected    || 0, fill: "#10B981" },
    { name: "Missed",   value: inStats.notConnected || 0, fill: "#EF4444" },
  ] : [];

  const perfChartData = perfData.slice(0, 10).map(a => ({
    name:      (a.agentName || "?").split(" ")[0],
    Dialed:    a.dialed    || 0,
    Connected: a.connected || 0,
    Missed:    a.missed    || 0,
  }));

  const msgChartData = msgStats ? [
    { name: "Total",    value: msgStats.total    || 0, fill: "#D38A00" },
    { name: "Inbound",  value: msgStats.inbound  || 0, fill: "#8B5CF6" },
    { name: "Outbound", value: msgStats.outbound || 0, fill: "#06B6D4" },
  ] : [];

  // ── Shared style helpers ──
  const chartCard: React.CSSProperties = {
    background: cardBg, borderRadius: 18, border: `1px solid ${cardBorder}`,
    boxShadow: cardShadow, padding: "20px 20px 16px", overflow: "hidden",
  };
  const statPill = (label: string, value: string | number, color: string) => (
    <div key={label} style={{ flex: "1 1 80px", background: isDark ? "rgba(255,255,255,0.03)" : "#FAFAFA", borderRadius: 10, padding: "8px 12px", border: `1px solid ${cardBorder}` }}>
      <p style={{ margin: 0, fontSize: 10.5, fontWeight: 700, color: textMuted, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</p>
      <p style={{ margin: "3px 0 0", fontSize: 20, fontWeight: 800, color }}>{typeof value === "number" ? value.toLocaleString() : value}</p>
    </div>
  );
  const sectionHead = (title: string, icon: React.ReactNode, accent: string) => (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
      <div style={{ width: 34, height: 34, borderRadius: 10, background: `${accent}${isDark ? "22" : "18"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {icon}
      </div>
      <span style={{ fontSize: 14, fontWeight: 800, color: textPrimary }}>{title}</span>
    </div>
  );

  const filterLabel = dateFilter === "custom" && customStart && customEnd
    ? `${customStart} → ${customEnd}` : FILTER_LABELS[dateFilter];

  return (
    <div style={{ fontFamily: "'Inter', -apple-system, sans-serif", minHeight: "100vh" }}>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
        @keyframes spin  { to{transform:rotate(360deg)} }
      `}</style>

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: accentBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <BarChart3 size={20} color={accentMain} />
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: textPrimary, letterSpacing: "-0.4px" }}>Reports</h1>
          <p style={{ margin: 0, fontSize: 12.5, color: textMuted }}>Select a report to dive into detailed analytics</p>
        </div>
      </div>

      {/* ── Nav cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16, marginBottom: 40 }}>
        {reports.map((report, idx) => (
          <motion.div key={report.id}
            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.06 }}
            whileHover={{ y: -3, boxShadow: isDark ? "0 12px 32px rgba(0,0,0,0.50)" : "0 12px 32px rgba(0,0,0,0.12)" }}
            whileTap={{ scale: 0.98 }} onClick={() => navigate(report.route)}
            style={{ background: cardBg, backdropFilter: "blur(24px) saturate(180%)", WebkitBackdropFilter: "blur(24px) saturate(180%)", borderRadius: 18, border: `1px solid ${cardBorder}`, boxShadow: cardShadow, padding: "20px 20px 18px", cursor: "pointer" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              <div style={{ width: 44, height: 44, borderRadius: 13, background: isDark ? `${report.accent}22` : `${report.accent}18`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14, flexShrink: 0 }}>
                <report.icon size={20} color={report.accent} />
              </div>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: arrowBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <ChevronRight size={14} color={textMuted} />
              </div>
            </div>
            <div style={{ fontSize: 15, fontWeight: 800, color: textPrimary, marginBottom: 6 }}>{report.title}</div>
            <div style={{ fontSize: 12.5, color: textMuted, lineHeight: 1.55 }}>{report.description}</div>
            <div style={{ marginTop: 16, height: 3, borderRadius: 99, background: `linear-gradient(90deg, ${report.accent}, ${report.accent}44)`, width: "40%" }} />
          </motion.div>
        ))}
      </div>

      {/* ── Analytics section header + filter bar ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 22 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: accentBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <TrendingUp size={16} color={accentMain} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: textPrimary }}>Analytics Overview</p>
            <p style={{ margin: 0, fontSize: 12, color: textMuted }}>Visual summary · {filterLabel}</p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {/* Refresh */}
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={fetchAll}
            title="Refresh"
            style={{ width: 36, height: 36, borderRadius: 10, border: `1px solid ${inputBdr}`, background: inputBg, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <RefreshCw size={14} color={textMuted} style={loading ? { animation: "spin 0.7s linear infinite" } : {}} />
          </motion.button>

          {/* Preset pills */}
          <div style={{ display: "flex", gap: 3, background: pillBg, borderRadius: 11, padding: 3, border: `1px solid ${inputBdr}` }}>
            {(["today","yesterday","week","month"] as DateFilter[]).map(f => (
              <button key={f} onClick={() => { setDateFilter(f); setCustomStart(""); setCustomEnd(""); }}
                style={{ padding: "5px 11px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "inherit", transition: "all 0.14s",
                  background: dateFilter === f ? accentMain : "transparent",
                  color:      dateFilter === f ? "#fff"     : textMuted }}>
                {FILTER_LABELS[f]}
              </button>
            ))}
          </div>

          {/* Custom range */}
          <div style={{ position: "relative" }}>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={() => setFilterOpen(o => !o)}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 10, border: `1px solid ${dateFilter === "custom" ? accentMain : inputBdr}`, background: dateFilter === "custom" ? accentBg : inputBg, color: dateFilter === "custom" ? accentMain : textMuted, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
              <Filter size={12} /> Custom <ChevronDown size={11} />
            </motion.button>
            <AnimatePresence>
              {filterOpen && (
                <motion.div initial={{ opacity: 0, y: -6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.97 }}
                  style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, width: 230, background: dropBg, border: `1px solid ${inputBdr}`, borderRadius: 14, padding: "14px", zIndex: 9999, boxShadow: isDark ? "0 16px 48px rgba(0,0,0,0.60)" : "0 16px 48px rgba(0,0,0,0.14)" }}>
                  {[{ lbl: "Start Date", val: customStart, set: setCustomStart }, { lbl: "End Date", val: customEnd, set: setCustomEnd }].map(({ lbl, val, set }) => (
                    <div key={lbl} style={{ marginBottom: 12 }}>
                      <label style={{ fontSize: 10.5, fontWeight: 700, color: textMuted, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 5 }}>{lbl}</label>
                      <DateInput value={val} onChange={set} style={{ width: "100%", boxSizing: "border-box", borderRadius: 8 }} />
                    </div>
                  ))}
                  <button onClick={() => { if (customStart && customEnd) { setDateFilter("custom"); setFilterOpen(false); } }}
                    disabled={!customStart || !customEnd}
                    style={{ width: "100%", padding: "8px", borderRadius: 9, border: "none", background: (!customStart || !customEnd) ? (isDark ? "#2A2A3A" : "#E5E7EB") : accentMain, color: (!customStart || !customEnd) ? textMuted : "#fff", fontWeight: 700, fontSize: 13, cursor: (!customStart || !customEnd) ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
                    Apply
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ── 4 Chart cards grid ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(440px, 1fr))", gap: 18 }}>

        {/* 1 — Outbound */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} style={chartCard}>
          {sectionHead("Outbound Calls", <PhoneOutgoing size={16} color="#5B5BD6" />, "#5B5BD6")}
          {outStats && (
            <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
              {statPill("Total",         outStats.totalOutbound || 0, accentMain)}
              {statPill("Connected",     outStats.connected     || 0, "#10B981")}
              {statPill("Not Connected", outStats.notConnected  || 0, "#EF4444")}
            </div>
          )}
          {loading ? <ChartSkeleton isDark={isDark} />
            : outChartData.some(d => d.value > 0)
              ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={outChartData} barSize={50} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridClr} vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11.5, fill: axisClr }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: axisClr }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip content={(p: any) => <CTooltip {...p} isDark={isDark} />} cursor={{ fill: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)" }} />
                    <Bar dataKey="value" radius={[8,8,0,0]} name="Count">
                      {outChartData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                      <LabelList dataKey="value" position="top" style={{ fontSize: 11.5, fontWeight: 700, fill: textMuted }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : <EmptyChart isDark={isDark} label="No outbound data for this period" />
          }
        </motion.div>

        {/* 2 — Inbound */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.10 }} style={chartCard}>
          {sectionHead("Inbound Calls", <PhoneIncoming size={16} color="#17A363" />, "#17A363")}
          {inStats && (
            <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
              {statPill("Total",    inStats.totalInbound || 0, "#17A363")}
              {statPill("Answered", inStats.connected    || 0, "#10B981")}
              {statPill("Missed",   inStats.notConnected || 0, "#EF4444")}
            </div>
          )}
          {loading ? <ChartSkeleton isDark={isDark} />
            : inChartData.some(d => d.value > 0)
              ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={inChartData} barSize={50} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridClr} vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11.5, fill: axisClr }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: axisClr }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip content={(p: any) => <CTooltip {...p} isDark={isDark} />} cursor={{ fill: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)" }} />
                    <Bar dataKey="value" radius={[8,8,0,0]} name="Count">
                      {inChartData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                      <LabelList dataKey="value" position="top" style={{ fontSize: 11.5, fontWeight: 700, fill: textMuted }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : <EmptyChart isDark={isDark} label="No inbound data for this period" />
          }
        </motion.div>

        {/* 3 — Agent Performance */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} style={chartCard}>
          {sectionHead("Agent Performance", <Activity size={16} color="#C2410C" />, "#C2410C")}
          {loading ? <ChartSkeleton isDark={isDark} />
            : perfChartData.length
              ? (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={perfChartData} barSize={9} barGap={2} barCategoryGap="28%" margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridClr} vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: axisClr }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: axisClr }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip content={(p: any) => <CTooltip {...p} isDark={isDark} />} cursor={{ fill: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)" }} />
                    <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 11.5, paddingTop: 10, color: textMuted }} />
                    <Bar dataKey="Dialed"    fill={accentMain} radius={[5,5,0,0]} />
                    <Bar dataKey="Connected" fill="#10B981"    radius={[5,5,0,0]} />
                    <Bar dataKey="Missed"    fill="#EF4444"    radius={[5,5,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <EmptyChart isDark={isDark} label="No performance data for this period" />
          }
        </motion.div>

        {/* 4 — Messaging */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.20 }} style={chartCard}>
          {sectionHead("Messaging", <MessageSquare size={16} color="#D38A00" />, "#D38A00")}
          {msgStats && (
            <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
              {statPill("Total",    msgStats.total    || 0, "#D38A00")}
              {statPill("Inbound",  msgStats.inbound  || 0, "#8B5CF6")}
              {statPill("Outbound", msgStats.outbound || 0, "#06B6D4")}
            </div>
          )}
          {loading ? <ChartSkeleton isDark={isDark} />
            : msgChartData.some(d => d.value > 0)
              ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={msgChartData} barSize={50} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridClr} vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11.5, fill: axisClr }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: axisClr }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip content={(p: any) => <CTooltip {...p} isDark={isDark} />} cursor={{ fill: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)" }} />
                    <Bar dataKey="value" radius={[8,8,0,0]} name="Count">
                      {msgChartData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                      <LabelList dataKey="value" position="top" style={{ fontSize: 11.5, fontWeight: 700, fill: textMuted }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : <EmptyChart isDark={isDark} label="No messaging data for this period" />
          }
        </motion.div>

      </div>
    </div>
  );
}
