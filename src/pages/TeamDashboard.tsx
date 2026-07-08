// src/pages/TeamDashboard.tsx
//@ts-nocheck
import React, { useState, useEffect } from "react";
import Select from "react-select";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, LineChart, Line, ResponsiveContainer,
} from "recharts";
import {
  Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed,
  Voicemail, Users, TrendingUp, BarChart3, Calendar,
  UserCheck, UserX, PhoneCall, Edit, Plus, X, Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import api from "../api";
import { toast } from "react-hot-toast";
import { io } from "socket.io-client";
import { API_URL } from "../main";
import { useNavigate } from "react-router-dom";
import LiveCallForAgent from "../components/LiveCallForAgent";
import { useTheme } from "../context/ThemeContext";

export default function TeamDashboard() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const dateRangeOptions = [
    { value: "today", label: "Today" },
    { value: "yesterday", label: "Yesterday" },
    { value: "week", label: "This Week" },
    { value: "month", label: "This Month" },
  ];

  // ── Theme Colors ──
  const textPrimary = isDark ? "#F0F0F5" : "#0D0D12";
  const textMuted = isDark ? "#68687A" : "#9E9EAD";
  const cardBg = isDark ? "rgba(20,20,28,0.98)" : "#fff";
  const cardBorder = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)";
  const bgPage = isDark ? "#0A0A0F" : "#F6F7F9";
  const accentMain = isDark ? "#7C7CF0" : "#5B5BD6";

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const token = localStorage.getItem("token") || "";
  const navigate = useNavigate();

  const [selectedTeam, setSelectedTeam] = useState<any>(null);
  const [teamsOptions, setTeamsOptions] = useState<any[]>([]);
  const [selectedDateRange, setSelectedDateRange] = useState(dateRangeOptions[2]);
  const [selectedAgent, setSelectedAgent] = useState({ value: "all", label: "All Agents" });
  const [agentsOptions, setAgentsOptions] = useState([{ value: "all", label: "All Agents" }]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedAgentToAdd, setSelectedAgentToAdd] = useState<any>(null);
  const [allAgents, setAllAgents] = useState<any[]>([]);
  const [removingAgentId, setRemovingAgentId] = useState<any>(null);
  const [dashboardData, setDashboardData] = useState<any>({
    today: { dialed:0, received:0, answered:0, missed:0, connected:0, voicemail:0 },
    overall: { dialed:0, received:0, answered:0, missed:0, connected:0, voicemail:0 },
    liveCalls: [], weeklyTrend: [], agentPerformance: [],
    agents: {
      totalAgents: 0,
      readyAgents: 0,
      notReadyAgents: 0,
      pausedAgents: 0,
      onCallAgents: 0,
      groups: {
        ready: [],
        notReady: [],
        paused: [],
        onCall: [],
      },
    },
  });
  const [loading, setLoading] = useState(true);
  const [monitorCall, setMonitorCall] = useState<any>(null);
  const [calls, setCalls] = useState<any[]>([]);

  const priv = selectedTeam?.privileges || dashboardData?.privileges || {};



  const selectStyles = {
    control: (p: any, s: any) => ({
      ...p,
      border: `1px solid ${isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.10)"}`,
      borderRadius: 10,
      padding: "2px 4px",
      boxShadow: s.isFocused ? `0 0 0 3px ${isDark ? "rgba(124,124,240,0.2)" : "rgba(91,91,214,0.15)"}` : "none",
      "&:hover": { borderColor: isDark ? "rgba(124,124,240,0.35)" : "rgba(91,91,214,0.35)" },
      minHeight: 40,
      background: isDark ? "rgba(255,255,255,0.08)" : "#F6F7F9",
      color: textPrimary,
      fontSize: 13.5,
    }),
    menu: (p: any) => ({
      ...p,
      borderRadius: 10,
      boxShadow: isDark ? "0 12px 32px rgba(0,0,0,0.5)" : "0 12px 32px rgba(0,0,0,0.12)",
      zIndex: 99999,
      background: cardBg,
      border: `1px solid ${cardBorder}`,
    }),
    option: (p: any, s: any) => ({
      ...p,
      background: s.isSelected ? accentMain : s.isFocused ? (isDark ? "rgba(124,124,240,0.15)" : "#F0F0FF") : cardBg,
      color: s.isSelected ? "#fff" : textPrimary,
      fontSize: 13.5,
      padding: "9px 14px",
    }),
    placeholder: (p: any) => ({ ...p, color: textMuted, fontSize: 13.5 }),
    singleValue: (p: any) => ({ ...p, color: textPrimary, fontSize: 13.5 }),
  };

  /* StatCard */
  function StatCard({ label, value, icon: Icon, accent, onClick }: any) {
    return (
      <motion.div
        whileHover={{ scale: 1.02, y: -2 }}
        whileTap={{ scale: 0.98 }}
        onClick={onClick}
        style={{
          background: cardBg,
          border: `1px solid ${cardBorder}`,
          borderRadius: 16,
          padding: "18px 20px",
          cursor: onClick ? "pointer" : "default",
          position: "relative",
          overflow: "visible",
        }}
      >
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, borderRadius: "16px 16px 0 0", background: accent }} />
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: `${accent}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Icon size={20} color={accent} />
          </div>
          <div>
            <p style={{ margin: "0 0 2px", fontSize: 11.5, fontWeight: 700, color: textMuted, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</p>
            <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: textPrimary, letterSpacing: "-0.4px" }}>{value}</p>
          </div>
        </div>
      </motion.div>
    );
  }

  function ChartTooltip({ active, payload, label }: any) {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background: cardBg, borderRadius: 10, border: `1px solid ${cardBorder}`, boxShadow: isDark ? "0 8px 24px rgba(0,0,0,0.4)" : "0 8px 24px rgba(0,0,0,0.10)", padding: "10px 14px" }}>
        <p style={{ margin: "0 0 6px", fontSize: 12, fontWeight: 700, color: textMuted }}>{label}</p>
        {payload.map((e: any) => (
          <p key={e.dataKey} style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: e.color }}>
            {e.name}: <span style={{ color: textPrimary }}>{e.value}</span>
          </p>
        ))}
      </div>
    );
  }
  const fetchTeamAgentStatusOverview = async () => {
    if (!selectedTeam?.value) return;
  
    try {
      const res = await api.get(`/auth/team/${selectedTeam.value}/agent-status-overview`);
  
      if (res.data?.success) {
        setDashboardData((prev: any) => ({
          ...prev,
          agents: {
            totalAgents: res.data.liveStats?.totalAgents || 0,
            readyAgents: res.data.liveStats?.readyAgents || 0,
            notReadyAgents: res.data.liveStats?.notReadyAgents || 0,
            pausedAgents: res.data.liveStats?.pausedAgents || 0,
            onCallAgents: res.data.liveStats?.onCallAgents || 0,
            groups: {
              ready: res.data.agents?.ready || [],
              notReady: res.data.agents?.notReady || [],
              paused: res.data.agents?.paused || [],
              onCall: res.data.agents?.onCall || [],
            },
          },
        }));
      }
    } catch (err: any) {
      console.error("Failed to fetch team agent status overview:", err);
    }
  };
  /* Load Teams */
  useEffect(() => {
    if (user?.supervisedTeams?.length > 0) {
      const options = user.supervisedTeams.map((team: any) => ({
        value: team.id, label: team.name,
        description: team.description,
        privileges: team.privileges?.[0] || {},
      }));
      setTeamsOptions(options);
      if (options.length >= 1) setSelectedTeam(options[0]);
    } else {
      toast.error("You don't have access to the team dashboard");
      navigate("/dashboard");
    }
  }, []);

  /* Load Agents */
  useEffect(() => {
    if (!selectedTeam?.value) return;
    api.get(`/voice/team/${selectedTeam.value}/agents`)
      .then(res => {
        if (res.data.success) {
          const opts = res.data.data.map((u: any) => ({ value: u.id, label: u.name }));
          setAgentsOptions([{ value: "all", label: "All Agents" }, ...opts]);
          setSelectedAgent({ value: "all", label: "All Agents" });
        }
      })
      .catch(() => toast.error("Failed to load team agents"));
  }, [selectedTeam]);

  const fetchData = async () => {
    if (!selectedTeam?.value) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("dateRange", selectedDateRange.value);
      if (selectedAgent.value !== "all") params.append("agentId", selectedAgent.value);
      const res = await api.get(`/voice/team/${selectedTeam.value}/dashboard?${params}`);
      
      if (res.data.success) {
        
         setDashboardData((prev)=>({...prev, overall : res.data.data.overall,liveCalls: res.data.data.liveCalls}));
      }
    } catch {
      toast.error("Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    fetchTeamAgentStatusOverview();
  }, [selectedTeam, selectedDateRange, selectedAgent]);

  useEffect(() => {
    if (!selectedTeam?.value) return;
    api.get(`/voice/team/${selectedTeam.value}/fetch/live-calls`)
      .then(res => setCalls(res.data || []))
      .catch(() => {});
  }, [selectedTeam]);

  /* Socket Logic */
  useEffect(() => {
    if (!priv.listenLiveCalls) return;
    const socket = io(API_URL, { transports: ["websocket"] });
    socket.on("new-live-call", (call: any) => {
      if (call.agentTeamId === selectedTeam?.value) {
        setDashboardData((prev: any) => ({ ...prev, liveCalls: [...(prev.liveCalls || []), call] }));
      }
    });
    socket.on("live-call-ended", ({ conferenceName }: any) => {
      setDashboardData((prev: any) => ({
        ...prev,
        liveCalls: prev.liveCalls?.filter((c: any) => c.conferenceName !== conferenceName) || [],
      }));
      if (monitorCall?.conferenceName === conferenceName) setMonitorCall(null);
    });
    return () => socket.disconnect();
  }, [priv.listenLiveCalls, selectedTeam]);

  useEffect(() => {
    if (!selectedTeam?.value) return;
  
    const socket = io(API_URL, {
      path: "/socket.io",
      transports: ["websocket"],
      auth: { token },
    });
  
    socket.emit("join-team", { teamId: selectedTeam.value });
  
    socket.on("agentStatusUpdate", (payload: any) => {
      if (Number(payload.teamId) !== Number(selectedTeam.value)) return;
  
      setDashboardData((prev: any) => ({
        ...prev,
        agents: {
          totalAgents: payload.liveStats?.totalAgents || 0,
          readyAgents: payload.liveStats?.readyAgents || 0,
          notReadyAgents: payload.liveStats?.notReadyAgents || 0,
          pausedAgents: payload.liveStats?.pausedAgents || 0,
          onCallAgents: payload.liveStats?.onCallAgents || 0,
          groups: {
            ready: payload.agents?.ready || [],
            notReady: payload.agents?.notReady || [],
            paused: payload.agents?.paused || [],
            onCall: payload.agents?.onCall || [],
          },
        },
      }));
    });
  
    return () => {
      socket.emit("leave-team", { teamId: selectedTeam.value });
      socket.off("agentStatusUpdate");
      socket.disconnect();
    };
  }, [selectedTeam?.value, token]);

  const fetchAvailableAgents = async () => {
    try {
      const res = await api.get("/auth/all");
      const teamIds = new Set(dashboardData?.agents?.list?.map((a: any) => a.id) || []);
      setAllAgents(res.data.filter((u: any) => !teamIds.has(u.id) && u.role === "AGENT" && u.id !== user?.id));
    } catch { toast.error("Failed to load available agents"); }
  };

  const handleOpenAddModal = () => {
    fetchAvailableAgents();
    setShowAddModal(true);
    setSelectedAgentToAdd(null);
  };

  const handleAddAgent = async () => {
    if (!selectedAgentToAdd) return toast.error("Select an agent");
    const { id: agentId, name: agentName } = selectedAgentToAdd;
    setDashboardData((prev: any) => ({
      ...prev,
      agents: { ...prev.agents, list: [...(prev.agents?.list || []), { id: agentId, name: agentName, status: "AVAILABLE" }], total: (prev.agents?.total || 0) + 1 },
    }));
    try {
      await api.patch(`/voice/team/${selectedTeam.value}/assign-agent`, { agentId });
      toast.success(`${agentName} added to team`);
      setShowAddModal(false);
    } catch {
      toast.error("Failed to add agent");
      setDashboardData((prev: any) => ({
        ...prev,
        agents: { ...prev.agents, list: prev.agents.list.filter((a: any) => a.id !== agentId), total: prev.agents.total - 1 },
      }));
    }
  };

  const handleRemoveAgent = (agentId: any, agentName: string) => {
    toast.custom((t) => (
      <RemoveToast name={agentName} t={t} onConfirm={async () => {
        setRemovingAgentId(agentId);
        setDashboardData((prev: any) => ({
          ...prev,
          agents: { ...prev.agents, list: prev.agents.list.filter((a: any) => a.id !== agentId), total: prev.agents.total - 1 },
        }));
        try {
          await api.patch(`/voice/team/${selectedTeam.value}/remove-agent`, { agentId });
          toast.success(`${agentName} removed`);
        } catch {
          toast.error("Failed to remove agent");
          fetchData();
        } finally { setRemovingAgentId(null); }
      }} />
    ), { duration: Infinity });
  };

  // const handleAgentStatClick = (status: string) => {
  //   const params = new URLSearchParams({ status, dateRange: selectedDateRange.value });
  //   if (selectedAgent?.value !== "all") params.append("agentId", selectedAgent.value);
  //   navigate(`/team/${selectedTeam.value}/agents?${params}`);
  // };

  const handleAgentStatClick = (status: string) => {
    const params = new URLSearchParams({
      status,
      dateRange: selectedDateRange.value,
    });
  
    if (selectedAgent?.value !== "all") {
      params.append("agentId", String(selectedAgent.value));
    }
  
    navigate(`/team/${selectedTeam.value}/agents/status/${status}?${params}`);
  };
  const handleCallStatClick = (type: string) => {
    if (!selectedTeam?.value) return;
  
    const params = new URLSearchParams({
      type,
      dateRange: selectedDateRange.value,
    });
  
    if (selectedAgent?.value !== "all") {
      params.append("agentId", String(selectedAgent.value));
    }
  
    navigate(`/team/${selectedTeam.value}/calls?${params.toString()}`);
  };
  return (
    <div style={{ minHeight: "100vh", background: bgPage, fontFamily: "'Inter', -apple-system, sans-serif", paddingBottom: 48 }}>

      {/* Header */}
      <div style={{ background: isDark ? "#1A1A24" : "linear-gradient(135deg, #5B5BD6 0%, #4747C2 100%)", padding: "20px 24px", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 46, height: 46, borderRadius: 13, background: "rgba(255,255,255,0.18)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <BarChart3 size={24} color="#fff" />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#fff", letterSpacing: "-0.3px" }}>Supervisor Dashboard</h1>
              <p style={{ margin: 0, fontSize: 12.5, color: "rgba(255,255,255,0.75)" }}>Real-time team performance & call analytics</p>
            </div>
          </div>

          <div style={{ width: 280 }}>
            <Select
              options={teamsOptions}
              value={selectedTeam}
              onChange={setSelectedTeam}
              placeholder="Select Team…"
              styles={selectStyles}
            />
          </div>
        </div>
      </div>

      <div style={{ padding: "0 24px" }}>
        {priv?.manageAgentStatus && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 20 }}>
            <StatCard
  label="Total Agents"
  value={dashboardData?.agents?.totalAgents || 0}
  icon={Users}
  accent={accentMain}
  onClick={() => handleAgentStatClick("total")}
/>

<StatCard
  label="Ready"
  value={dashboardData?.agents?.readyAgents || 0}
  icon={UserCheck}
  accent="#10B981"
  onClick={() => handleAgentStatClick("ready")}
/>

<StatCard
  label="Not Ready"
  value={dashboardData?.agents?.notReadyAgents || 0}
  icon={UserX}
  accent="#EF4444"
  onClick={() => handleAgentStatClick("not-ready")}
/>

<StatCard
  label="On Call"
  value={dashboardData?.agents?.onCallAgents || 0}
  icon={PhoneCall}
  accent="#F59E0B"
  onClick={() => handleAgentStatClick("oncall")}
/>

<StatCard
  label="Paused"
  value={dashboardData?.agents?.pausedAgents || 0}
  icon={UserX}
  accent="#D38A00"
  onClick={() => handleAgentStatClick("paused")}
/>
          </div>
        )}

        {selectedTeam && (
          <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 16, padding: "18px 20px", marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 14 }}>
              <div style={{ display: "flex", gap: 14, flexWrap: "wrap", flex: 1 }}>
                <div style={{ minWidth: 200 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, fontWeight: 700, color: textMuted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
                    <Calendar size={12} /> Date Range
                  </label>
                  <Select options={dateRangeOptions} value={selectedDateRange} onChange={setSelectedDateRange} styles={selectStyles} />
                </div>
                <div style={{ minWidth: 200 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, fontWeight: 700, color: textMuted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
                    <Users size={12} /> Agent
                  </label>
                  <Select options={agentsOptions} value={selectedAgent} onChange={setSelectedAgent} styles={selectStyles} />
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {priv.editTeamSettings && (
                  <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    onClick={() => navigate("/team/edit/" + selectedTeam.value)}
                    style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 18px", borderRadius: 10, border: "none", background: accentMain, color: "#fff", fontWeight: 700, fontSize: 13.5, cursor: "pointer" }}>
                    <Edit size={14} /> Edit Team
                  </motion.button>
                )}
                {priv.addMembers && (
                  <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    onClick={handleOpenAddModal}
                    style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 18px", borderRadius: 10, border: "none", background: "#10B981", color: "#fff", fontWeight: 700, fontSize: 13.5, cursor: "pointer" }}>
                    <Plus size={14} /> Add Member
                  </motion.button>
                )}
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "80px 0" }}>
            <div style={{ textAlign: "center" }}>
              <Loader2 size={40} color={accentMain} style={{ animation: "spin 0.7s linear infinite" }} />
              <p style={{ margin: "12px 0 0", fontSize: 14, color: textMuted }}>Loading team dashboard…</p>
            </div>
          </div>
        ) : !selectedTeam ? (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <p style={{ fontSize: 18, fontWeight: 800, color: textPrimary }}>Select a Team</p>
            <p style={{ color: textMuted }}>Choose a team from the dropdown above</p>
          </div>
        ) : (
          <>
            {priv.listenLiveCalls && (
              <div style={{ marginBottom: 20 }}>
            
                <LiveCallForAgent calls={calls} teamId={selectedTeam?.value} />
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 20 }}>
              {[
                { type: "dialed", label: "Dialed", icon: PhoneOutgoing, accent: "#8B5CF6", key: "dialed" },
                { type: "received", label: "Received", icon: PhoneIncoming, accent: "#06B6D4", key: "received" },
                { type: "answered", label: "Answered", icon: Phone, accent: "#10B981", key: "answered" },
                { type: "missed", label: "Missed", icon: PhoneMissed, accent: "#EF4444", key: "missed" },
                { type: "connected", label: "Connected", icon: Users, accent: accentMain, key: "connected" },
                { type: "voicemail", label: "Voicemail", icon: Voicemail, accent: "#F59E0B", key: "voicemail" },
              ].map(s => (
                <StatCard key={s.type} label={s.label} value={dashboardData?.overall?.[s.key] || 0} icon={s.icon} accent={s.accent} onClick={() => handleCallStatClick(s.type)} />
              ))}
            </div>

            {priv.monitorPerformance && dashboardData?.agentPerformance?.length > 0 && (
              <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 16, padding: "20px 20px 16px", marginBottom: 20 }}>
                <p style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700, color: textPrimary, display: "flex", alignItems: "center", gap: 8 }}>
                  <Users size={16} color={accentMain} /> Agent Performance
                </p>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={dashboardData.agentPerformance} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)"} vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: textMuted }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: textMuted }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="calls" name="Calls" fill={accentMain} radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {priv.viewDashboard && dashboardData?.weeklyTrend?.length > 0 && (
              <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 16, padding: "20px 20px 16px" }}>
                <p style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700, color: textPrimary, display: "flex", alignItems: "center", gap: 8 }}>
                  <TrendingUp size={16} color={accentMain} /> Weekly Call Trend
                </p>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={dashboardData.weeklyTrend} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)"} vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: textMuted }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: textMuted }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 12, color: textMuted, paddingTop: 10 }} />
                    <Line type="monotone" dataKey="calls" name="Total Calls" stroke={accentMain} strokeWidth={2.5} dot={{ r: 4, fill: accentMain }} />
                    <Line type="monotone" dataKey="answered" name="Answered" stroke="#10B981" strokeWidth={2} dot={{ r: 3, fill: "#10B981" }} />
                    <Line type="monotone" dataKey="missed" name="Missed" stroke="#EF4444" strokeWidth={2} dot={{ r: 3, fill: "#EF4444" }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        )}
      </div>

      {/* Add Member Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, background: isDark ? "rgba(0,0,0,0.75)" : "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 20 }}
            onClick={(e) => { if (e.target === e.currentTarget) setShowAddModal(false); }}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 20 }}
              style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 20, padding: "28px 28px 24px", width: "100%", maxWidth: 440, boxShadow: isDark ? "0 24px 60px rgba(0,0,0,0.6)" : "0 24px 60px rgba(0,0,0,0.18)" }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: isDark ? "rgba(124,124,240,0.15)" : "rgba(91,91,214,0.10)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Plus size={18} color={accentMain} />
                  </div>
                  <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: textPrimary }}>Add Agent to Team</h3>
                </div>
                <button onClick={() => setShowAddModal(false)} style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${cardBorder}`, background: cardBg, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                  <X size={15} color={textMuted} />
                </button>
              </div>

              <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: textMuted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Select Agent</label>
              <Select
                options={allAgents.map((a: any) => ({ value: a.id, label: `${a.name} (${a.email})`, agent: a }))}
                value={selectedAgentToAdd ? { value: selectedAgentToAdd.id, label: `${selectedAgentToAdd.name} (${selectedAgentToAdd.email})` } : null}
                onChange={(opt: any) => setSelectedAgentToAdd(opt ? allAgents.find((a: any) => a.id === opt.value) : null)}
                placeholder="Choose an agent…"
                isClearable
                styles={selectStyles}
              />

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 22 }}>
                <button onClick={() => setShowAddModal(false)} style={{ padding: "9px 20px", borderRadius: 10, border: `1px solid ${cardBorder}`, background: cardBg, color: textMuted, fontWeight: 700, fontSize: 13.5, cursor: "pointer" }}>
                  Cancel
                </button>
                <button onClick={handleAddAgent} disabled={!selectedAgentToAdd} style={{ padding: "9px 24px", borderRadius: 10, border: "none", background: selectedAgentToAdd ? accentMain : "#94A3B8", color: "#fff", fontWeight: 700, fontSize: 13.5, cursor: selectedAgentToAdd ? "pointer" : "not-allowed" }}>
                  Add Agent
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* RemoveToast */
function RemoveToast({ name, onConfirm, onCancel, t }: any) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  return (
    <div style={{ background: isDark ? "#1C1C24" : "#fff", borderRadius: 14, padding: "18px 20px", boxShadow: isDark ? "0 12px 36px rgba(0,0,0,0.4)" : "0 12px 36px rgba(0,0,0,0.16)", border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`, maxWidth: 340 }}>
      <p style={{ margin: "0 0 6px", fontWeight: 700, fontSize: 14, color: isDark ? "#F0F0F5" : "#0D0D12" }}>Remove Agent</p>
      <p style={{ margin: "0 0 16px", fontSize: 13, color: isDark ? "#A3A3B0" : "#6B6B7B" }}>Remove <strong>{name}</strong> from the team?</p>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button onClick={() => { toast.dismiss(t.id); onCancel?.(); }} style={{ padding: "7px 16px", borderRadius: 8, border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`, background: isDark ? "#2A2A34" : "#F6F7F9", color: isDark ? "#D1D1DB" : "#6B6B7B", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
          Cancel
        </button>
        <button onClick={() => { toast.dismiss(t.id); onConfirm(); }} style={{ padding: "7px 16px", borderRadius: 8, border: "none", background: "#EF4444", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
          Remove
        </button>
      </div>
    </div>
  );
}