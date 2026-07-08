// src/pages/AdminCallStatus.tsx
// @ts-nocheck
import React, { useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import { useNavigate, useParams } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";
import {
  ArrowLeft, Search, Users, UserCheck, UserX, Phone,
  Mail, Globe, Clock, Monitor, Wifi, WifiOff, Activity,
  Loader2, PhoneCall,
} from "lucide-react";
import api from "../api";
import { API_URL } from "../main";
import { useAuth } from "../context/AuthContext";
import LiveCallsTable from "../components/LiveCallsTable";

type PageId = "total" | "ready" | "not-ready" | "paused" | "oncall";

function useLocalTheme(): "dark" | "light" {
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    try { return (localStorage.getItem("theme") as "dark" | "light") || "light" }
    catch { return "light" }
  });
  useEffect(() => {
    const iv = setInterval(() => {
      try {
        const v = localStorage.getItem("theme") as "dark" | "light" | null;
        if (v === "dark" || v === "light") setTheme(v);
      } catch {}
    }, 500);
    return () => clearInterval(iv);
  }, []);
  return theme;
}

function getTokens(isDark: boolean) {
  return {
    TEXT:         isDark ? "#F0F0F8"                           : "#0D0D12",
    MUTED:        isDark ? "#7070A0"                           : "#9E9EAD",
    MUTED2:       isDark ? "#A0A0B8"                           : "#6B6B7B",
    CARD_BG:      isDark ? "#1A1A2E"                           : "#ffffff",
    CARD_BORDER:  isDark ? "rgba(255,255,255,0.08)"            : "rgba(0,0,0,0.07)",
    CARD_SHADOW:  isDark
      ? "0 4px 24px rgba(0,0,0,0.50), 0 0 0 1px rgba(255,255,255,0.05)"
      : "0 4px 24px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.04)",
    INPUT_BG:     isDark ? "#0F0F18"                           : "#F6F7F9",
    INPUT_BORDER: isDark ? "rgba(255,255,255,0.10)"            : "rgba(0,0,0,0.10)",
    SURFACE2:     isDark ? "#1E1E32"                           : "rgba(246,247,249,0.90)",
    ROW_ALT:      isDark ? "rgba(255,255,255,0.02)"            : "rgba(246,247,249,0.45)",
    ROW_HOVER:    isDark ? "rgba(91,91,214,0.07)"              : "rgba(91,91,214,0.04)",
    TH_BG:        isDark ? "rgba(22,22,40,0.95)"               : "rgba(246,247,249,0.95)",
    TH_COLOR:     isDark ? "#6A6A90"                           : "#9E9EAD",
    STAT_BG:      isDark ? "#1E1E32"                           : "#F6F7F9",
    BACK_BTN_BG:  isDark ? "#1A1A2E"                           : "#ffffff",
    BACK_BTN_H:   isDark ? "#22223A"                           : "#F6F7F9",
  };
}

function initials(name = "") {
  const w = name.trim().split(/\s+/);
  return w.length >= 2 ? (w[0][0] + w[1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
}

function fmtTime(v: any) {
  if (!v) return "—";
  try { return new Date(v).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); }
  catch { return "—"; }
}
function fmtDateTime(v: any) {
  if (!v) return "—";
  try {
    const d = new Date(v);
    const today = new Date();
    const isToday = d.toDateString() === today.toDateString();
    return isToday
      ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : d.toLocaleDateString([], { month: "short", day: "numeric" }) + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch { return "—"; }
}

const PAGE_META: Record<PageId, { title: string; sub: string; Icon: any; color: string; activeBg: string }> = {
  total:       { title: "All agents",    sub: "Complete team roster",             Icon: Users,     color: "#5B5BD6", activeBg: "rgba(91,91,214,0.10)"  },
  ready:       { title: "Ready agents",  sub: "Logged in today and available",    Icon: UserCheck, color: "#17A363", activeBg: "rgba(23,163,99,0.10)"   },
  "not-ready": { title: "Not ready",     sub: "No active session today",          Icon: UserX,     color: "#D0281A", activeBg: "rgba(208,40,26,0.10)"   },
  paused:      { title: "Paused agents", sub: "Logged in but on break",           Icon: Clock,     color: "#D38A00", activeBg: "rgba(211,138,0,0.10)"   },
  oncall:      { title: "On call",       sub: "Agents currently in active calls", Icon: PhoneCall, color: "#5B5BD6", activeBg: "rgba(91,91,214,0.10)"  },
};

function StatusBadge({ agent, isDark }: any) {
  const { status, todayLoggedIn } = agent;
  type Cfg = { label: string; color: string; bg: string; Icon: any };
  let cfg: Cfg = { label: "Not ready", color: "#D0281A", bg: isDark ? "rgba(208,40,26,0.15)" : "#FEE2E2", Icon: WifiOff };
  if (todayLoggedIn && status === "AVAILABLE") cfg = { label: "Ready",   color: "#17A363", bg: isDark ? "rgba(23,163,99,0.15)"  : "#DCFCE7", Icon: Wifi     };
  if (todayLoggedIn && status === "PAUSED")    cfg = { label: "Paused",  color: "#D38A00", bg: isDark ? "rgba(211,138,0,0.15)" : "#FEF3C7", Icon: Clock    };
  if (todayLoggedIn && status === "ON_CALL")   cfg = { label: "On call", color: "#5B5BD6", bg: isDark ? "rgba(91,91,214,0.15)" : "#EDEDFB", Icon: PhoneCall };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 9px", borderRadius: 99, fontSize: 11.5, fontWeight: 700, background: cfg.bg, color: cfg.color, whiteSpace: "nowrap" }}>
      <cfg.Icon size={10} /> {cfg.label}
    </span>
  );
}

function AgentAvatar({ name, status, todayLoggedIn, isDark }: any) {
  let bg = isDark ? "rgba(255,255,255,0.06)" : "#F0F0F0";
  let fg = isDark ? "#7070A0" : "#9E9EAD";
  if (todayLoggedIn && status === "AVAILABLE") { bg = isDark ? "rgba(23,163,99,0.18)"  : "#DCFCE7"; fg = "#17A363"; }
  if (todayLoggedIn && status === "PAUSED")    { bg = isDark ? "rgba(211,138,0,0.18)" : "#FEF3C7"; fg = "#D38A00"; }
  if (todayLoggedIn && status === "ON_CALL")   { bg = isDark ? "rgba(91,91,214,0.18)" : "#EDEDFB"; fg = "#5B5BD6"; }
  return (
    <div style={{ width: 34, height: 34, borderRadius: "50%", flexShrink: 0, background: bg, color: fg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, border: `1.5px solid ${fg}35` }}>
      {initials(name)}
    </div>
  );
}

export default function AdminCallStatus() {
  const params    = useParams();
  const navigate  = useNavigate();
  const { token } = useAuth();

  const id     = (params.id || "total") as PageId;
  const theme  = useLocalTheme();
  const isDark = theme === "dark";
  const tk     = useMemo(() => getTokens(isDark), [isDark]);
  const meta   = PAGE_META[id] || PAGE_META.total;

  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [liveCalls, setLiveCalls]   = useState<any[]>([]);
  const [liveStats, setLiveStats]   = useState<any>(null);
  const [agentGroups, setAgentGroups] = useState({ ready: [], notReady: [], paused: [], onCall: [] });

  /* ── styles ── */
  const card: React.CSSProperties = useMemo(() => ({
    background: tk.CARD_BG,
    backdropFilter: "blur(24px) saturate(180%)",
    WebkitBackdropFilter: "blur(24px) saturate(180%)",
    borderRadius: 18,
    border: `1px solid ${tk.CARD_BORDER}`,
    boxShadow: tk.CARD_SHADOW,
  }), [tk]);

  const thStyle: React.CSSProperties = {
    padding: "10px 14px",
    textAlign: "left",
    fontSize: 10.5,
    fontWeight: 700,
    color: tk.TH_COLOR,
    textTransform: "uppercase",
    letterSpacing: "0.07em",
    background: tk.TH_BG,
    borderBottom: `1px solid ${tk.CARD_BORDER}`,
    whiteSpace: "nowrap",
  };

  /* ── data normalizer ── */
  const normalizeOverview = (payload: any) => {
    if (payload?.liveStats)  setLiveStats(payload.liveStats);
    if (payload?.agents) {
      setAgentGroups({
        ready:    payload.agents.ready    || [],
        notReady: payload.agents.notReady || [],
        paused:   payload.agents.paused   || [],
        onCall:   payload.agents.onCall   || [],
      });
    }
  };

  /* ── initial fetch ── */
  useEffect(() => {
    if (!token) return;
    setLoading(true);
    const fetches: Promise<any>[] = [
      api.get("/auth/agent-status-overview").then(r => normalizeOverview(r.data)).catch(() => {}),
    ];
    if (id === "oncall") {
      fetches.push(api.get("/voice/admin/live-calls").then(r => setLiveCalls(r.data?.data || [])).catch(() => {}));
    }
    Promise.all(fetches).finally(() => setLoading(false));
  }, [token, id]);

  /* ── socket ── */
  useEffect(() => {
    if (!token) return;
    const socket = io(API_URL, { path: "/socket.io", transports: ["websocket"], auth: { token } });
    socket.on("agentStatusUpdate",   normalizeOverview);
    socket.on("admin-live-calls",    (d: any[]) => { if (id === "oncall") setLiveCalls(d || []); });
    socket.on("admin-call-started",  ({ call }: any) => {
      if (id !== "oncall" || !call) return;
      setLiveCalls(p => p.some(c => c.conferenceName === call.conferenceName) ? p : [...p, call]);
    });
    // ✅ FIX #5: Handle new payload with type and reason fields
    socket.on("admin-call-ended",    ({ conferenceName, type, reason }: any) => {
      if (id !== "oncall") return;
      setLiveCalls(p => p.filter(c => c.conferenceName !== conferenceName));
    });
    return () => { socket.off("agentStatusUpdate"); socket.off("admin-live-calls"); socket.off("admin-call-started"); socket.off("admin-call-ended"); socket.disconnect(); };
  }, [token, id]);

  /* ── duration ticker ── */
  useEffect(() => {
    if (id !== "oncall") return;
    const iv = setInterval(() => setLiveCalls(p => p.map(c => ({ ...c, duration: Number(c.duration || 0) + 1 }))), 1000);
    return () => clearInterval(iv);
  }, [id]);

  /* ── computed data ── */
  const allAgents = useMemo(() => [
    ...agentGroups.ready,
    ...agentGroups.notReady,
    ...agentGroups.paused,
    ...agentGroups.onCall,
  ], [agentGroups]);

  const pageAgents: any[] = useMemo(() => {
    if (id === "total")     return allAgents;
    if (id === "ready")     return agentGroups.ready;
    if (id === "not-ready") return agentGroups.notReady;
    if (id === "paused")    return agentGroups.paused;
    if (id === "oncall")    return agentGroups.onCall;
    return [];
  }, [id, allAgents, agentGroups]);

  const filteredAgents = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return pageAgents;
    return pageAgents.filter((a: any) =>
      [a.name, a.email, a.phoneNumber, a.sipIdentity, a.latestSession?.ipAddress, a.latestSession?.deviceName]
        .filter(Boolean).join(" ").toLowerCase().includes(q)
    );
  }, [pageAgents, search]);

  const statCards = [
    { key: "total",     label: "Total",    count: liveStats?.totalAgents    ?? allAgents.length,        color: "#5B5BD6", Icon: Users     },
    { key: "ready",     label: "Ready",    count: liveStats?.readyAgents    ?? agentGroups.ready.length,    color: "#17A363", Icon: UserCheck },
    { key: "not-ready", label: "Not ready",count: liveStats?.notReadyAgents ?? agentGroups.notReady.length, color: "#D0281A", Icon: UserX    },
    { key: "paused",    label: "Paused",   count: liveStats?.pausedAgents   ?? agentGroups.paused.length,   color: "#D38A00", Icon: Clock    },
    { key: "oncall",    label: "On call",  count: liveStats?.onCallAgents   ?? agentGroups.onCall.length,   color: "#5B5BD6", Icon: PhoneCall },
  ];

  if (loading) return (
    <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", color: tk.TEXT, fontFamily: "'Inter',-apple-system,sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: tk.MUTED }}>
        <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
        Loading agent status…
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <>
      {/* <Toaster position="top-right" toastOptions={{ style: { fontFamily: "'Inter',sans-serif", borderRadius: 12, fontSize: 13.5 } }} /> */}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} tr:hover td{background:${tk.ROW_HOVER}!important}`}</style>

      <div style={{ fontFamily: "'Inter',-apple-system,sans-serif", padding: 24, maxWidth: 1200, margin: "0 auto", color: tk.TEXT }}>

        {/* ── Page header ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
          <button onClick={() => navigate(-1)}
            style={{ width: 38, height: 38, borderRadius: 12, background: tk.BACK_BTN_BG, border: `1px solid ${tk.CARD_BORDER}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: tk.MUTED, flexShrink: 0, transition: "all 0.14s" }}
            onMouseEnter={e => { e.currentTarget.style.background = tk.BACK_BTN_H; }}
            onMouseLeave={e => { e.currentTarget.style.background = tk.BACK_BTN_BG; }}>
            <ArrowLeft size={17} />
          </button>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: `${meta.color}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <meta.Icon size={20} color={meta.color} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: tk.TEXT, letterSpacing: "-0.025em" }}>{meta.title}</h1>
            <p style={{ margin: "3px 0 0", fontSize: 13, color: tk.MUTED }}>{meta.sub}</p>
          </div>
        </div>

        {/* ── Stat strip ── */}
       

        {/* ── On call: LiveCallsTable ── */}
        {id === "oncall" ? (
          <LiveCallsTable calls={liveCalls} />
        ) : (
          /* ── Agent table ── */
          <div style={card}>
            {/* toolbar */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderBottom: `1px solid ${tk.CARD_BORDER}`, flexWrap: "wrap" }}>
              <div style={{ position: "relative", flex: "1 1 260px", maxWidth: 380 }}>
                <Search size={14} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: tk.MUTED, pointerEvents: "none" }} />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search name, email, IP, browser…"
                  style={{ width: "100%", padding: "8px 12px 8px 32px", borderRadius: 10, border: `1px solid ${tk.INPUT_BORDER}`, background: tk.INPUT_BG, fontSize: 13, color: tk.TEXT, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }}
                  onFocus={e => { e.target.style.borderColor = "rgba(91,91,214,0.45)"; }}
                  onBlur={e => { e.target.style.borderColor = tk.INPUT_BORDER; }}
                />
              </div>
              <span style={{ marginLeft: "auto", fontSize: 12.5, color: tk.MUTED, fontWeight: 600 }}>
                {filteredAgents.length} agent{filteredAgents.length !== 1 ? "s" : ""}
              </span>
            </div>

            {/* empty */}
            {filteredAgents.length === 0 ? (
              <div style={{ minHeight: 260, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }}>
                <div style={{ width: 56, height: 56, borderRadius: 16, background: `${meta.color}14`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <meta.Icon size={24} color={meta.color} />
                </div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: tk.TEXT }}>{meta.title} — none found</p>
                <p style={{ margin: 0, fontSize: 13, color: tk.MUTED }}>Records appear here automatically when agent activity changes.</p>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
                  <colgroup>
                    <col style={{ width: 200 }} /><col style={{ width: 200 }} />
                    <col style={{ width: 110 }} /><col style={{ width: 220 }} />
                    <col style={{ width: 145 }} /><col style={{ width: 120 }} />
                    <col style={{ width: 130 }} />
                  </colgroup>
                  <thead>
                    <tr>
                      {["Agent", "Contact", "Status", "Device / browser", "IP address", "Login time", "Last seen"].map(h => (
                        <th key={h} style={thStyle}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAgents.map((agent: any, idx: number) => {
                      const sess = agent.latestSession || null;
                      return (
                        <tr key={agent.id}
                          style={{ borderBottom: `1px solid ${tk.CARD_BORDER}`, background: idx % 2 === 0 ? "transparent" : tk.ROW_ALT, transition: "background 0.1s" }}>

                          {/* Agent */}
                          <td style={{ padding: "13px 14px", overflow: "hidden" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <AgentAvatar name={agent.name} status={agent.status} todayLoggedIn={agent.todayLoggedIn} isDark={isDark} />
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: 13.5, fontWeight: 700, color: tk.TEXT, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{agent.name || "Unnamed"}</div>
                                <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2, fontSize: 11.5, color: tk.MUTED, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  <Activity size={10} /> {agent.sipIdentity || "No SIP"}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Contact */}
                          <td style={{ padding: "13px 14px" }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: tk.MUTED2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                <Mail size={11} color={tk.MUTED} style={{ flexShrink: 0 }} /> {agent.email || "—"}
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: tk.MUTED2 }}>
                                <Phone size={11} color={tk.MUTED} style={{ flexShrink: 0 }} /> {agent.phoneNumber || "—"}
                              </div>
                            </div>
                          </td>

                          {/* Status */}
                          <td style={{ padding: "13px 14px" }}>
                            <StatusBadge agent={agent} isDark={isDark} />
                          </td>

                          {/* Device */}
                          <td style={{ padding: "13px 14px" }}>
                            <div style={{ display: "flex", alignItems: "flex-start", gap: 7, fontSize: 12.5, color: tk.MUTED2, lineHeight: 1.4 }}>
                              <Monitor size={13} color={tk.MUTED} style={{ marginTop: 1, flexShrink: 0 }} />
                              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {sess?.deviceName || "No session today"}
                              </span>
                            </div>
                          </td>

                          {/* IP */}
                          <td style={{ padding: "13px 14px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: tk.MUTED2, fontFamily: "monospace" }}>
                              <Globe size={12} color={tk.MUTED} style={{ flexShrink: 0 }} />
                              {sess?.ipAddress || "—"}
                            </div>
                          </td>

                          {/* Login time */}
                          <td style={{ padding: "13px 14px", whiteSpace: "nowrap" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12.5, color: tk.MUTED2 }}>
                              <Clock size={11} color={tk.MUTED} style={{ flexShrink: 0 }} />
                              {fmtTime(sess?.createdAt)}
                            </div>
                          </td>

                          {/* Last seen */}
                          <td style={{ padding: "13px 14px", whiteSpace: "nowrap" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12.5, color: tk.MUTED2 }}>
                              <Wifi size={11} color={tk.MUTED} style={{ flexShrink: 0 }} />
                              {fmtDateTime(sess?.lastSeenAt)}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}