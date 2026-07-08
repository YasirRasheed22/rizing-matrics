// src/pages/AdminDashboard.tsx
//@ts-nocheck
import React, { useState, useEffect, useRef } from "react";
import Select from "react-select";
import io from "socket.io-client";
import {
  Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed, Voicemail,
  Users, UserCheck, UserX, Clock, TrendingUp, BarChart3, PieChart, Activity,
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, PieChart as RechartsPieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import api from "../api";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { API_URL } from "../main";
import LiveCallsTable from "../components/LiveCallsTable";
import { useNavigate } from "react-router-dom";
import { DateInput } from "../components/ui/AppDatePicker";

const dateRangeOptions = [
  { value: "today",     label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "week",      label: "This Week" },
  { value: "month",     label: "This Month" },
  // { value: "custom",    label: "Custom Range" },
];

type ChartView = "line" | "bar" | "donut";

export default function AdminDashboard() {
  const { token,user,forceLogoutLocal } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const navigate = useNavigate();

  // ── Design tokens ──
  const textPrimary   = isDark ? "#F0F0F5"                  : "#0D0D12";
  const textSecondary = isDark ? "#A0A0B0"                  : "#6B6B7B";
  const textMuted     = isDark ? "#68687A"                  : "#9E9EAD";
  const accentMain    = isDark ? "#7C7CF0"                  : "#5B5BD6";
  const accentBg      = isDark ? "rgba(124,124,240,0.12)"   : "rgba(91,91,214,0.10)";
  const cardBg        = isDark ? "rgba(23,23,31,0.92)"      : "rgba(255,255,255,0.90)";
  const cardBorder    = isDark ? "rgba(255,255,255,0.07)"   : "rgba(255,255,255,0.60)";
  const cardShadow    = isDark
    ? "0 4px 24px rgba(0,0,0,0.40), 0 0 0 1px rgba(255,255,255,0.04)"
    : "0 4px 24px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.04)";
  const inputBg       = isDark ? "rgba(30,30,42,0.90)"      : "#F6F7F9";
  const inputBorder   = isDark ? "rgba(255,255,255,0.09)"   : "rgba(0,0,0,0.09)";
  const divider       = isDark ? "rgba(255,255,255,0.06)"   : "rgba(0,0,0,0.06)";
  const filterTextBg  = isDark ? "rgba(255,255,255,0.04)"   : "transparent";
  const sectionLabel  = isDark ? "#68687A"                  : "#9E9EAD";
  const chartToggleBg = isDark ? "rgba(255,255,255,0.06)"   : "#F6F7F9";
  const chartBtnActive= isDark ? "rgba(255,255,255,0.10)"   : "#fff";
  const chartGridClr  = isDark ? "rgba(255,255,255,0.06)"   : "rgba(0,0,0,0.06)";
  const chartTickClr  = isDark ? "#68687A"                  : "#9E9EAD";
  const tooltipStyle  = {
    borderRadius: 12,
    border: isDark ? "1px solid rgba(255,255,255,0.09)" : "1px solid rgba(0,0,0,0.08)",
    background: isDark ? "rgba(23,23,31,0.98)" : "#fff",
    color: textPrimary,
    boxShadow: isDark ? "0 8px 24px rgba(0,0,0,0.50)" : "0 8px 24px rgba(0,0,0,0.10)",
  };
  const retryBtnBg    = isDark ? "rgba(208,40,26,0.15)"     : "#FEE2E2";

  const card: React.CSSProperties = {
    background: cardBg,
    backdropFilter: "blur(24px) saturate(180%)",
    WebkitBackdropFilter: "blur(24px) saturate(180%)",
    borderRadius: 18, border: `1px solid ${cardBorder}`, boxShadow: cardShadow,
    fontFamily: "'Inter', -apple-system, sans-serif",
  };

  const inputStyle: React.CSSProperties = {
    padding: "8px 12px", borderRadius: 10,
    border: `1px solid ${inputBorder}`, background: inputBg,
    fontSize: 13, color: textPrimary, outline: "none", fontFamily: "inherit",
    width: "100%", boxSizing: "border-box",
  };

  const selectStyles = {
    control: (p: any, s: any) => ({
      ...p,
      border: `1px solid ${s.isFocused ? (isDark ? "rgba(124,124,240,0.40)" : "rgba(91,91,214,0.40)") : inputBorder}`,
      borderRadius: 10, padding: "1px 4px", minHeight: 38,
      background: inputBg,
      boxShadow: s.isFocused ? `0 0 0 3px ${isDark ? "rgba(124,124,240,0.15)" : "rgba(91,91,214,0.10)"}` : "none",
      "&:hover": { borderColor: isDark ? "rgba(124,124,240,0.30)" : "rgba(91,91,214,0.30)" },
      fontFamily: "inherit", fontSize: 13,
    }),
    menu: (p: any) => ({
      ...p, borderRadius: 12,
      boxShadow: isDark ? "0 12px 28px rgba(0,0,0,0.60)" : "0 12px 28px rgba(0,0,0,0.12)",
      zIndex: 9999, marginTop: 4,
      background: isDark ? "rgba(23,23,31,0.98)" : "#fff",
      border: isDark ? "1px solid rgba(255,255,255,0.09)" : "none",
    }),
    option: (p: any, s: any) => ({
      ...p,
      background: s.isSelected ? accentMain : s.isFocused ? (isDark ? "rgba(124,124,240,0.10)" : "rgba(91,91,214,0.07)") : "transparent",
      color: s.isSelected ? "#fff" : textPrimary, fontSize: 13, padding: "9px 14px",
    }),
    singleValue: (p: any) => ({ ...p, color: textPrimary, fontSize: 13 }),
    placeholder: (p: any) => ({ ...p, color: isDark ? "#3A3A4A" : "#9E9EAD", fontSize: 13 }),
    dropdownIndicator: (p: any) => ({ ...p, color: textMuted }),
    input: (p: any) => ({ ...p, color: textPrimary }),
    indicatorSeparator: () => ({ display: "none" }),
  };

  const sectionLabelStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 700, color: sectionLabel,
    textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12,
  };

  const [selectedDateRange, setSelectedDateRange] = useState(dateRangeOptions[0]);
  const [selectedAgent, setSelectedAgent]         = useState<any>({ value: "all", label: "All Agents" });
  const [agents, setAgents]                       = useState<any[]>([{ value: "all", label: "All Agents" }]);
  const [liveCalls, setLiveCalls]                 = useState<any[]>([]);
  const [showCustomRange, setShowCustomRange]     = useState(false);
  const [customStart, setCustomStart]             = useState("");
  const [customEnd, setCustomEnd]                 = useState("");
  const [chartView, setChartView]                 = useState<ChartView>("line");
  const [liveStats, setLiveStats]                 = useState<any>(null);
  const [callStats, setCallStats]                 = useState<any>(null);
  const [chartData, setChartData]                 = useState<any[]>([]);
  const [donutData, setDonutData]                 = useState<any[]>([]);
  const [loading, setLoading]                     = useState(true);
  const [error, setError]                         = useState<string | null>(null);
  const messageSocketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!token) return;
  
    const socket = io(API_URL, {
      path: "/socket.io",
      transports: ["websocket"],
      autoConnect: true,
      auth: { token },
    });
    const messageSocket = io(API_URL, {
      auth: { token },
      transports: ["websocket"],
      reconnectionAttempts: 5,
      reconnectionDelay: 3000,
    });

    messageSocketRef.current = messageSocket;
    messageSocket.emit("join-user-room", { userId: user.id });

    socket.on("connect", () => {
      console.log("Admin dashboard socket connected:", socket.id);
    });
    messageSocket.on("force_logout", () => {
      localStorage.removeItem("token");
        localStorage.removeItem("user");
  
        
  
        if (forceLogoutLocal) {
          forceLogoutLocal();
        } else {
          window.location.href = "/#/login";
        }
    });
  
    socket.on("agentStatusUpdate", (payload: any) => {
     
      if (payload?.liveStats) {
        setLiveStats(payload.liveStats);
      }
  
      /**
       * Optional:
       * Agar backend agents groups bhi bhej raha hai,
       * future mein ready/notReady list ke liye yahan store kar sakte ho.
       */
      // if (payload?.agents) {
      //   setLiveAgentGroups(payload.agents);
      // }
    });
  
    socket.on("admin-live-calls", (data: any[]) => {
      setLiveCalls(data || []);
    });
  
    socket.on("admin-call-started", (data: any) => {
      if (!data?.call) return;
  
      setLiveCalls((prev) => {
        const exists = prev.some(
          (call) => call.conferenceName === data.call.conferenceName
        );
  
        if (exists) return prev;
  
        return [...prev, data.call];
      });
    });
  
    // ✅ FIX #6: Handle new payload with type and reason fields
    socket.on("admin-call-ended", ({ conferenceName, type, reason }: any) => {
      setLiveCalls((prev) =>
        prev.filter((call) => call.conferenceName !== conferenceName)
      );
    });
  
    socket.on("disconnect", () => {
      console.log("Admin dashboard socket disconnected");
    });
  
    return () => {
      socket.off("connect");
      socket.off("agentStatusUpdate");
      socket.off("admin-live-calls");
      socket.off("admin-call-started");
      socket.off("admin-call-ended");
      socket.off("disconnect");
      messageSocket.emit("leave-user-room", { userId: user.id });
      messageSocket.disconnect();
      messageSocketRef.current = null;
  
      socket.disconnect();
    };
  }, [token]);

  useEffect(() => {
    const t = setInterval(() => setLiveCalls((p) => p.map((c) => ({ ...c, duration: c.duration + 1 }))), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!token) return;
  
    api.get("/auth/agent-status-overview").then((res) => {
      setLiveStats(res.data.liveStats);
    });
  
    api.get("/auth/available").then((res) => {
      const opts = res.data.map((a: any) => ({
        value: a.id,
        label: a.name,
      }));
  
      setAgents([{ value: "all", label: "All Agents" }, ...opts]);
    });
  }, [token]);

  useEffect(() => {
    if (!token) return;
    setLoading(true); setError(null);
    const params = new URLSearchParams();
    params.append("dateRange", selectedDateRange.value);
    if (selectedDateRange.value === "custom" && customStart && customEnd) {
      params.append("customStart", customStart);
      params.append("customEnd", customEnd);
    }
    if (selectedAgent.value !== "all") params.append("agentId", selectedAgent.value);
    Promise.all([
      api.get(`/voice/dashboard/call-stats?${params}`, { headers: { Authorization: `Bearer ${token}` } }),
      api.get(`/voice/dashboard/charts?${params}`,     { headers: { Authorization: `Bearer ${token}` } }),
    ]).then(([statusRes, chartsRes]) => {
      const stats = statusRes.data.callStats;
      setCallStats(stats);
      setChartData(chartsRes.data.lineBarData || []);
      setDonutData([
        { name: "Dialed",    value: stats.dialed,        color: isDark ? "#7C7CF0" : "#5B5BD6" },
        { name: "Answered",  value: stats.answered,      color: "#17A363" },
        { name: "Missed",    value: stats.missed,        color: "#D0281A" },
        { name: "Voicemail", value: stats.voicemail || 0, color: "#D38A00" },
      ]);
    }).catch((err: any) => {
      setError(err.response?.data?.message || "Failed to load dashboard data");
    }).finally(() => setLoading(false));
  }, [token, selectedDateRange, selectedAgent, customStart, customEnd]);

  useEffect(() => { setShowCustomRange(selectedDateRange.value === "custom"); }, [selectedDateRange]);

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", flexDirection: "column", gap: 16 }}>
      <div style={{ width: 40, height: 40, border: `3px solid ${isDark ? "rgba(124,124,240,0.15)" : "rgba(91,91,214,0.15)"}`, borderTopColor: accentMain, borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
      <span style={{ fontSize: 14, color: textMuted, fontFamily: "inherit" }}>Loading dashboard…</span>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (error) return (
    <div style={{ padding: 24, fontFamily: "inherit" }}>
      <div style={{ ...card, padding: 32, textAlign: "center" }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#D0281A" }}>Error</div>
        <div style={{ fontSize: 13, color: textSecondary, marginTop: 8 }}>{error}</div>
        <button onClick={() => window.location.reload()} style={{ marginTop: 20, padding: "9px 22px", borderRadius: 10, background: accentMain, color: "#fff", border: "none", fontWeight: 600, cursor: "pointer", fontSize: 13 }}>
          Retry
        </button>
      </div>
    </div>
  );

  const liveStatCards = liveStats ? [
    { label: "Total", value: liveStats.totalAgents, icon: Phone, color: isDark ? "#7C7CF0" : "#5B5BD6", bg: isDark ? "rgba(124,124,240,0.15)" : "#EDEDFB", route: "/admin/agents/status/total" },
    { label: "Ready", value: liveStats.readyAgents, icon: UserCheck, color: "#17A363", bg: isDark ? "rgba(23,163,99,0.15)" : "#DCFCE7", route: "/admin/agents/status/ready" },
    { label: "Not Ready", value: liveStats?.notReadyAgents, icon: UserX, color: "#D0281A", bg: isDark ? "rgba(208,40,26,0.15)" : "#FEE2E2", route: "/admin/agents/status/not-ready" },
    { label: "Paused", value: liveStats.pausedAgents, icon: UserX, color: "#D38A00", bg: isDark ? "rgba(211,138,0,0.15)" : "#FEF3C7", route: "/admin/agents/status/paused" },
    { label: "On Call", value: liveStats.onCallAgents, icon: Phone, color: isDark ? "#7C7CF0" : "#5B5BD6", bg: isDark ? "rgba(124,124,240,0.15)" : "#EDEDFB", route: "/admin/agents/status/oncall" },
  ] : [];

  const callStatCards = callStats ? [
    { label: "Dialed",    value: callStats.dialed,    icon: PhoneOutgoing, color: isDark ? "#7C7CF0" : "#5B5BD6", bg: isDark ? "rgba(124,124,240,0.15)" : "#EDEDFB" },
    { label: "Received",  value: callStats.received,  icon: PhoneIncoming, color: "#17A363", bg: isDark ? "rgba(23,163,99,0.15)"  : "#DCFCE7" },
    { label: "Answered",  value: callStats.answered,  icon: Phone,         color: "#0D9488", bg: isDark ? "rgba(13,148,136,0.15)" : "#F0FDFA" },
    { label: "Missed",    value: callStats.missed,    icon: PhoneMissed,   color: "#D0281A", bg: isDark ? "rgba(208,40,26,0.15)"  : "#FEE2E2" },
    { label: "Connected", value: callStats.connected, icon: Users,         color: "#A21CAF", bg: isDark ? "rgba(162,28,175,0.15)" : "#FDF4FF" },
    { label: "Voicemail", value: callStats.voicemail, icon: Voicemail,     color: "#D38A00", bg: isDark ? "rgba(211,138,0,0.15)"  : "#FEF3C7" },
  ] : [];

  return (
    <div style={{ padding: 24, fontFamily: "'Inter', -apple-system, sans-serif", display: "flex", flexDirection: "column", gap: 20 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Page header */}
      <div>
        <div style={{ fontSize: 22, fontWeight: 700, color: textPrimary, letterSpacing: "-0.03em" }}>Admin Dashboard</div>
        <div style={{ fontSize: 13, color: textMuted, marginTop: 3 }}>Real-time & historical call centre analytics</div>
      </div>

      {/* Live agent status */}
      
      {liveStats && (
        <div>
          <div style={sectionLabelStyle}>Live Agent Status</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
            {liveStatCards.map((item) => (
              <div key={item.label} onClick={() => navigate(item.route)}
                style={{ ...card, padding: "16px 20px", cursor: "pointer", display: "flex", alignItems: "center", gap: 14, transition: "transform 0.14s, box-shadow 0.14s" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLDivElement).style.boxShadow = isDark ? "0 8px 28px rgba(0,0,0,0.50)" : "0 8px 28px rgba(0,0,0,0.11)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLDivElement).style.boxShadow = cardShadow; }}
              >
                <div style={{ width: 44, height: 44, borderRadius: 12, background: item.bg, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <item.icon size={20} style={{ color: item.color }} />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{item.label}</div>
                  <div style={{ fontSize: 26, fontWeight: 700, color: textPrimary, lineHeight: 1.2, marginTop: 2 }}>{item.value}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter bar */}
      <div style={{ ...card, padding: "16px 20px" }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 14, flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 160px", minWidth: 160 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: textMuted, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Date Range</div>
            <Select options={dateRangeOptions} value={selectedDateRange} onChange={(opt: any) => setSelectedDateRange(opt)} styles={selectStyles} menuPortalTarget={document.body} />
          </div>
          {showCustomRange && (<>
            <div style={{ flex: "1 1 130px" }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: textMuted, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>From</div>
              <DateInput value={customStart} onChange={(val) => setCustomStart(val)} style={inputStyle} />
            </div>
            <div style={{ flex: "1 1 130px" }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: textMuted, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>To</div>
              <DateInput value={customEnd} onChange={(val) => setCustomEnd(val)} style={inputStyle} />
            </div>
          </>)}
          <div style={{ flex: "1 1 160px", minWidth: 160 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: textMuted, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>Agent</div>
            <Select options={agents} value={selectedAgent} onChange={setSelectedAgent} styles={selectStyles} menuPortalTarget={document.body} />
          </div>
        </div>
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${divider}`, fontSize: 12, color: textMuted }}>
          Showing: <strong style={{ color: accentMain }}>{selectedDateRange.label}</strong>
          {showCustomRange && customStart && customEnd && <span style={{ color: accentMain }}> ({customStart} → {customEnd})</span>}
          {" · "}
          <strong style={{ color: accentMain }}>{selectedAgent.label}</strong>
        </div>
      </div>

      {/* Call stats */}
      {callStats && (
        <div>
          <div style={sectionLabelStyle}>Call Statistics</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
            {callStatCards.map((stat) => (
              <div key={stat.label} style={{ ...card, padding: "14px 18px", display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: stat.bg, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <stat.icon size={17} style={{ color: stat.color }} />
                </div>
                <div>
                  <div style={{ fontSize: 10.5, color: textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{stat.label}</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: textPrimary, marginTop: 1 }}>{stat.value ?? 0}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chart */}
      <div style={{ ...card, padding: "20px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <TrendingUp size={18} style={{ color: accentMain }} />
            <div style={{ fontSize: 14, fontWeight: 700, color: textPrimary }}>
              {selectedAgent.value === "all" ? "Team Performance Overview" : `${selectedAgent.label}'s Performance`}
            </div>
          </div>
          <div style={{ display: "flex", background: chartToggleBg, borderRadius: 10, padding: 4, gap: 2 }}>
            {([
              { type: "line",  icon: Activity  },
              { type: "bar",   icon: BarChart3  },
              { type: "donut", icon: PieChart   },
            ] as const).map((btn) => (
              <button key={btn.type} onClick={() => setChartView(btn.type)}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 34, height: 34, borderRadius: 8, border: "none", background: chartView === btn.type ? chartBtnActive : "transparent", color: chartView === btn.type ? accentMain : textMuted, cursor: "pointer", boxShadow: chartView === btn.type ? (isDark ? "0 1px 4px rgba(0,0,0,0.40)" : "0 1px 4px rgba(0,0,0,0.10)") : "none", transition: "all 0.12s" }}>
                <btn.icon size={16} />
              </button>
            ))}
          </div>
        </div>
        <div style={{ height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            {chartView === "line" ? (
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGridClr} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: chartTickClr }} />
                <YAxis tick={{ fontSize: 11, fill: chartTickClr }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ color: textSecondary }} />
                <Line type="monotone" dataKey="dialed"   stroke={isDark ? "#7C7CF0" : "#5B5BD6"} strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="answered" stroke="#17A363" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="missed"   stroke="#D0281A" strokeWidth={2.5} dot={false} />
              </LineChart>
            ) : chartView === "bar" ? (
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGridClr} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: chartTickClr }} />
                <YAxis tick={{ fontSize: 11, fill: chartTickClr }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ color: textSecondary }} />
                <Bar dataKey="dialed"   fill={isDark ? "#7C7CF0" : "#5B5BD6"} radius={[4, 4, 0, 0]} />
                <Bar dataKey="answered" fill="#17A363" radius={[4, 4, 0, 0]} />
                <Bar dataKey="missed"   fill="#D0281A" radius={[4, 4, 0, 0]} />
              </BarChart>
            ) : (
              <RechartsPieChart>
                <Pie data={donutData} cx="50%" cy="50%" innerRadius={80} outerRadius={130} paddingAngle={5} dataKey="value">
                  {donutData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ color: textSecondary }} />
              </RechartsPieChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}