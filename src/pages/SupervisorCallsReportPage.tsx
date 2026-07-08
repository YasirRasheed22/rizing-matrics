// src/pages/SupervisorCallsReportPage.tsx
// @ts-nocheck

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  FileText,
  Phone,
  Plus,
  Play,
  X,
  PhoneCall,
  Search,
  User,
  Calendar,
  Loader2,
} from "lucide-react";

import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import api from "../api";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

import { useNavigate, useParams, useSearchParams } from "react-router-dom";

import InlineAudioPlayer from "../components/teams/InlineAudioPlayer";
import { API_URL } from "../main";
import CallLeadSaleModal from "../components/LeadSaleModal";
import { getAppTz } from "../hooks/dateFormat";

/* ───────────────────────────────────────────── */

function formatDateNice(str: string) {
  if (!str) return "—";

  return new Date(str).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: getAppTz(),
  });
}

function normalizeType(type?: string | null) {
  return String(type || "all").toLowerCase();
}

function getTypeMeta(type?: string | null) {
  const t = normalizeType(type);

  const map: any = {
    dialed: {
      title: "Dialed Calls",
      label: "Dialed",
      empty: "No dialed calls found for selected period",
    },
    received: {
      title: "Received Calls",
      label: "Received",
      empty: "No received calls found for selected period",
    },
    answered: {
      title: "Answered Calls",
      label: "Answered",
      empty: "No answered calls found for selected period",
    },
    missed: {
      title: "Missed Calls",
      label: "Missed",
      empty: "No missed calls found for selected period",
    },
    connected: {
      title: "Connected Calls",
      label: "Connected",
      empty: "No connected calls found for selected period",
    },
    voicemail: {
      title: "Voicemail Calls",
      label: "Voicemail",
      empty: "No voicemail found for selected period",
    },
    all: {
      title: "All Calls",
      label: "All",
      empty: "No calls found for selected period",
    },
  };

  return map[t] || map.all;
}

/* ───────────────────────────────────────────── */

function StatusBadge({ status, isDark }: any) {
  const s = String(status || "").toLowerCase();

  const isGreen =
    s === "connected" ||
    s === "answered" ||
    s === "completed" ||
    s === "complete";

  const isRed =
    s === "missed" ||
    s === "no-answer" ||
    s === "failed" ||
    s === "busy" ||
    s === "canceled";

  const bg = isGreen
    ? isDark
      ? "rgba(16,185,129,0.16)"
      : "#DCFCE7"
    : isRed
    ? isDark
      ? "rgba(239,68,68,0.16)"
      : "#FEE2E2"
    : isDark
    ? "rgba(245,158,11,0.16)"
    : "#FEF3C7";

  const color = isGreen ? "#10B981" : isRed ? "#EF4444" : "#F59E0B";

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "4px 10px",
        borderRadius: 20,
        fontSize: 11.5,
        fontWeight: 700,
        background: bg,
        color,
        textTransform: "capitalize",
        whiteSpace: "nowrap",
      }}
    >
      {status || "unknown"}
    </span>
  );
}

/* ───────────────────────────────────────────── */

function TypeBadge({ type, isDark }: any) {
  const t = normalizeType(type);

  const bg =
    t === "voicemail"
      ? isDark
        ? "rgba(124,124,240,0.18)"
        : "rgba(91,91,214,0.10)"
      : t === "missed"
      ? isDark
        ? "rgba(239,68,68,0.16)"
        : "#FEE2E2"
      : isDark
      ? "rgba(16,185,129,0.16)"
      : "rgba(16,185,129,0.10)";

  const color =
    t === "voicemail" ? "#7C7CF0" : t === "missed" ? "#EF4444" : "#10B981";

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "4px 10px",
        borderRadius: 20,
        fontSize: 11.5,
        fontWeight: 700,
        background: bg,
        color,
        textTransform: "capitalize",
      }}
    >
      <Phone size={10} />
      {getTypeMeta(t).label}
    </span>
  );
}

/* ───────────────────────────────────────────── */

export default function SupervisorCallsReportPage() {
  const { token, user } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const navigate = useNavigate();
  const { teamId } = useParams();
  const [urlParams] = useSearchParams();

  const type = normalizeType(urlParams.get("type"));
  const dateRange = urlParams.get("dateRange") || "today";
  const agentId = urlParams.get("agentId") || "";
  const typeMeta = getTypeMeta(type);

  /* ───────────────────────────────────────────── */

  const textPrimary = isDark ? "#F0F0F5" : "#0D0D12";
  const textMuted = isDark ? "#A1A1B5" : "#9E9EAD";
  const textSecondary = isDark ? "#C8C8D8" : "#6B7280";

  const cardBg = isDark ? "rgba(20,20,28,0.98)" : "#fff";
  const cardBorder = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)";
  const bgPage = isDark ? "#0A0A0F" : "#F6F7F9";
  const accentMain = isDark ? "#7C7CF0" : "#5B5BD6";
  const tableHeaderBg = isDark ? "#17171F" : "#FAFAFA";
  const inputBg = isDark ? "rgba(255,255,255,0.06)" : "#fff";
  const rowHover = isDark ? "rgba(255,255,255,0.03)" : "#FAFAFA";
  const shadow = isDark
    ? "0 8px 30px rgba(0,0,0,0.45)"
    : "0 2px 12px rgba(0,0,0,0.06)";

  /* ───────────────────────────────────────────── */

  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [isRecordingModalOpen, setIsRecordingModalOpen] = useState(false);
  const [selectedRecording, setSelectedRecording] = useState("");

  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactInfo, setContactInfo] = useState<any>(null);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const [callsData, setCallsData] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [error, setError] = useState<string | null>(null);

  /* ───────────────────────────────────────────── */

  const matchedTeam = user?.supervisedTeams?.find(
    (team: any) => String(team.id) === String(teamId)
  );

  const teamPrivileges = matchedTeam?.privileges?.[0];
  const canListenRecording = teamPrivileges?.canListenRecording ?? false;
  const canAddLead = teamPrivileges?.canAddLead ?? false;

  /* ───────────────────────────────────────────── */

  const openRecordingModal = (recordingUrl: string) => {
    setSelectedRecording(
      `${API_URL}/voice/play-recording?recordingUrl=${encodeURIComponent(
        recordingUrl
      )}`
    );

    setIsRecordingModalOpen(true);
  };

  const fetchContactInfo = useCallback(
    async (number: string) => {
      if (!number) return;

      try {
        const { data } = await api.get(`/contacts/lookup?number=${number}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        setContactInfo({
          name: data.callerName,
          address: data.address || "",
        });
      } catch {
        setContactInfo(null);
      }
    },
    [token]
  );

  /* ───────────────────────────────────────────── */

  const fetchData = async () => {
    if (!teamId) return;

    setIsFetching(true);
    setError(null);

    try {
      const res = await api.get(`/voice/team/${teamId}/reports/calls`, {
        params: {
          type,
          dateRange,
          agentId: agentId || undefined,
          search: searchQuery || undefined,
          page,
          limit,
        },
      });

      setCallsData(res.data.data || []);

      setTotalPages(res.data.pagination?.totalPages || 1);
      setTotalRecords(
        res.data.pagination?.totalRecords ||
          res.data.pagination?.total ||
          res.data.total ||
          0
      );
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load calls. Please try again.");
    } finally {
      setIsFetching(false);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
  }, [type, dateRange, agentId, limit, searchQuery]);

  useEffect(() => {
    if (token) fetchData();
  }, [token, teamId, type, dateRange, agentId, page, limit, searchQuery]);

  /* ───────────────────────────────────────────── */

  const fetchAll = async () => {
    const res = await api.get(`/voice/team/${teamId}/reports/calls`, {
      params: {
        type,
        dateRange,
        agentId: agentId || undefined,
        search: searchQuery || undefined,
        page: 1,
        limit: 100000,
      },
    });

    return res.data.data || [];
  };

  const downloadExcel = async () => {
    const all = await fetchAll();

    if (!all.length) return;

    const ws = XLSX.utils.json_to_sheet(
      all.map((item: any) => ({
        ID: item.id,
        From: item.agentName || item.from || item.fromNumber || "—",
        To: item.contactName || item.to || item.toNumber || "—",
        Duration: item.duration || "—",
        Status: item.status || "—",
        Type: item.type || type,
        Date: formatDateNice(item.startTime || item.date || item.createdAt),
        Agent: item.agentName || item.user?.name || "Unknown",
      }))
    );

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Calls");

    XLSX.writeFile(
      wb,
      `${type}_Calls_Report_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  };

  const downloadPDF = async () => {
    const all = await fetchAll();

    if (!all.length) return;

    const doc = new jsPDF();

    doc.setFontSize(15);
    doc.text(`${typeMeta.title} Report`, 105, 18, {
      align: "center",
    });

    autoTable(doc, {
      head: [["ID", "From", "To", "Duration", "Status", "Date", "Agent"]],
      body: all.map((item: any) => [
        item.id,
        item.agentName || item.from || item.fromNumber || "—",
        item.contactName || item.to || item.toNumber || "—",
        item.duration || "—",
        item.status || "—",
        formatDateNice(item.startTime || item.date || item.createdAt),
        item.agentName || item.user?.name || "Unknown",
      ]),
      startY: 26,
      theme: "grid",
      styles: {
        fontSize: 8,
      },
      headStyles: {
        fillColor: [91, 91, 214],
      },
    });

    doc.save(`${type}_Calls_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  /* ───────────────────────────────────────────── */

  const toggleLeadModal = async (name: string, phone: string) => {
    setContactName(name);
    setContactPhone(phone);

    try {
      const res = await api.post("/voice/leads/phone", { phone });

      if (res.data.leads?.[0]?.id) {
        navigate("/lead/single/" + res.data.leads[0].id);
        return;
      }

      setIsLeadModalOpen(true);
    } catch (e) {
      console.error(e);
    }
  };

  /* ───────────────────────────────────────────── */

  const isVoicemail = type === "voicemail";

  const headers = useMemo(() => {
    const base = ["ID", "From", "To"];

    if (!isVoicemail) {
      base.push("Duration", "Status");
    }

    base.push("Date", "Agent", "Actions");

    return base;
  }, [isVoicemail]);

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
            gap: 14,
            justifyContent: "space-between",
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
              }}
            >
              <PhoneCall size={22} color="#fff" />
            </div>

            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <h1
                  style={{
                    margin: 0,
                    fontSize: 21,
                    fontWeight: 800,
                    color: "#fff",
                    textTransform: "capitalize",
                  }}
                >
                  {typeMeta.title}
                </h1>

                <TypeBadge type={type} isDark={isDark} />
              </div>

              <p
                style={{
                  margin: 0,
                  fontSize: 12.5,
                  color: "rgba(255,255,255,0.75)",
                }}
              >
                Team calls reporting & analytics
              </p>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                color: "#fff",
                background: "rgba(255,255,255,0.16)",
                padding: "8px 12px",
                borderRadius: 999,
                fontSize: 12.5,
                fontWeight: 700,
              }}
            >
              <Calendar size={13} />
              {dateRange}
            </div>

            {agentId && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  color: "#fff",
                  background: "rgba(255,255,255,0.16)",
                  padding: "8px 12px",
                  borderRadius: 999,
                  fontSize: 12.5,
                  fontWeight: 700,
                }}
              >
                <User size={13} />
                Agent #{agentId}
              </div>
            )}
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
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "16px 20px",
              borderBottom: `1px solid ${cardBorder}`,
              background: tableHeaderBg,
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  fontSize: 15,
                  fontWeight: 800,
                  color: textPrimary,
                  textTransform: "capitalize",
                }}
              >
                {typeMeta.label} Calls
              </span>

              <span
                style={{
                  fontSize: 12,
                  color: textMuted,
                  fontWeight: 700,
                }}
              >
                {totalRecords || callsData.length} record
                {Number(totalRecords || callsData.length) !== 1 ? "s" : ""}
              </span>
            </div>

            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <div style={{ position: "relative", width: 260 }}>
                <Search
                  size={13}
                  style={{
                    position: "absolute",
                    left: 10,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: textMuted,
                  }}
                />

                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search calls..."
                  style={{
                    width: "100%",
                    padding: "8px 12px 8px 31px",
                    borderRadius: 10,
                    border: `1px solid ${cardBorder}`,
                    background: inputBg,
                    color: textPrimary,
                    outline: "none",
                    fontSize: 12.5,
                  }}
                />
              </div>

              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={downloadExcel}
                disabled={!callsData.length || isFetching}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 14px",
                  borderRadius: 10,
                  border: "1px solid rgba(16,185,129,0.25)",
                  background: isDark
                    ? "rgba(16,185,129,0.12)"
                    : "rgba(16,185,129,0.08)",
                  color: "#10B981",
                  fontWeight: 700,
                  fontSize: 12.5,
                  cursor: !callsData.length || isFetching ? "not-allowed" : "pointer",
                  opacity: !callsData.length || isFetching ? 0.5 : 1,
                }}
              >
                <FileSpreadsheet size={13} />
                Excel
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={downloadPDF}
                disabled={!callsData.length || isFetching}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 14px",
                  borderRadius: 10,
                  border: "1px solid rgba(239,68,68,0.25)",
                  background: isDark
                    ? "rgba(239,68,68,0.12)"
                    : "rgba(239,68,68,0.08)",
                  color: "#EF4444",
                  fontWeight: 700,
                  fontSize: 12.5,
                  cursor: !callsData.length || isFetching ? "not-allowed" : "pointer",
                  opacity: !callsData.length || isFetching ? 0.5 : 1,
                }}
              >
                <FileText size={13} />
                PDF
              </motion.button>
            </div>
          </div>

          {/* TABLE */}
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
              }}
            >
              <thead>
                <tr>
                  {headers.map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "12px 14px",
                        fontSize: 11,
                        fontWeight: 700,
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
                {isLoading || isFetching ? (
                  <tr>
                    <td
                      colSpan={headers.length}
                      style={{
                        padding: "64px 0",
                        textAlign: "center",
                      }}
                    >
                      <Loader2
                        size={34}
                        color={accentMain}
                        style={{
                          animation: "spin 0.7s linear infinite",
                          marginBottom: 12,
                        }}
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

                      <p
                        style={{
                          margin: 0,
                          fontSize: 13,
                          color: textMuted,
                        }}
                      >
                        Loading {typeMeta.label.toLowerCase()} calls…
                      </p>
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td
                      colSpan={headers.length}
                      style={{
                        padding: "56px 0",
                        textAlign: "center",
                      }}
                    >
                      <p
                        style={{
                          margin: "0 0 14px",
                          fontSize: 14,
                          fontWeight: 700,
                          color: "#EF4444",
                        }}
                      >
                        {error}
                      </p>

                      <motion.button
                        whileHover={{ scale: 1.03 }}
                        onClick={fetchData}
                        style={{
                          padding: "9px 20px",
                          borderRadius: 10,
                          border: "none",
                          background: accentMain,
                          color: "#fff",
                          fontWeight: 700,
                          fontSize: 13,
                          cursor: "pointer",
                        }}
                      >
                        Retry
                      </motion.button>
                    </td>
                  </tr>
                ) : callsData.length === 0 ? (
                  <tr>
                    <td
                      colSpan={headers.length}
                      style={{
                        padding: "64px 0",
                        textAlign: "center",
                        color: textMuted,
                        fontSize: 13,
                      }}
                    >
                      {typeMeta.empty}
                    </td>
                  </tr>
                ) : (
                  callsData.map((item) => (
                    <tr
                      key={item.id}
                      style={{ transition: "background 0.12s" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = rowHover)}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <td
                        style={{
                          padding: "14px 14px",
                          fontSize: 12,
                          color: textMuted,
                          borderBottom: `1px solid ${cardBorder}`,
                        }}
                      >
                        {item.id}
                      </td>

                      <td
                        style={{
                          padding: "14px 14px",
                          fontSize: 13,
                          color: textPrimary,
                          borderBottom: `1px solid ${cardBorder}`,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {isVoicemail
                          ? item.fromNumber || item.from || "—"
                          : item.agentName || item.from || item.fromNumber || "—"}
                      </td>

                      <td
                        style={{
                          padding: "14px 14px",
                          fontSize: 13,
                          color: textPrimary,
                          borderBottom: `1px solid ${cardBorder}`,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {isVoicemail
                          ? item.toNumber || item.to || "—"
                          : item.contactName || item.to || item.toNumber || "—"}
                      </td>

                      {!isVoicemail && (
                        <td
                          style={{
                            padding: "14px 14px",
                            fontSize: 13,
                            color: textMuted,
                            borderBottom: `1px solid ${cardBorder}`,
                          }}
                        >
                          {item.duration || "—"}
                        </td>
                      )}

                      {!isVoicemail && (
                        <td
                          style={{
                            padding: "14px 14px",
                            borderBottom: `1px solid ${cardBorder}`,
                          }}
                        >
                          <StatusBadge status={item.status} isDark={isDark} />
                        </td>
                      )}

                      <td
                        style={{
                          padding: "14px 14px",
                          fontSize: 13,
                          color: textMuted,
                          borderBottom: `1px solid ${cardBorder}`,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {formatDateNice(item.startTime || item.date || item.createdAt)}
                      </td>

                      <td
                        style={{
                          padding: "14px 14px",
                          fontSize: 13,
                          color: textPrimary,
                          borderBottom: `1px solid ${cardBorder}`,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {isVoicemail
                          ? item.user?.name || item.agentName || "—"
                          : item.agentName || item.user?.name || "Unknown"}
                      </td>

                      <td
                        style={{
                          padding: "14px 14px",
                          borderBottom: `1px solid ${cardBorder}`,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <motion.button
                            whileHover={canAddLead ? { scale: 1.05 } : {}}
                            whileTap={canAddLead ? { scale: 0.95 } : {}}
                            disabled={!canAddLead}
                            onClick={() => {
                              if (!canAddLead) return;

                              toggleLeadModal(
                                item?.contactName || "",
                                item?.to || item?.toNumber || ""
                              );
                            }}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 5,
                              padding: "7px 10px",
                              borderRadius: 8,
                              border: "1px solid rgba(91,91,214,0.20)",
                              background: canAddLead
                                ? isDark
                                  ? "rgba(124,124,240,0.12)"
                                  : "rgba(91,91,214,0.08)"
                                : "#E5E7EB",
                              color: canAddLead ? accentMain : "#9CA3AF",
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: canAddLead ? "pointer" : "not-allowed",
                            }}
                          >
                            <Plus size={13} />
                            Add Lead
                          </motion.button>

                          {item.recordingUrl && (
                            <motion.button
                              whileHover={canListenRecording ? { scale: 1.05 } : {}}
                              whileTap={canListenRecording ? { scale: 0.95 } : {}}
                              disabled={!canListenRecording}
                              onClick={() => {
                                if (!canListenRecording) return;
                                openRecordingModal(item.recordingUrl);
                              }}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 5,
                                padding: "7px 10px",
                                borderRadius: 8,
                                border: "1px solid rgba(16,185,129,0.25)",
                                background: canListenRecording
                                  ? isDark
                                    ? "rgba(16,185,129,0.12)"
                                    : "rgba(16,185,129,0.08)"
                                  : "#E5E7EB",
                                color: canListenRecording ? "#10B981" : "#9CA3AF",
                                fontSize: 12,
                                fontWeight: 700,
                                cursor: canListenRecording ? "pointer" : "not-allowed",
                              }}
                            >
                              <Play size={13} />
                              Play
                            </motion.button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* PAGINATION */}
          {totalPages >= 1 && (
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
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{
                    fontSize: 12.5,
                    color: textMuted,
                    fontWeight: 600,
                  }}
                >
                  Rows per page:
                </span>

                <select
                  value={limit}
                  onChange={(e) => {
                    setPage(1);
                    setLimit(Number(e.target.value));
                  }}
                  style={{
                    padding: "6px 10px",
                    borderRadius: 8,
                    border: `1px solid ${cardBorder}`,
                    background: isDark ? "#1A1A24" : "#F6F7F9",
                    fontSize: 13,
                    color: textPrimary,
                    cursor: "pointer",
                    outline: "none",
                  }}
                >
                  {[10, 20, 50, 100].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  disabled={page === 1 || isFetching}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    border: `1px solid ${cardBorder}`,
                    background: cardBg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: page === 1 ? "not-allowed" : "pointer",
                    opacity: page === 1 ? 0.4 : 1,
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
                  {page}
                </span>

                <span style={{ fontSize: 13, color: textMuted }}>
                  of {totalPages}
                </span>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  disabled={page === totalPages || isFetching}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    border: `1px solid ${cardBorder}`,
                    background: cardBg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: page === totalPages ? "not-allowed" : "pointer",
                    opacity: page === totalPages ? 0.4 : 1,
                  }}
                >
                  <ChevronRight size={15} color={textPrimary} />
                </motion.button>
              </div>
            </div>
          )}

          <CallLeadSaleModal
            isOpen={isLeadModalOpen}
            onClose={() => setIsLeadModalOpen(false)}
            customerName={contactName}
            customerNumber={contactPhone}
            contactInfo={contactInfo}
            isDark={isDark}
            fetchContactInfo={fetchContactInfo}
          />

          {isRecordingModalOpen && (
            <div
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.55)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 9999,
                padding: 20,
              }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                style={{
                  width: "100%",
                  maxWidth: 520,
                  background: cardBg,
                  borderRadius: 20,
                  padding: "26px 24px 24px",
                  border: `1px solid ${cardBorder}`,
                  boxShadow: shadow,
                  position: "relative",
                }}
              >
                <button
                  onClick={() => setIsRecordingModalOpen(false)}
                  style={{
                    position: "absolute",
                    top: 14,
                    right: 14,
                    width: 34,
                    height: 34,
                    borderRadius: "50%",
                    border: "none",
                    background: isDark ? "#2A2A34" : "#F3F4F6",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <X size={16} color={textPrimary} />
                </button>

                <h2
                  style={{
                    margin: 0,
                    marginBottom: 22,
                    fontSize: 18,
                    fontWeight: 800,
                    color: textPrimary,
                  }}
                >
                  Call Recording
                </h2>

                <InlineAudioPlayer src={selectedRecording} user={user} />
              </motion.div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}