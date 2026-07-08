// src/pages/admin/MessageLogs.tsx
//@ts-nocheck
import React, { useState, useEffect, useCallback } from "react";
import MessageLogsTable from "../../components/admin/MessageLogsTable";
import api from "../../api";
import Select from "react-select";
import { motion } from "framer-motion";
import {
  MessageSquare, ArrowDownCircle, ArrowUpCircle,
  CheckCircle, XCircle, X, MessageCircle,
} from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { DateTimeInput } from "../../components/ui/AppDatePicker";

/* ─── body tooltip modal ─────────────────────────────────── */
function BodyModal({ text, onClose, isDark }: { text: string; onClose: () => void; isDark: boolean }) {
  const modalBg     = isDark ? "#17171F" : "rgba(255,255,255,0.92)";
  const modalBorder = isDark ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.60)";
  const modalShadow = isDark
    ? "0 4px 24px rgba(0,0,0,0.40), 0 0 0 1px rgba(255,255,255,0.04)"
    : "0 4px 24px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.04)";
  const textPrimary   = isDark ? "#F0F0F5" : "#0D0D12";
  const textSecondary = isDark ? "#A0A0B0" : "#6B6B7B";
  const bodyBg        = isDark ? "rgba(255,255,255,0.05)" : "#F6F7F9";
  const bodyText      = isDark ? "#F0F0F5" : "#0D0D12";
  const closeBg       = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)";
  const closeColor    = isDark ? "#A0A0B0" : "#6B6B7B";
  const btnBg         = isDark ? "rgba(255,255,255,0.07)" : "#F6F7F9";
  const btnBorder     = isDark ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.10)";
  const iconBg        = isDark ? "rgba(124,124,240,0.14)" : "rgba(91,91,214,0.12)";
  const iconColor     = isDark ? "#7C7CF0" : "#5B5BD6";

  const cardStyle: React.CSSProperties = {
    background: modalBg,
    backdropFilter: "blur(24px) saturate(180%)",
    WebkitBackdropFilter: "blur(24px) saturate(180%)",
    borderRadius: 18,
    border: `1px solid ${modalBorder}`,
    boxShadow: modalShadow,
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{
        position: "fixed", inset: 0, zIndex: 99999,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      <div
        onClick={onClose}
        style={{ position: "absolute", inset: 0, background: isDark ? "rgba(0,0,0,0.60)" : "rgba(0,0,0,0.40)", backdropFilter: "blur(4px)" }}
      />
      <motion.div
        initial={{ scale: 0.93, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.93, opacity: 0 }} transition={{ type: "spring", damping: 22, stiffness: 340 }}
        style={{ ...cardStyle, position: "relative", zIndex: 1, width: "90%", maxWidth: 440, padding: 22 }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 30, height: 30, borderRadius: 8,
              background: iconBg,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <MessageCircle size={14} color={iconColor} />
            </div>
            <span style={{ fontSize: 14, fontWeight: 800, color: textPrimary }}>Message Body</span>
          </div>
          <button onClick={onClose} style={{
            width: 28, height: 28, borderRadius: 8, border: "none",
            background: closeBg, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <X size={13} color={closeColor} />
          </button>
        </div>
        <div style={{
          padding: "12px 14px", borderRadius: 10,
          background: bodyBg, fontSize: 13, color: bodyText,
          lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word",
          maxHeight: 300, overflowY: "auto",
        }}>
          {text || "(empty)"}
        </div>
        <div style={{ marginTop: 14, display: "flex", justifyContent: "flex-end" }}>
          <motion.button
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={onClose}
            style={{
              padding: "7px 18px", borderRadius: 9,
              border: `1px solid ${btnBorder}`, background: btnBg,
              color: textSecondary, fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}
          >
            Close
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─── main component ─────────────────────────────────────── */
export default function MessageLogs() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const cardBg       = isDark ? "rgba(23,23,31,0.92)"    : "rgba(255,255,255,0.92)";
  const cardBorder   = isDark ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.60)";
  const cardShadow   = isDark
    ? "0 4px 24px rgba(0,0,0,0.40), 0 0 0 1px rgba(255,255,255,0.04)"
    : "0 4px 24px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.04)";
  const textPrimary   = isDark ? "#F0F0F5" : "#0D0D12";
  const textSecondary = isDark ? "#9E9EAD" : "#9E9EAD";
  const textMuted     = isDark ? "#A0A0B0" : "#6B6B7B";
  const inputBg       = isDark ? "rgba(255,255,255,0.05)" : "#F6F7F9";
  const inputBorder   = isDark ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.10)";
  const inputColor    = isDark ? "#F0F0F5" : "#0D0D12";
  const accentMain    = isDark ? "#7C7CF0" : "#5B5BD6";

  const card: React.CSSProperties = {
    background: cardBg,
    backdropFilter: "blur(24px) saturate(180%)",
    WebkitBackdropFilter: "blur(24px) saturate(180%)",
    borderRadius: 18,
    border: `1px solid ${cardBorder}`,
    boxShadow: cardShadow,
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", boxSizing: "border-box",
    padding: "9px 13px", borderRadius: 10,
    border: `1px solid ${inputBorder}`,
    background: inputBg, fontSize: 13,
    color: inputColor, outline: "none", fontFamily: "inherit",
    colorScheme: isDark ? "dark" : "light",
  };

  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: 11.5, fontWeight: 700,
    color: textMuted, marginBottom: 5, letterSpacing: "0.04em",
    textTransform: "uppercase",
  };

  const selectStyles = {
    control: (p: any, s: any) => ({
      ...p,
      border: `1px solid ${inputBorder}`, borderRadius: 10,
      background: inputBg, minHeight: 40,
      boxShadow: s.isFocused ? `0 0 0 3px ${isDark ? "rgba(124,124,240,0.18)" : "rgba(91,91,214,0.18)"}` : "none",
      "&:hover": { borderColor: isDark ? "rgba(124,124,240,0.40)" : "rgba(91,91,214,0.40)" },
      fontSize: 13,
    }),
    menu: (p: any) => ({
      ...p, borderRadius: 12, overflow: "hidden",
      boxShadow: "0 16px 40px rgba(0,0,0,0.24)", zIndex: 9999,
      background: isDark ? "#1E1E2C" : "#fff",
    }),
    option: (p: any, s: any) => ({
      ...p,
      background: s.isSelected
        ? (isDark ? "#7C7CF0" : "#5B5BD6")
        : s.isFocused
          ? (isDark ? "rgba(124,124,240,0.10)" : "rgba(91,91,214,0.06)")
          : (isDark ? "#1E1E2C" : "white"),
      color: s.isSelected ? "white" : inputColor,
      fontSize: 13, padding: "9px 14px",
    }),
    singleValue: (p: any) => ({ ...p, color: inputColor, fontSize: 13 }),
    placeholder: (p: any) => ({ ...p, color: isDark ? "#4A4A5A" : "#BBBBC8", fontSize: 13 }),
    indicatorSeparator: () => ({ display: "none" }),
    dropdownIndicator: (p: any) => ({ ...p, color: isDark ? "#68687A" : "#9CA3AF" }),
  };

  /* ── State ── */
  const [logs, setLogs]     = useState<any[]>([]);
  const [stats, setStats]   = useState({ total: 0, inbound: 0, outbound: 0, delivered: 0, failed: 0 });
  const [loading, setLoading] = useState(true);
  const [agents, setAgents]   = useState<any[]>([]);
  const [bodyModal, setBodyModal] = useState<{ open: boolean; text: string }>({ open: false, text: "" });

  /* ── Pagination state ── */
  const [page, setPage]         = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [total, setTotal]       = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  /* ── Filter state ── */
  const [filters, setFilters] = useState({
    customStart: "",
    customEnd: "",
    agentId: "all",
    status: "",
    fromNumber: "",
    toNumber: "",
  });

  /* ── Load agents ── */
  useEffect(() => {
    api.get("/auth/available").then((res) => {
      const opts = (res.data || []).map((a: any) => ({ value: a.id ?? a.id, label: a.label ?? a.name }));
      setAgents([{ value: "all", label: "All Agents" }, ...opts]);
    }).catch(() => {});
  }, []);

  /* ── Fetch logs ── */
  const fetchLogs = useCallback(async (overridePage?: number) => {
    setLoading(true);
    try {
      const currentPage = overridePage ?? page;

      // Build params — only send dateRange "custom" when dates are provided
      const params: Record<string, any> = {
        page:     currentPage,
        pageSize: pageSize,
        status:   filters.status   || undefined,
        fromNumber: filters.fromNumber || undefined,
        toNumber:   filters.toNumber   || undefined,
        agentId:  filters.agentId !== "all" ? filters.agentId : undefined,
      };

      if (filters.customStart || filters.customEnd) {
        params.dateRange   = "custom";
        params.customStart = filters.customStart || undefined;
        params.customEnd   = filters.customEnd   || undefined;
      } else {
        params.dateRange = "all";
      }

      const res = await api.get("/voice/messaging-logs", { params });

      setLogs(res.data.logs ?? []);
      setStats(res.data.stats ?? { total: 0, inbound: 0, outbound: 0, delivered: 0, failed: 0 });

      const pag = res.data.pagination ?? {};
      setTotal(pag.total ?? res.data.stats?.total ?? 0);
      setTotalPages(pag.totalPages ?? 1);
      setPage(pag.page ?? currentPage);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, filters]);

  /* ── Initial load ── */
  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Re-fetch when page or pageSize changes (not on filter change — that's manual via button) ── */
  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize]);

  const set = (key: string, val: any) => setFilters((f) => ({ ...f, [key]: val }));

  /* When user clicks Apply: reset to page 1 and fetch */
  const handleApplyFilter = () => {
    setPage(1);
    fetchLogs(1);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    // useEffect above will trigger fetch
  };

  const handleLimitChange = (newLimit: number) => {
    setPageSize(newLimit);
    setPage(1);
    // useEffect above will trigger fetch
  };

  const statusOptions = [
    { value: "",            label: "All Statuses" },
    { value: "delivered",   label: "Delivered" },
    { value: "sent",        label: "Sent" },
    { value: "received",    label: "Received" },
    { value: "failed",      label: "Failed" },
    { value: "undelivered", label: "Undelivered" },
  ];

  const statCards = [
    { label: "Total",     value: stats.total,     icon: MessageSquare,   accent: isDark ? "#7C7CF0" : "#5B5BD6" },
    { label: "Inbound",   value: stats.inbound,   icon: ArrowDownCircle, accent: "#17A363" },
    { label: "Outbound",  value: stats.outbound,  icon: ArrowUpCircle,   accent: isDark ? "#7C7CF0" : "#5B5BD6" },
    { label: "Delivered", value: (stats.delivered ?? 0) + (stats.inbound ?? 0), icon: CheckCircle, accent: "#17A363" },
    { label: "Failed",    value: stats.failed,    icon: XCircle,         accent: "#D0281A" },
  ];

  return (
    <div style={{ fontFamily: "'Inter', -apple-system, sans-serif", minHeight: "100vh" }}>
      {/* Page header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: isDark ? "rgba(124,124,240,0.14)" : "rgba(91,91,214,0.12)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <MessageSquare size={20} color={accentMain} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: textPrimary, letterSpacing: "-0.4px" }}>
              Messaging Logs
            </h1>
            <p style={{ margin: 0, fontSize: 12.5, color: textSecondary }}>
              Inbound &amp; outbound SMS history
            </p>
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
                background: `${accent}22`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Icon size={14} color={accent} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: textSecondary, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                {label}
              </span>
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: textPrimary, letterSpacing: "-0.5px" }}>
              {value ?? 0}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Filter bar */}
      <div style={{ ...card, padding: "16px 20px", marginBottom: 16 }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))",
          gap: 14, alignItems: "end",
        }}>
          {/* Start */}
          <div>
            <label style={labelStyle}>Start Date &amp; Time</label>
            <DateTimeInput
              value={filters.customStart}
              onChange={(val) => set("customStart", val)}
              placeholder="Select start date & time"
              style={{ background: inputBg, border: `1px solid ${inputBorder}`, color: inputColor }}
            />
          </div>

          {/* End */}
          <div>
            <label style={labelStyle}>End Date &amp; Time</label>
            <DateTimeInput
              value={filters.customEnd}
              onChange={(val) => set("customEnd", val)}
              placeholder="Select end date & time"
              style={{ background: inputBg, border: `1px solid ${inputBorder}`, color: inputColor }}
            />
          </div>

          {/* From */}
          <div>
            <label style={labelStyle}>From</label>
            <input
              type="text" value={filters.fromNumber} placeholder="+1234567890"
              onChange={(e) => set("fromNumber", e.target.value)}
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = isDark ? "rgba(124,124,240,0.40)" : "rgba(91,91,214,0.40)")}
              onBlur={(e)  => (e.target.style.borderColor = inputBorder)}
            />
          </div>

          {/* To */}
          <div>
            <label style={labelStyle}>To</label>
            <input
              type="text" value={filters.toNumber} placeholder="+1234567890"
              onChange={(e) => set("toNumber", e.target.value)}
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = isDark ? "rgba(124,124,240,0.40)" : "rgba(91,91,214,0.40)")}
              onBlur={(e)  => (e.target.style.borderColor = inputBorder)}
            />
          </div>

          {/* Status */}
          <div>
            <label style={labelStyle}>Status</label>
            <Select
              options={statusOptions}
              value={statusOptions.find((o) => o.value === filters.status) ?? statusOptions[0]}
              onChange={(opt) => set("status", opt?.value ?? "")}
              styles={selectStyles}
              menuPortalTarget={document.body}
            />
          </div>

          {/* Agent */}
          <div>
            <label style={labelStyle}>Agent</label>
            <Select
              options={agents}
              value={agents.find((o) => o.value === filters.agentId) ?? agents[0]}
              onChange={(opt) => set("agentId", opt?.value ?? "all")}
              styles={selectStyles}
              menuPortalTarget={document.body}
            />
          </div>

          {/* Apply */}
          <div>
            <label style={{ ...labelStyle, opacity: 0 }}>_</label>
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              onClick={handleApplyFilter}
              disabled={loading}
              style={{
                width: "100%", padding: "10px 0", borderRadius: 10, border: "none",
                background: loading ? (isDark ? "#3A3A4A" : "#BBBBC8") : accentMain,
                color: "#fff", fontWeight: 700, fontSize: 13,
                cursor: loading ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              }}
            >
              {loading ? "Loading…" : "Apply Filter"}
            </motion.button>
          </div>
        </div>
      </div>

      {/* Table with server-side pagination */}
      <MessageLogsTable
        logs={logs}
        loading={loading}
        page={page}
        limit={pageSize}
        total={total}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        onLimitChange={handleLimitChange}
        onViewBody={(text) => setBodyModal({ open: true, text })}
      />

      {/* Body modal */}
      {bodyModal.open && (
        <BodyModal
          text={bodyModal.text}
          onClose={() => setBodyModal({ open: false, text: "" })}
          isDark={isDark}
        />
      )}
    </div>
  );
}