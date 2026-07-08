// src/pages/SupervisorAgentReportPage.tsx
// @ts-nocheck

import React, { useState, useEffect, useMemo } from "react";
import {
  User,
  Mail,
  Phone,
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  X,
  Users,
  UserCheck,
  UserX,
  Clock,
  Wifi,
  WifiOff,
  Monitor,
  Globe,
  Smartphone,
  Activity,
  Loader2,
} from "lucide-react";
import { motion } from "framer-motion";
import { useSearchParams, useParams, useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import api from "../api";
import { toast } from "react-hot-toast";
import { useTheme } from "../context/ThemeContext";
import { API_URL } from "../main";

/* ───────────────────────────────────────────── */

const PAGE_SIZE = 10;

const AVATAR_COLORS = [
  "#5B5BD6",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#06B6D4",
  "#F97316",
];

function nameColor(name: string) {
  let h = 0;
  for (let i = 0; i < (name || "").length; i++) {
    h = name.charCodeAt(i) + ((h << 5) - h);
  }
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function getInitials(name = "") {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase() || "?";
}

function formatDate(value: any) {
  if (!value) return "—";

  try {
    return new Date(value).toLocaleString();
  } catch {
    return "—";
  }
}

/* ───────────────────────────────────────────── */

function StatusBadge({ agent, isDark }: any) {
  const todayLoggedIn = agent?.todayLoggedIn;
  const status = String(agent?.status || "").toUpperCase();

  let label = "NOT READY";
  let color = "#EF4444";
  let bg = isDark ? "rgba(239,68,68,0.18)" : "#FEE2E2";
  let Icon = WifiOff;

  if (todayLoggedIn && status === "AVAILABLE") {
    label = "READY";
    color = "#10B981";
    bg = isDark ? "rgba(16,185,129,0.18)" : "#DCFCE7";
    Icon = Wifi;
  }

  if (todayLoggedIn && status === "PAUSED") {
    label = "PAUSED";
    color = "#D38A00";
    bg = isDark ? "rgba(211,138,0,0.18)" : "#FEF3C7";
    Icon = Clock;
  }

  if (todayLoggedIn && status === "ON_CALL") {
    label = "ON CALL";
    color = "#F59E0B";
    bg = isDark ? "rgba(245,158,11,0.18)" : "#FEF3C7";
    Icon = Phone;
  }

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "5px 11px",
        borderRadius: 20,
        fontSize: 12,
        fontWeight: 800,
        background: bg,
        color,
        whiteSpace: "nowrap",
      }}
    >
      <Icon size={12} />
      {label}
    </span>
  );
}

/* ───────────────────────────────────────────── */

function getPageMeta(status: string, isDark: boolean) {
  const map: any = {
    total: {
      title: "Total Agents",
      subtitle: "All agents in this team",
      icon: Users,
      color: isDark ? "#7C7CF0" : "#5B5BD6",
      empty: "No agents found",
    },
    ready: {
      title: "Ready Agents",
      subtitle: "Agents logged in today and currently available",
      icon: UserCheck,
      color: "#10B981",
      empty: "No ready agents found",
    },
    "not-ready": {
      title: "Not Ready Agents",
      subtitle: "Agents who have no active login session today",
      icon: UserX,
      color: "#EF4444",
      empty: "No not-ready agents found",
    },
    paused: {
      title: "Paused Agents",
      subtitle: "Agents logged in today and currently paused",
      icon: Clock,
      color: "#D38A00",
      empty: "No paused agents found",
    },
    oncall: {
      title: "On Call Agents",
      subtitle: "Agents logged in today and currently on call",
      icon: Phone,
      color: "#F59E0B",
      empty: "No on-call agents found",
    },
  };

  return map[status] || map.total;
}

/* ───────────────────────────────────────────── */

export default function SupervisorAgentReportPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const textPrimary = isDark ? "#F0F0F5" : "#0D0D12";
  const textMuted = isDark ? "#A1A1B5" : "#9E9EAD";
  const textSecondary = isDark ? "#C0C0D0" : "#6B7280";

  const cardBg = isDark ? "rgba(20,20,28,0.98)" : "#fff";
  const cardBorder = isDark
    ? "rgba(255,255,255,0.08)"
    : "rgba(0,0,0,0.07)";

  const bgPage = isDark ? "#0A0A0F" : "#F6F7F9";
  const accentMain = isDark ? "#7C7CF0" : "#5B5BD6";
  const tableHeaderBg = isDark ? "#17171F" : "#FAFAFA";
  const inputBg = isDark ? "rgba(255,255,255,0.06)" : "#fff";
  const rowHover = isDark ? "rgba(255,255,255,0.03)" : "#FAFAFA";

  const shadow = isDark
    ? "0 8px 30px rgba(0,0,0,0.45)"
    : "0 2px 12px rgba(0,0,0,0.06)";

  const { teamId, status } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const token = localStorage.getItem("token") || "";
  const statusFromRoute = status || searchParams.get("status") || "total";
  const pageMeta = getPageMeta(statusFromRoute, isDark);
  const PageIcon = pageMeta.icon;

  const [agentGroups, setAgentGroups] = useState<any>({
    ready: [],
    notReady: [],
    paused: [],
    onCall: [],
  });

  const [liveStats, setLiveStats] = useState<any>({
    totalAgents: 0,
    readyAgents: 0,
    notReadyAgents: 0,
    pausedAgents: 0,
    onCallAgents: 0,
  });

  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  /* ───────────────────────────────────────────── */

  const normalizeOverview = (payload: any) => {
    if (payload?.liveStats) {
      setLiveStats({
        totalAgents: payload.liveStats.totalAgents || 0,
        readyAgents: payload.liveStats.readyAgents || 0,
        notReadyAgents: payload.liveStats.notReadyAgents || 0,
        pausedAgents: payload.liveStats.pausedAgents || 0,
        onCallAgents: payload.liveStats.onCallAgents || 0,
      });
    }

    if (payload?.agents) {
      setAgentGroups({
        ready: payload.agents.ready || [],
        notReady: payload.agents.notReady || [],
        paused: payload.agents.paused || [],
        onCall: payload.agents.onCall || [],
      });
    }
  };

  const fetchOverview = async () => {
    if (!teamId) return;

    try {
      const res = await api.get(`/auth/team/${teamId}/agent-status-overview`);

      if (res.data?.success) {
        normalizeOverview(res.data);
      }
    } catch (err: any) {
      toast.error(
        err.response?.data?.message || "Failed to load team agent status"
      );
    }
  };

  useEffect(() => {
    if (!teamId) return;

    setLoading(true);

    fetchOverview().finally(() => {
      setLoading(false);
    });
  }, [teamId]);

  /* ─────────────────────────────────────────────
     Realtime socket
  ───────────────────────────────────────────── */

  useEffect(() => {
    if (!teamId || !token) return;

    const socket = io(API_URL, {
      path: "/socket.io",
      transports: ["websocket"],
      auth: { token },
    });

    socket.on("connect", () => {
      socket.emit("join-team", { teamId: Number(teamId) });
    });

    socket.on("agentStatusUpdate", (payload: any) => {
      if (Number(payload?.teamId) !== Number(teamId)) return;

      normalizeOverview(payload);
    });

    return () => {
      socket.emit("leave-team", { teamId: Number(teamId) });
      socket.off("connect");
      socket.off("agentStatusUpdate");
      socket.disconnect();
    };
  }, [teamId, token]);

  /* ───────────────────────────────────────────── */

  const allAgents = useMemo(() => {
    const map = new Map();

    [
      ...(agentGroups.ready || []),
      ...(agentGroups.notReady || []),
      ...(agentGroups.paused || []),
      ...(agentGroups.onCall || []),
    ].forEach((agent: any) => {
      map.set(agent.id, agent);
    });

    return Array.from(map.values());
  }, [agentGroups]);

  const agents = useMemo(() => {
    if (statusFromRoute === "total") return allAgents;
    if (statusFromRoute === "ready") return agentGroups.ready || [];
    if (statusFromRoute === "not-ready") return agentGroups.notReady || [];
    if (statusFromRoute === "paused") return agentGroups.paused || [];
    if (statusFromRoute === "oncall") return agentGroups.onCall || [];

    return allAgents;
  }, [statusFromRoute, allAgents, agentGroups]);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return agents;

    const q = searchQuery.toLowerCase();

    return agents.filter((a: any) => {
      return [
        a.name,
        a.email,
        a.phoneNumber,
        a.status,
        a.sipIdentity,
        a.latestSession?.ipAddress,
        a.latestSession?.deviceName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [agents, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  const paginated = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFromRoute]);

  const count =
    statusFromRoute === "total"
      ? liveStats.totalAgents
      : statusFromRoute === "ready"
      ? liveStats.readyAgents
      : statusFromRoute === "not-ready"
      ? liveStats.notReadyAgents
      : statusFromRoute === "paused"
      ? liveStats.pausedAgents
      : statusFromRoute === "oncall"
      ? liveStats.onCallAgents
      : filtered.length;

  /* ───────────────────────────────────────────── */

  return (
    <div
      style={{
        minHeight: "100vh",
        background: bgPage,
        paddingBottom: 48,
        fontFamily: "'Inter', -apple-system, sans-serif",
      }}
    >
      {/* HEADER */}
      <div
        style={{
          background: isDark
            ? "#1A1A24"
            : "linear-gradient(135deg, #5B5BD6 0%, #4747C2 100%)",
          padding: "20px 24px",
          marginBottom: 24,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 14,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate("/team-dashboard")}
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                border: "none",
                background: "rgba(255,255,255,0.16)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              <ArrowLeft size={18} color="#fff" />
            </motion.button>

            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: 13,
                background: "rgba(255,255,255,0.18)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <PageIcon size={22} color="#fff" />
            </div>

            <div>
              <h1
                style={{
                  margin: 0,
                  fontSize: 21,
                  fontWeight: 800,
                  color: "#fff",
                  letterSpacing: "-0.3px",
                }}
              >
                {pageMeta.title}
              </h1>

              <p
                style={{
                  margin: 0,
                  fontSize: 12.5,
                  color: "rgba(255,255,255,0.75)",
                }}
              >
                {pageMeta.subtitle}
              </p>
            </div>
          </div>

          <div
            style={{
              padding: "8px 14px",
              borderRadius: 999,
              background: "rgba(255,255,255,0.16)",
              color: "#fff",
              fontSize: 13,
              fontWeight: 800,
            }}
          >
            {count || 0} agent{Number(count || 0) !== 1 ? "s" : ""}
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div style={{ padding: "0 24px" }}>
        <div
          style={{
            background: cardBg,
            borderRadius: 18,
            border: `1px solid ${cardBorder}`,
            boxShadow: shadow,
            overflow: "hidden",
          }}
        >
          {/* TOOLBAR */}
          <div
            style={{
              padding: "16px 20px",
              borderBottom: `1px solid ${cardBorder}`,
              background: tableHeaderBg,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 14,
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                position: "relative",
                flex: 1,
                maxWidth: 520,
              }}
            >
              <Search
                size={14}
                style={{
                  position: "absolute",
                  left: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: textMuted,
                  pointerEvents: "none",
                }}
              />

              <input
                type="text"
                placeholder="Search by name, email, phone, IP or browser…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "10px 38px 10px 36px",
                  borderRadius: 10,
                  border: `1px solid ${cardBorder}`,
                  background: inputBg,
                  color: textPrimary,
                  outline: "none",
                  fontSize: 13.5,
                  fontFamily: "inherit",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = accentMain;
                  e.target.style.boxShadow = `0 0 0 3px ${
                    isDark
                      ? "rgba(124,124,240,0.18)"
                      : "rgba(91,91,214,0.12)"
                  }`;
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = cardBorder;
                  e.target.style.boxShadow = "none";
                }}
              />

              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  style={{
                    position: "absolute",
                    right: 10,
                    top: "50%",
                    transform: "translateY(-50%)",
                    border: "none",
                    background: "none",
                    cursor: "pointer",
                    padding: 2,
                    display: "flex",
                  }}
                >
                  <X size={13} color={textMuted} />
                </button>
              )}
            </div>

            <span
              style={{
                fontSize: 12.5,
                color: textMuted,
                fontWeight: 700,
                whiteSpace: "nowrap",
              }}
            >
              Showing {filtered.length} record
              {filtered.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* LOADING */}
          {loading ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "70px 0",
              }}
            >
              <Loader2
                size={34}
                color={accentMain}
                style={{ animation: "spin 0.7s linear infinite" }}
              />

              <style>
                {`
                  @keyframes spin {
                    to {
                      transform: rotate(360deg);
                    }
                  }
                `}
              </style>

              <p style={{ margin: "12px 0 0", fontSize: 13, color: textMuted }}>
                Loading agents…
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "70px 0",
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 16,
                  background: isDark
                    ? "rgba(124,124,240,0.12)"
                    : "rgba(91,91,214,0.08)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 14,
                }}
              >
                <User size={24} color={accentMain} />
              </div>

              <p
                style={{
                  margin: "0 0 6px",
                  fontSize: 15,
                  fontWeight: 800,
                  color: textPrimary,
                }}
              >
                {searchQuery
                  ? `No agents match "${searchQuery}"`
                  : pageMeta.empty}
              </p>

              <p style={{ margin: 0, fontSize: 13, color: textMuted }}>
                {searchQuery
                  ? "Try a different keyword"
                  : "Records will update automatically when team agent status changes"}
              </p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                }}
              >
                <thead>
                  <tr>
                    {[
                      "Agent",
                      "Contact",
                      "Status",
                      "Device / Browser",
                      "IP Address",
                      "Login Time",
                      "Last Seen",
                    ].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: "12px 16px",
                          fontSize: 11,
                          fontWeight: 800,
                          color: textMuted,
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                          textAlign: "left",
                          background: tableHeaderBg,
                          borderBottom: `1px solid ${cardBorder}`,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {paginated.map((agent: any) => {
                    const color = nameColor(agent.name || "?");
                    const session = agent.latestSession || null;

                    return (
                      <tr
                        key={agent.id}
                        style={{
                          transition: "background 0.12s",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = rowHover;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "transparent";
                        }}
                      >
                        {/* AGENT */}
                        <td
                          style={{
                            padding: "15px 16px",
                            borderBottom: `1px solid ${cardBorder}`,
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 12,
                            }}
                          >
                            <div
                              style={{
                                width: 38,
                                height: 38,
                                borderRadius: 11,
                                background: `${color}18`,
                                border: `1px solid ${color}30`,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 12,
                                fontWeight: 800,
                                color,
                                flexShrink: 0,
                              }}
                            >
                              {getInitials(agent.name || "?")}
                            </div>

                            <div>
                              <div
                                style={{
                                  fontWeight: 800,
                                  fontSize: 14,
                                  color: textPrimary,
                                }}
                              >
                                {agent.name || "—"}
                              </div>

                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 5,
                                  marginTop: 3,
                                  fontSize: 12,
                                  color: textMuted,
                                }}
                              >
                                <Activity size={11} />
                                {agent.sipIdentity || "No SIP identity"}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* CONTACT */}
                        <td
                          style={{
                            padding: "15px 16px",
                            borderBottom: `1px solid ${cardBorder}`,
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: 6,
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                color: textSecondary,
                                fontSize: 13,
                              }}
                            >
                              <Mail size={14} color={textMuted} />
                              {agent.email || "—"}
                            </div>

                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                color: textSecondary,
                                fontSize: 13,
                              }}
                            >
                              <Phone size={14} color={textMuted} />
                              {agent.phoneNumber || "—"}
                            </div>
                          </div>
                        </td>

                        {/* STATUS */}
                        <td
                          style={{
                            padding: "15px 16px",
                            borderBottom: `1px solid ${cardBorder}`,
                          }}
                        >
                          <StatusBadge agent={agent} isDark={isDark} />
                        </td>

                        {/* DEVICE */}
                        <td
                          style={{
                            padding: "15px 16px",
                            borderBottom: `1px solid ${cardBorder}`,
                            minWidth: 260,
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "flex-start",
                              gap: 8,
                              color: textSecondary,
                              fontSize: 13,
                              lineHeight: 1.45,
                            }}
                          >
                            <Monitor
                              size={14}
                              color={textMuted}
                              style={{ marginTop: 2, flexShrink: 0 }}
                            />
                            {session?.deviceName || "No active device today"}
                          </div>
                        </td>

                        {/* IP */}
                        <td
                          style={{
                            padding: "15px 16px",
                            borderBottom: `1px solid ${cardBorder}`,
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              color: textSecondary,
                              fontSize: 13,
                              fontFamily: "monospace",
                            }}
                          >
                            <Globe size={14} color={textMuted} />
                            {session?.ipAddress || "—"}
                          </div>
                        </td>

                        {/* LOGIN TIME */}
                        <td
                          style={{
                            padding: "15px 16px",
                            borderBottom: `1px solid ${cardBorder}`,
                            whiteSpace: "nowrap",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              color: textSecondary,
                              fontSize: 13,
                            }}
                          >
                            <Clock size={14} color={textMuted} />
                            {formatDate(session?.createdAt)}
                          </div>
                        </td>

                        {/* LAST SEEN */}
                        <td
                          style={{
                            padding: "15px 16px",
                            borderBottom: `1px solid ${cardBorder}`,
                            whiteSpace: "nowrap",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              color: textSecondary,
                              fontSize: 13,
                            }}
                          >
                            <Smartphone size={14} color={textMuted} />
                            {formatDate(session?.lastSeenAt)}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* PAGINATION */}
          {!loading && totalPages > 1 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 20px",
                borderTop: `1px solid ${cardBorder}`,
                background: tableHeaderBg,
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              <span
                style={{
                  fontSize: 12.5,
                  color: textMuted,
                  fontWeight: 600,
                }}
              >
                {(currentPage - 1) * PAGE_SIZE + 1}–
                {Math.min(currentPage * PAGE_SIZE, filtered.length)} of{" "}
                {filtered.length}
              </span>

              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    border: `1px solid ${cardBorder}`,
                    background: cardBg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: currentPage === 1 ? "not-allowed" : "pointer",
                    opacity: currentPage === 1 ? 0.4 : 1,
                  }}
                >
                  <ChevronLeft size={15} color={textPrimary} />
                </motion.button>

                <span
                  style={{
                    padding: "6px 15px",
                    borderRadius: 10,
                    background: accentMain,
                    color: "#fff",
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                >
                  {currentPage}
                </span>

                <span style={{ fontSize: 13, color: textMuted }}>
                  of {totalPages}
                </span>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    border: `1px solid ${cardBorder}`,
                    background: cardBg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor:
                      currentPage === totalPages ? "not-allowed" : "pointer",
                    opacity: currentPage === totalPages ? 0.4 : 1,
                  }}
                >
                  <ChevronRight size={15} color={textPrimary} />
                </motion.button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}