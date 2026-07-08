// pages/AgentKPIs.tsx
//@ts-nocheck
import React, { useEffect, useRef, useState, useMemo } from "react";
import api from "../api";
import { useAuth } from "../context/AuthContext";
import {
  Filter, ChevronDown, RefreshCw, User, Phone, Target, Award,
  Clock, TrendingUp, ArrowLeft, ArrowRight, ChevronRight,
  BarChart3, Search, X, ChevronUp, ChevronsUpDown,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { DateInput } from "../components/ui/AppDatePicker";
import { useTheme } from "../context/ThemeContext";

import {
  Chart as ChartJS, ArcElement, Tooltip, Legend,
  CategoryScale, LinearScale, BarElement,
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

const DATE_LABELS = {
  all: "All Time", today: "Today",
  week: "This Week", month: "This Month", custom: "Custom Range",
};

// ─── Rank badge ───────────────────────────────────────────────────────────────
function RankBadge({ rank }: { rank: number }) {
  const medals: Record<number, { bg: string; color: string; label: string }> = {
    1: { bg: "#FEF3C7", color: "#D97706", label: "🥇" },
    2: { bg: "#F1F5F9", color: "#64748B", label: "🥈" },
    3: { bg: "#FFF7ED", color: "#C2410C", label: "🥉" },
  };
  const m = medals[rank];
  if (m) {
    return (
      <span style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: 26, height: 26, borderRadius: "50%",
        background: m.bg, fontSize: 14,
      }}>
        {m.label}
      </span>
    );
  }
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      width: 26, height: 26, borderRadius: "50%",
      background: "#F9FAFB", border: "1px solid #EAECF0",
      fontSize: 11, fontWeight: 700, color: "#98A2B3",
    }}>
      {rank}
    </span>
  );
}

// ─── Call bar ─────────────────────────────────────────────────────────────────
function CallBar({ value, max, isDark }: { value: number; max: number; isDark: boolean }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 120 }}>
      <div style={{
        flex: 1, height: 6, borderRadius: 3,
        background: isDark ? "rgba(255,255,255,0.08)" : "#F1F5F9",
        overflow: "hidden",
      }}>
        <div style={{
          width: `${pct}%`, height: "100%", borderRadius: 3,
          background: pct >= 80 ? "#10B981" : pct >= 40 ? "#5B5BD6" : "#94A3B8",
          transition: "width 0.6s ease",
        }} />
      </div>
      <span style={{
        fontSize: 12, fontWeight: 700,
        color: isDark ? "#F0F0F5" : "#101828",
        minWidth: 28, textAlign: "right",
      }}>
        {value}
      </span>
    </div>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ title, value, icon: Icon, bg, tc, onClick, isDark }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      style={{
        background: isDark ? "rgba(23,23,31,0.92)" : "#fff",
        border: `1px solid ${isDark ? "rgba(255,255,255,0.07)" : "#EAECF0"}`,
        borderRadius: 12,
        padding: "18px 20px", display: "flex", alignItems: "center",
        justifyContent: "space-between", cursor: onClick ? "pointer" : "default",
        backdropFilter: isDark ? "blur(24px)" : "none",
      }}
      whileHover={onClick ? { y: -2 } : {}} transition={{ duration: 0.15 }}
    >
      <div>
        <p style={{ fontSize: 12, color: isDark ? "#68687A" : "#667085", fontWeight: 500, margin: "0 0 6px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
          {title}
        </p>
        <p style={{ fontSize: 26, fontWeight: 700, color: isDark ? "#F0F0F5" : "#101828", margin: 0, letterSpacing: "-0.02em" }}>
          {value}
        </p>
      </div>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon size={18} style={{ color: tc }} />
      </div>
    </motion.div>
  );
}
function formatTalkTime(seconds: number) {
  const totalSeconds = Number(seconds || 0);

  if (totalSeconds <= 0) return "0m";

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
}
// ─── Sort icon ────────────────────────────────────────────────────────────────
function SortIcon({ col, sortKey, dir }) {
  if (sortKey !== col) return <ChevronsUpDown size={11} style={{ color: "#D0D5DD", marginLeft: 3, verticalAlign: "middle" }} />;
  return dir === "asc"
    ? <ChevronUp   size={11} style={{ color: "#5B5BD6", marginLeft: 3, verticalAlign: "middle" }} />
    : <ChevronDown size={11} style={{ color: "#5B5BD6", marginLeft: 3, verticalAlign: "middle" }} />;
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function AgentKPIs() {
  const { token, user } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const navigate = useNavigate();

  // ── Design tokens ──
  const pageBg        = isDark ? "#0F0F14"                  : "#F8F9FC";
  const headerBg      = isDark ? "rgba(17,17,24,0.95)"      : "#fff";
  const cardBg        = isDark ? "rgba(23,23,31,0.92)"      : "#fff";
  const cardBorder    = isDark ? "rgba(255,255,255,0.07)"   : "#EAECF0";
  const tableBg       = isDark ? "rgba(23,23,31,0.92)"      : "#fff";
  const tableHeaderBg = isDark ? "rgba(255,255,255,0.03)"   : "#F9FAFB";
  const tableRowHover = isDark ? "rgba(255,255,255,0.04)"   : "#F9FAFB";
  const tableRowBorder= isDark ? "rgba(255,255,255,0.06)"   : "#F2F4F7";
  const textPrimary   = isDark ? "#F0F0F5"                  : "#101828";
  const textSecondary = isDark ? "#68687A"                  : "#667085";
  const textMuted     = isDark ? "#A0A0B0"                  : "#344054";
  const accentMain    = isDark ? "#7C7CF0"                  : "#5B5BD6";
  const accentBg      = isDark ? "rgba(124,124,240,0.12)"  : "rgba(91,91,214,0.08)";
  const borderColor   = isDark ? "rgba(255,255,255,0.09)"   : "#D0D5DD";
  const dropdownBg    = isDark ? "rgba(23,23,31,0.98)"      : "#fff";
  const dropdownBorder= isDark ? "rgba(255,255,255,0.10)"   : "#EAECF0";
  const inputBg       = isDark ? "rgba(23,23,31,0.90)"      : "#fff";
  const inputBorder   = isDark ? "rgba(255,255,255,0.09)"   : "#EAECF0";
  const badgeBg       = isDark ? "rgba(255,255,255,0.06)"   : "#F2F4F7";
  const paginationBg  = isDark ? "rgba(124,124,240,0.15)"   : "#EFF6FF";
  const divider       = isDark ? "rgba(255,255,255,0.06)"   : "#EAECF0";

  const inputStyle = {
    width: "100%", padding: "6px 8px", borderRadius: 6,
    border: `1px solid ${borderColor}`, fontSize: 12,
    outline: "none", boxSizing: "border-box",
    background: inputBg, color: textPrimary,
  };

  const isAdmin = user?.role === "ADMIN";
  const isAgent = user?.role === "AGENT";

  const [ownKpis, setOwnKpis]             = useState(null);
  const [allAgentsKpis, setAllAgentsKpis] = useState([]);
  const [kpiPage, setKpiPage]             = useState(0);
  const KPI_PAGE_SIZE = 10;
  const [loading, setLoading]             = useState(true);

  const [dateFilter, setDateFilter]         = useState("week");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [customStart, setCustomStart]       = useState("");
  const [customEnd, setCustomEnd]           = useState("");
  const [agentSearch, setAgentSearch]       = useState("");
  const [searchFocused, setSearchFocused]   = useState(false);

  const [sortKey, setSortKey] = useState<string>("totalCalls");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const datePickerRef = useRef(null);

  const fetchOwnKPIs = async () => {
    try {
      const params = new URLSearchParams();
      if (dateFilter !== "all") params.append("filter", dateFilter);
      if (dateFilter === "custom" && customStart && customEnd) {
        params.append("startDate", customStart);
        params.append("endDate", customEnd);
      }
      const res = await api.get(`/voice/agent/kpis?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setOwnKpis(res.data);
    } catch (err) { console.error("Failed to fetch own KPIs:", err); }
  };

  const fetchAllAgentsKPIs = async () => {
    try {
      const params = new URLSearchParams();
      if (dateFilter !== "all") params.append("filter", dateFilter);
      if (dateFilter === "custom" && customStart && customEnd) {
        params.append("startDate", customStart);
        params.append("endDate", customEnd);
      }
      const res = await api.get(`/voice/admin/agents/kpis?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAllAgentsKpis(res.data || []);
    } catch (err) { console.error("Failed to fetch all agents KPIs:", err); }
  };

  useEffect(() => { setKpiPage(0); }, [agentSearch, dateFilter, sortKey, sortDir]);

  useEffect(() => {
    if (!token || (!isAdmin && !isAgent)) return;
    setLoading(true);
    if (isAgent) {
      fetchOwnKPIs().finally(() => setLoading(false));
    } else if (isAdmin) {
      Promise.all([fetchOwnKPIs(), fetchAllAgentsKPIs()]).finally(() => setLoading(false));
    }
  }, [token, user, dateFilter, customStart, customEnd]);

  useEffect(() => {
    const handler = (e) => {
      if (datePickerRef.current && !datePickerRef.current.contains(e.target))
        setShowDatePicker(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (!user || (!isAgent && !isAdmin)) {
    return <div style={{ padding: 24, color: textPrimary }}>Access Denied</div>;
  }

  const getDisplayDate = () => {
    if (dateFilter === "custom" && customStart && customEnd) {
      return `${format(new Date(customStart), "dd MMM yyyy")} – ${format(new Date(customEnd), "dd MMM yyyy")}`;
    }
    return DATE_LABELS[dateFilter] || "Select Period";
  };

  // ── Filter
  const filteredAgents = useMemo(() => {
    const q = agentSearch.trim().toLowerCase();
    if (!q) return allAgentsKpis;
    return allAgentsKpis.filter((item) => {
      const agent = item.agent || {};
      const kpis  = item.kpis  || {};
      const dispoMatch = (kpis.dispositionStats || []).some(
        (d: any) => d.name?.toLowerCase().includes(q) || String(d.count).includes(q)
      );
      return (
        agent.name?.toLowerCase().includes(q)  ||
        agent.email?.toLowerCase().includes(q) ||
        agent.phoneNumber?.toLowerCase().includes(q) ||
        String(kpis.totalLeads  ?? "").includes(q) ||
        String(kpis.salesClosed ?? "").includes(q) ||
        String(kpis.totalCalls  ?? "").includes(q) ||
        String(kpis.totalTalkTimeMinutes ?? "").includes(q) ||
        dispoMatch
      );
    });
  }, [allAgentsKpis, agentSearch]);

  // ── Sort
  const sortedAgents = useMemo(() => {
    return [...filteredAgents].sort((a, b) => {
      let av: any, bv: any;
      if (sortKey === "name") {
        av = (a.agent?.name || "").toLowerCase();
        bv = (b.agent?.name || "").toLowerCase();
      } else {
        av = a.kpis?.[sortKey] ?? 0;
        bv = b.kpis?.[sortKey] ?? 0;
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ?  1 : -1;
      return 0;
    });
  }, [filteredAgents, sortKey, sortDir]);

  const pagedAgents = useMemo(
    () => sortedAgents.slice(kpiPage * KPI_PAGE_SIZE, (kpiPage + 1) * KPI_PAGE_SIZE),
    [sortedAgents, kpiPage]
  );
  const kpiPageCount = Math.ceil(sortedAgents.length / KPI_PAGE_SIZE);

  const maxCalls = useMemo(
    () => Math.max(...allAgentsKpis.map((a) => a.kpis?.totalCalls || 0), 1),
    [allAgentsKpis]
  );

  const toggleSort = (key: string) => {
    if (sortKey === key) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  // ─── Chart data ───────────────────────────────────────────────────────────
  const chartTextColor = isDark ? "#A0A0B0" : "#667085";
  const chartGridColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: chartTextColor, font: { size: 12 } },
      },
    },
    scales: {
      x: {
        ticks: { color: chartTextColor },
        grid: { color: chartGridColor },
      },
      y: {
        beginAtZero: true,
        ticks: { color: chartTextColor },
        grid: { color: chartGridColor },
      },
    },
  };

  const ownDispositionData = ownKpis
    ? {
        labels: ownKpis?.current?.dispositionStats?.map((d) => d.name) || [],
        datasets: [{
          label: "Leads by Disposition",
          data: ownKpis?.current?.dispositionStats?.map((d) => d.count) || [],
          backgroundColor: ownKpis?.current?.dispositionStats?.map((d) => d.color || "#3b82f6") || [],
          borderRadius: 6,
        }],
      }
    : null;

  const top8 = useMemo(
    () => [...allAgentsKpis].sort((a, b) => (b.kpis?.totalCalls || 0) - (a.kpis?.totalCalls || 0)).slice(0, 8),
    [allAgentsKpis]
  );

  const adminComparisonData = top8.length > 0
    ? {
        labels: top8.map((a) => a.agent?.name?.split(" ")[0] || "Agent"),
        datasets: [
          { label: "Total Calls",   data: top8.map((a) => a.kpis?.totalCalls  || 0), backgroundColor: "#5B5BD6", borderRadius: 6 },
          { label: "Sales Closed",  data: top8.map((a) => a.kpis?.salesClosed || 0), backgroundColor: "#10B981", borderRadius: 6 },
          { label: "Total Leads",   data: top8.map((a) => a.kpis?.totalLeads  || 0), backgroundColor: "#F59E0B", borderRadius: 6 },
        ],
      }
    : null;

  const thStyle = (key?: string): React.CSSProperties => ({
    padding: "10px 16px",
    textAlign: key === "name" || !key ? "left" : "center",
    fontSize: 11, fontWeight: 600,
    color: sortKey === key ? accentMain : textSecondary,
    letterSpacing: "0.05em", textTransform: "uppercase",
    whiteSpace: "nowrap", cursor: key ? "pointer" : "default",
    userSelect: "none",
    background: sortKey === key
      ? isDark ? "rgba(124,124,240,0.10)" : "#F5F3FF"
      : tableHeaderBg,
    borderBottom: `1px solid ${divider}`,
    transition: "background 0.12s",
  });

  return (
    <div style={{ minHeight: "100vh", background: pageBg, fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* ── Header ── */}
      <div style={{
        background: headerBg,
        borderBottom: `1px solid ${divider}`,
        backdropFilter: isDark ? "blur(24px)" : "none",
        padding: "20px 28px", display: "flex", alignItems: "center",
        justifyContent: "space-between", gap: 16, flexWrap: "wrap",
      }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: textPrimary, margin: 0, letterSpacing: "-0.02em" }}>
            {isAgent ? "Agent KPIs" : "Team KPIs"}
          </h1>
          <p style={{ color: textSecondary, fontSize: 13, margin: "2px 0 0" }}>{getDisplayDate()}</p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {/* Date filter */}
          <div ref={datePickerRef} style={{ position: "relative" }}>
            <button
              onClick={() => setShowDatePicker(!showDatePicker)}
              style={{
                display: "flex", alignItems: "center", gap: 7,
                padding: "8px 14px", background: cardBg,
                border: `1px solid ${borderColor}`, borderRadius: 8,
                cursor: "pointer", fontSize: 13, color: textMuted, fontWeight: 500,
              }}
            >
              <Filter size={14} style={{ color: textSecondary }} />
              {getDisplayDate()}
              <ChevronDown size={13} style={{
                color: textSecondary,
                transform: showDatePicker ? "rotate(180deg)" : "none",
                transition: "transform 0.2s",
              }} />
            </button>

            <AnimatePresence>
              {showDatePicker && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                  style={{
                    position: "absolute", top: "calc(100% + 6px)", right: 0,
                    background: dropdownBg,
                    border: `1px solid ${dropdownBorder}`,
                    borderRadius: 12,
                    boxShadow: isDark
                      ? "0 8px 32px rgba(0,0,0,0.60)"
                      : "0 8px 24px rgba(0,0,0,0.10)",
                    zIndex: 100, padding: 8, minWidth: 210,
                    backdropFilter: isDark ? "blur(24px)" : "none",
                  }}
                >
                  {["all", "today", "week", "month"].map((f) => (
                    <button key={f}
                      onClick={() => { setDateFilter(f); setShowDatePicker(false); setCustomStart(""); setCustomEnd(""); }}
                      style={{
                        display: "block", width: "100%", textAlign: "left",
                        padding: "8px 12px", borderRadius: 8, border: "none",
                        cursor: "pointer", fontSize: 13,
                        fontWeight: dateFilter === f ? 600 : 400,
                        background: dateFilter === f ? accentBg : "transparent",
                        color: dateFilter === f ? accentMain : textMuted,
                      }}
                    >
                      {DATE_LABELS[f]}
                    </button>
                  ))}

                  <button
                    onClick={() => setDateFilter("custom")}
                    style={{
                      display: "block", width: "100%", textAlign: "left",
                      padding: "8px 12px", borderRadius: 8, border: "none",
                      cursor: "pointer", fontSize: 13,
                      fontWeight: dateFilter === "custom" ? 600 : 400,
                      background: dateFilter === "custom" ? accentBg : "transparent",
                      color: dateFilter === "custom" ? accentMain : textMuted,
                    }}
                  >
                    Custom Range
                  </button>

                  {dateFilter === "custom" && (
                    <div style={{ padding: "10px 8px 4px", borderTop: `1px solid ${divider}`, marginTop: 4 }}>
                      <label style={{ fontSize: 11, color: textSecondary, fontWeight: 500, display: "block", marginBottom: 4 }}>Start Date</label>
                      <DateInput value={customStart} onChange={(val) => setCustomStart(val)} style={{ ...inputStyle, marginBottom: 8 }} />
                      <label style={{ fontSize: 11, color: textSecondary, fontWeight: 500, display: "block", marginBottom: 4 }}>End Date</label>
                      <DateInput value={customEnd} onChange={(val) => setCustomEnd(val)} style={{ ...inputStyle, marginBottom: 8 }} />
                      <button
                        onClick={() => { if (customStart && customEnd) setShowDatePicker(false); }}
                        disabled={!customStart || !customEnd}
                        style={{
                          width: "100%", padding: "7px", borderRadius: 7, border: "none",
                          background: customStart && customEnd ? accentMain : isDark ? "rgba(255,255,255,0.08)" : "#E5E7EB",
                          color: customStart && customEnd ? "#fff" : textSecondary,
                          fontSize: 12, fontWeight: 600,
                          cursor: customStart && customEnd ? "pointer" : "not-allowed",
                        }}
                      >
                        Apply Range
                      </button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Refresh button */}
          <button
            onClick={() => { if (isAgent) fetchOwnKPIs(); else Promise.all([fetchOwnKPIs(), fetchAllAgentsKPIs()]); }}
            disabled={loading}
            style={{
              width: 36, height: 36, borderRadius: 8,
              border: `1px solid ${borderColor}`,
              background: cardBg,
              cursor: loading ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: textMuted,
            }}
          >
            <RefreshCw size={16} style={{ animation: loading ? "spin 0.8s linear infinite" : "none", color: textSecondary }} />
          </button>
        </div>
      </div>

      <div style={{ padding: "24px 28px" }}>
        {loading ? (
          <div style={{ padding: "80px 0", textAlign: "center" }}>
            <div style={{
              width: 28, height: 28, borderRadius: "50%",
              border: `3px solid ${isDark ? "rgba(124,124,240,0.15)" : "#DBEAFE"}`,
              borderTopColor: accentMain,
              animation: "spin 0.7s linear infinite", margin: "0 auto 12px",
            }} />
            <p style={{ fontSize: 13, color: textSecondary, margin: 0 }}>Loading performance data...</p>
          </div>
        ) : (
          <>
            {/* ── Agent view ── */}
            {isAgent && ownKpis && (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
                  <StatCard title="Total Leads"  value={ownKpis?.current?.totalLeads || 0}  icon={User}   bg="#EFF6FF" tc="#4747C2" isDark={isDark} onClick={() => navigate(`/kpi-detail/totalLeads?filter=${dateFilter}`)} />
                  <StatCard title="Sales Closed" value={ownKpis?.current?.salesClosed || 0} icon={Award}  bg="#F0FDF4" tc="#15803D" isDark={isDark} onClick={() => navigate(`/kpi-detail/salesClosed?filter=${dateFilter}`)} />
                  <StatCard title="Total Calls"  value={ownKpis?.current?.totalCalls || 0}  icon={Phone}  bg="#FFF7ED" tc="#C2410C" isDark={isDark} onClick={() => navigate(`/kpi-detail/totalCalls?filter=${dateFilter}`)} />
                  <StatCard title="Dispositions" value={ownKpis?.current?.dispositionStats?.length || 0} icon={Target} bg="#F5F3FF" tc="#7C3AED" isDark={isDark} />
                
                 
                </div>

                {ownKpis?.current?.dispositionStats?.length > 0 && (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
                    {ownKpis.current.dispositionStats.map((dispo, idx) => (
                      <motion.div key={dispo.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }}>
                        <StatCard title={dispo.name} value={dispo.count} icon={Target} bg="#FFF7ED" tc="#EA580C" isDark={isDark}
                          onClick={() => navigate(`/kpi-detail/disposition?dispositionId=${dispo.id}&filter=${dateFilter}`)} />
                      </motion.div>
                    ))}
                  </div>
                )}

                <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 12, overflow: "hidden", marginBottom: 24 }}>
                  <div style={{ padding: "14px 20px", borderBottom: `1px solid ${divider}`, display: "flex", alignItems: "center", gap: 8 }}>
                    <BarChart3 size={16} style={{ color: textSecondary }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: textMuted }}>Performance Overview</span>
                  </div>
                  <div style={{ padding: 20, height: 320 }}>
                    {ownDispositionData
                      ? <Bar data={ownDispositionData} options={{ ...chartOptions, plugins: { ...chartOptions.plugins, legend: { display: false } } }} />
                      : <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: textSecondary, fontSize: 13 }}>No chart data available</div>
                    }
                  </div>
                </div>
              </>
            )}

            {/* ── Admin view ── */}
            {isAdmin && (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
                  <StatCard title="Agents"       value={allAgentsKpis.length} icon={User}   bg="#EFF6FF" tc="#4747C2" isDark={isDark} />
                  <StatCard title="Total Leads"  value={allAgentsKpis.reduce((a, c) => a + (c?.kpis?.totalLeads  || 0), 0)} icon={Target} bg="#F5F3FF" tc="#7C3AED" isDark={isDark} />
                  <StatCard title="Sales Closed" value={allAgentsKpis.reduce((a, c) => a + (c?.kpis?.salesClosed || 0), 0)} icon={Award}  bg="#F0FDF4" tc="#15803D" isDark={isDark} />
                  <StatCard title="Total Calls"  value={allAgentsKpis.reduce((a, c) => a + (c?.kpis?.totalCalls  || 0), 0)} icon={Phone}  bg="#FFF7ED" tc="#C2410C" isDark={isDark} />
               <StatCard
                  title="Talk Time"
                  value={formatTalkTime(
                    allAgentsKpis.reduce((a, c) => a + (c?.kpis?.totalTalkTime || 0), 0)
                  )}
                  icon={Clock}
                  bg="#EFF6FF"
                  tc="#2563EB"
                  isDark={isDark}
                />
                </div>

                {/* ── Agents table ── */}
                <div style={{ background: tableBg, border: `1px solid ${cardBorder}`, borderRadius: 12, overflow: "hidden", marginBottom: 24 }}>

                  {/* Table toolbar */}
                  <div style={{
                    padding: "12px 16px", borderBottom: `1px solid ${divider}`,
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    gap: 12, flexWrap: "wrap", background: tableHeaderBg,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: textPrimary }}>All Agents</span>
                      <span style={{
                        fontSize: 11.5, fontWeight: 700,
                        color: agentSearch ? accentMain : textSecondary,
                        background: agentSearch ? accentBg : badgeBg,
                        border: `1px solid ${agentSearch ? "rgba(124,124,240,0.20)" : cardBorder}`,
                        borderRadius: 20, padding: "2px 10px", transition: "all 0.15s",
                      }}>
                        {filteredAgents.length}{agentSearch && allAgentsKpis.length !== filteredAgents.length ? ` / ${allAgentsKpis.length}` : ""} agent{filteredAgents.length !== 1 ? "s" : ""}
                      </span>
                      <span style={{ fontSize: 11, color: textSecondary, display: "flex", alignItems: "center", gap: 4 }}>
                        <Phone size={11} /> Sorted by most calls
                      </span>
                    </div>

                    <div style={{ position: "relative", flex: "1 1 220px", maxWidth: 320 }}>
                      <Search size={13} style={{
                        position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)",
                        color: searchFocused ? accentMain : textSecondary,
                        pointerEvents: "none", transition: "color 0.15s",
                      }} />
                      <input
                        type="text" value={agentSearch}
                        onChange={(e) => setAgentSearch(e.target.value)}
                        onFocus={() => setSearchFocused(true)}
                        onBlur={() => setSearchFocused(false)}
                        placeholder="Search by name, phone, leads, sales…"
                        style={{
                          width: "100%",
                          border: `1.5px solid ${searchFocused ? accentMain : inputBorder}`,
                          borderRadius: 10, background: inputBg,
                          padding: "7px 32px 7px 30px",
                          fontSize: 12.5, fontWeight: 500,
                          color: textPrimary, outline: "none",
                          fontFamily: "'Inter',-apple-system,sans-serif",
                          boxShadow: searchFocused ? `0 0 0 3px ${accentBg}` : "none",
                          transition: "all 0.15s", boxSizing: "border-box",
                        }}
                      />
                      {agentSearch && (
                        <button onClick={() => setAgentSearch("")}
                          style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 2, display: "flex", alignItems: "center", color: textSecondary }}>
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  </div>

                  {allAgentsKpis.length === 0 ? (
                    <div style={{ padding: "60px 0", textAlign: "center" }}>
                      <User size={32} style={{ color: isDark ? "rgba(255,255,255,0.12)" : "#D0D5DD", margin: "0 auto 10px", display: "block" }} />
                      <p style={{ fontSize: 14, fontWeight: 600, color: textPrimary, margin: "0 0 4px" }}>No agent performance data available</p>
                      <p style={{ fontSize: 13, color: textSecondary, margin: 0 }}>Try adjusting your date filter</p>
                    </div>
                  ) : filteredAgents.length === 0 ? (
                    <div style={{ padding: "48px 0", textAlign: "center" }}>
                      <Search size={28} style={{ color: isDark ? "rgba(255,255,255,0.12)" : "#D0D5DD", margin: "0 auto 10px", display: "block" }} />
                      <p style={{ fontSize: 14, fontWeight: 600, color: textPrimary, margin: "0 0 4px" }}>No agents match "{agentSearch}"</p>
                      <p style={{ fontSize: 13, color: textSecondary, margin: "0 0 12px" }}>Try a different name, number, or value</p>
                      <button onClick={() => setAgentSearch("")}
                        style={{ fontSize: 12.5, fontWeight: 700, color: accentMain, background: accentBg, border: `1px solid rgba(124,124,240,0.20)`, borderRadius: 8, padding: "6px 16px", cursor: "pointer" }}>
                        Clear search
                      </button>
                    </div>
                  ) : (
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                          <tr>
                            <th style={{ ...thStyle(), width: 50, textAlign: "center" }}>#</th>
                            <th style={thStyle("name")} onClick={() => toggleSort("name")}>
                              Agent <SortIcon col="name" sortKey={sortKey} dir={sortDir} />
                            </th>
                            <th style={{ ...thStyle("totalCalls") }} onClick={() => toggleSort("totalCalls")}>
                              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                                <Phone size={11} /> Calls
                                <SortIcon col="totalCalls" sortKey={sortKey} dir={sortDir} />
                              </span>
                            </th>
                            <th style={{ ...thStyle("totalTalkTime") }} onClick={() => toggleSort("totalTalkTime")}>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                            <Clock size={11} /> Talk Time
                            <SortIcon col="totalTalkTime" sortKey={sortKey} dir={sortDir} />
                          </span>
                        </th>
                            <th style={thStyle("totalLeads")} onClick={() => toggleSort("totalLeads")}>
                              Leads <SortIcon col="totalLeads" sortKey={sortKey} dir={sortDir} />
                            </th>
                            <th style={thStyle("salesClosed")} onClick={() => toggleSort("salesClosed")}>
                              Sales <SortIcon col="salesClosed" sortKey={sortKey} dir={sortDir} />
                            </th>
                            <th style={thStyle("successRate")} onClick={() => toggleSort("successRate")}>
                              Rate% <SortIcon col="successRate" sortKey={sortKey} dir={sortDir} />
                            </th>
                            {(allAgentsKpis[0]?.kpis?.dispositionStats || []).map((d) => (
                              <th key={d.id} style={thStyle()}>{d.name}</th>
                            ))}
                            <th style={{ ...thStyle(), width: 40 }} />
                          </tr>
                        </thead>

                        <tbody>
                          {pagedAgents.map((item, idx) => {
                            const globalRank = sortedAgents.findIndex((a) => a.agent.id === item.agent.id) + 1;
                            const isTopCaller = globalRank === 1 && sortKey === "totalCalls";
                            const topCallerBg = isDark ? "rgba(124,124,240,0.07)" : "rgba(91,91,214,0.03)";

                            return (
                              <motion.tr
                                key={item.agent.id}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: idx * 0.03 }}
                                style={{
                                  borderTop: `1px solid ${tableRowBorder}`,
                                  background: isTopCaller ? topCallerBg : "transparent",
                                  transition: "background 0.12s",
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = tableRowHover; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = isTopCaller ? topCallerBg : "transparent"; }}
                              >
                                <td style={{ padding: "12px 16px", textAlign: "center" }}>
                                  <RankBadge rank={globalRank} />
                                </td>

                                <td style={{ padding: "12px 16px", whiteSpace: "nowrap" }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                    <div style={{
                                      width: 34, height: 34, borderRadius: "50%",
                                      background: isTopCaller
                                        ? isDark ? "rgba(124,124,240,0.20)" : "#EDE9FE"
                                        : isDark ? "rgba(71,71,194,0.15)" : "#EFF6FF",
                                      color: isTopCaller
                                        ? isDark ? "#A78BFA" : "#7C3AED"
                                        : isDark ? "#7C7CF0" : "#4747C2",
                                      display: "flex", alignItems: "center", justifyContent: "center",
                                      fontSize: 12, fontWeight: 700, flexShrink: 0,
                                      border: isTopCaller
                                        ? isDark ? "2px solid rgba(167,139,250,0.40)" : "2px solid #C4B5FD"
                                        : "none",
                                    }}>
                                      {(item.agent.name || "A").split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                                    </div>
                                    <span style={{ fontSize: 13, fontWeight: 600, color: textPrimary }}>
                                      {item.agent.name || "—"}
                                    </span>
                                  </div>
                                </td>

                                <td style={{ padding: "12px 16px" }}>
                                  <CallBar value={item.kpis?.totalCalls || 0} max={maxCalls} isDark={isDark} />
                                </td>
                             
<td style={{ padding: "12px 16px", textAlign: "center", whiteSpace: "nowrap" }}>
  <span style={{
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    fontSize: 12,
    fontWeight: 700,
    color: isDark ? "#BFDBFE" : "#1D4ED8",
    background: isDark ? "rgba(37,99,235,0.14)" : "#EFF6FF",
    border: `1px solid ${isDark ? "rgba(96,165,250,0.20)" : "#DBEAFE"}`,
    padding: "4px 9px",
    borderRadius: 999,
  }}>
    <Clock size={12} />
    {formatTalkTime(item.kpis?.totalTalkTime || 0)}
  </span>
</td>
                                <td style={{ padding: "12px 16px", textAlign: "center", fontSize: 13, color: textMuted, cursor: "pointer" }}
                                  onClick={() => navigate(`/admin/kpi-detail/totalLeads?agentId=${item.agent.id}&filter=${dateFilter}${dateFilter === "custom" ? `&startDate=${customStart}&endDate=${customEnd}` : ""}`)}>
                                  {item.kpis?.totalLeads || 0}
                                </td>

                                <td style={{ padding: "12px 16px", textAlign: "center", fontSize: 13, color: "#16A34A", fontWeight: 700, cursor: "pointer" }}
                                  onClick={() => navigate(`/admin/kpi-detail/salesClosed?agentId=${item.agent.id}&filter=${dateFilter}${dateFilter === "custom" ? `&startDate=${customStart}&endDate=${customEnd}` : ""}`)}>
                                  {item.kpis?.salesClosed || 0}
                                </td>

                                <td style={{ padding: "12px 16px", textAlign: "center" }}>
                                  <span style={{
                                    fontSize: 12, fontWeight: 700,
                                    color: (item.kpis?.successRate || 0) >= 50 ? "#059669" : textSecondary,
                                    background: (item.kpis?.successRate || 0) >= 50
                                      ? isDark ? "rgba(5,150,105,0.15)" : "#ECFDF5"
                                      : badgeBg,
                                    padding: "2px 8px", borderRadius: 99,
                                  }}>
                                    {item.kpis?.successRate || 0}%
                                  </span>
                                </td>

                                {(item.kpis?.dispositionStats || []).map((d) => (
                                  <td key={d.id} style={{ padding: "12px 16px", textAlign: "center", fontSize: 13, color: textMuted, cursor: "pointer" }}
                                    onClick={() => navigate(`/admin/kpi-detail/disposition?agentId=${item.agent.id}&dispositionId=${d.id}&filter=${dateFilter}`)}>
                                    {d.count}
                                  </td>
                                ))}

                                <td style={{ padding: "12px 16px", textAlign: "right" }}>
                                  <ChevronRight size={14} style={{ color: isDark ? "rgba(255,255,255,0.20)" : "#D0D5DD" }} />
                                </td>
                              </motion.tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Pagination */}
                  {sortedAgents.length > KPI_PAGE_SIZE && (
                    <div style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "12px 20px", borderTop: `1px solid ${divider}`,
                      flexWrap: "wrap", gap: 8,
                    }}>
                      <span style={{ fontSize: 12, color: textSecondary }}>
                        Showing{" "}
                        <strong style={{ color: textPrimary }}>{kpiPage * KPI_PAGE_SIZE + 1}</strong>
                        {" – "}
                        <strong style={{ color: textPrimary }}>{Math.min((kpiPage + 1) * KPI_PAGE_SIZE, sortedAgents.length)}</strong>
                        {" of "}
                        <strong style={{ color: textPrimary }}>{sortedAgents.length}</strong>
                        {agentSearch && <span style={{ color: accentMain, fontWeight: 600 }}> (filtered)</span>}
                      </span>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <button onClick={() => setKpiPage((p) => Math.max(0, p - 1))} disabled={kpiPage === 0}
                          style={{ width: 30, height: 30, borderRadius: 7, border: `1px solid ${cardBorder}`, background: cardBg, cursor: kpiPage === 0 ? "not-allowed" : "pointer", opacity: kpiPage === 0 ? 0.4 : 1, display: "flex", alignItems: "center", justifyContent: "center", color: textMuted }}>
                          <ArrowLeft size={13} />
                        </button>
                        <span style={{ padding: "4px 12px", borderRadius: 7, background: paginationBg, color: accentMain, fontSize: 12, fontWeight: 700 }}>
                          {kpiPage + 1} / {kpiPageCount}
                        </span>
                        <button onClick={() => setKpiPage((p) => Math.min(kpiPageCount - 1, p + 1))} disabled={kpiPage >= kpiPageCount - 1}
                          style={{ width: 30, height: 30, borderRadius: 7, border: `1px solid ${cardBorder}`, background: cardBg, cursor: kpiPage >= kpiPageCount - 1 ? "not-allowed" : "pointer", opacity: kpiPage >= kpiPageCount - 1 ? 0.4 : 1, display: "flex", alignItems: "center", justifyContent: "center", color: textMuted }}>
                          <ArrowRight size={13} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Chart */}
                {adminComparisonData && (
                  <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 12, overflow: "hidden" }}>
                    <div style={{ padding: "14px 20px", borderBottom: `1px solid ${divider}`, display: "flex", alignItems: "center", gap: 8 }}>
                      <TrendingUp size={16} style={{ color: textSecondary }} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: textMuted }}>Top 8 Agents — Calls, Sales & Leads</span>
                      <span style={{ fontSize: 11, color: textSecondary, marginLeft: "auto" }}>sorted by most calls</span>
                    </div>
                    <div style={{ padding: 20, height: 340 }}>
                      <Bar data={adminComparisonData} options={chartOptions} />
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {!loading && (
          <div style={{ marginTop: 18, textAlign: "center", fontSize: 12, color: textSecondary }}>
            Data reflects leads, calls, follow-ups and sales in selected time range • Last updated {format(new Date(), "dd MMM yyyy hh:mm a")}
          </div>
        )}
      </div>
    </div>
  );
}