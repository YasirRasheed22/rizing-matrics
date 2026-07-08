//@ts-nocheck
import React, { useEffect, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Pencil, Trash2, Calendar, ChevronDown,
  Mail, PhoneMissed, PhoneIncoming, PhoneOutgoing,
  ClipboardList, BadgeCheck, AlertTriangle,
  ChevronLeft, ChevronRight, Search, Filter,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast, Toaster } from "react-hot-toast";
import LeadSaleSidebar from "../../components/leads/LeadSaleSidebar";
import api from "../../api";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import Select from "react-select";
import { DateInput } from "../../components/ui/AppDatePicker";

const DATE_LABELS: Record<string, string> = {
  all: "All Time", today: "Today",
  week: "This Week", month: "This Month", custom: "Custom Range",
};

function formatDateNice(ds: string) {
  if (!ds) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true,
  }).format(new Date(ds)).replace(/,/, "").replace(/(\d{2}) (\w+) (\d{4}) at /, "$1 $2 $3 ");
}

type DataType = "leads" | "sales" | "calls";

/* ── Sub-components ── */

function CallIcon({ log, isDark }: any) {
  const red     = "#EF4444";
  const green   = isDark ? "#10B981" : "#059669";
  const primary = isDark ? "#7C7CF0" : "#5B5BD6";
  if (log.isVoicemail) return <Mail size={15} color="#A855F7" />;
  if (log.status === "no-answer" || log.status === "busy" || log.type === "missed")
    return <PhoneMissed size={15} color={red} />;
  if (log.direction === "inbound") return <PhoneIncoming size={15} color={green} />;
  return <PhoneOutgoing size={15} color={primary} />;
}

function DispositionBadge({ name, isDark }: { name: string; isDark: boolean }) {
  return (
    <span style={{
      display: "inline-block", padding: "5px 10px", borderRadius: 999,
      background: isDark ? "rgba(245,158,11,0.18)" : "rgba(245,158,11,0.12)",
      color: "#F59E0B", fontWeight: 700, fontSize: 11.5,
    }}>
      {name || "—"}
    </span>
  );
}

function DeleteToast({ t, label, onConfirm, isDark }) {
  const bg      = isDark ? "rgba(23,23,31,0.98)" : "#fff";
  const border  = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)";
  const text    = isDark ? "#F0F0F5" : "#0D0D12";
  const muted   = isDark ? "#A0A0B0" : "#6B6B7B";
  const soft    = isDark ? "#CBD5E1" : "#374151";
  const cancelBg= isDark ? "rgba(255,255,255,0.07)" : "#F6F7F9";
  return (
    <div style={{
      background: bg, borderRadius: 18, padding: "16px 18px",
      boxShadow: isDark ? "0 20px 60px rgba(0,0,0,0.55)" : "0 20px 60px rgba(0,0,0,0.18)",
      border: `1px solid ${border}`, maxWidth: 360,
      fontFamily: "Inter, sans-serif", display: "flex", gap: 12, alignItems: "flex-start",
    }}>
      <div style={{ width: 40, height: 40, borderRadius: 12, background: isDark ? "rgba(239,68,68,0.18)" : "rgba(239,68,68,0.10)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <AlertTriangle size={18} color="#EF4444" />
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 700, color: text }}>Delete {label}?</p>
        <p style={{ margin: "0 0 14px", fontSize: 12.5, color: muted }}>This action cannot be undone.</p>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}
            onClick={() => toast.dismiss(t.id)}
            style={{ padding: "8px 14px", borderRadius: 10, border: `1px solid ${border}`, background: cancelBg, color: soft, fontWeight: 700, fontSize: 12.5, cursor: "pointer" }}>
            Cancel
          </motion.button>
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}
            onClick={() => { toast.dismiss(t.id); onConfirm(); }}
            style={{ padding: "8px 14px", borderRadius: 10, border: "none", background: "#EF4444", color: "#fff", fontWeight: 700, fontSize: 12.5, cursor: "pointer" }}>
            Yes, Delete
          </motion.button>
        </div>
      </div>
    </div>
  );
}

function DatePickerDropdown({ dateFilter, setDateFilter, customStart, setCustomStart, customEnd, setCustomEnd, onClose, isDark }) {
  const bg     = isDark ? "rgba(23,23,31,0.98)" : "#fff";
  const border = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)";
  const text   = isDark ? "#F0F0F5" : "#0D0D12";
  const accent = isDark ? "#7C7CF0" : "#5B5BD6";
  const accentBg = isDark ? "rgba(124,124,240,0.12)" : "rgba(91,91,214,0.08)";
  const accentText = isDark ? "#A5B4FC" : "#5B5BD6";
  const inputBg  = isDark ? "rgba(30,30,42,0.90)" : "#F6F7F9";
  const inputBorder = isDark ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.10)";
  const labelSt: React.CSSProperties = {
    display: "block", fontSize: 11, fontWeight: 700,
    color: isDark ? "#68687A" : "#6B6B7B",
    marginBottom: 5, letterSpacing: "0.05em", textTransform: "uppercase",
  };
  const inputStyle: React.CSSProperties = {
    width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: 12,
    border: `1px solid ${inputBorder}`, background: inputBg,
    fontSize: 13, color: text, outline: "none", fontFamily: "inherit",
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
      style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, width: 250, zIndex: 9999, background: bg, backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderRadius: 18, border: `1px solid ${border}`, boxShadow: isDark ? "0 16px 50px rgba(0,0,0,0.55)" : "0 16px 50px rgba(0,0,0,0.18)", padding: "8px" }}
      onClick={(e) => e.stopPropagation()}
    >
      {["all", "today", "week", "month"].map((f) => (
        <button key={f}
          onClick={() => { setDateFilter(f); setCustomStart(""); setCustomEnd(""); onClose(); }}
          style={{ width: "100%", textAlign: "left", padding: "10px 12px", borderRadius: 10, border: "none", background: dateFilter === f ? accentBg : "transparent", color: dateFilter === f ? accentText : text, fontWeight: dateFilter === f ? 700 : 500, fontSize: 13, cursor: "pointer" }}>
          {DATE_LABELS[f]}
        </button>
      ))}
      <button onClick={() => setDateFilter("custom")}
        style={{ width: "100%", textAlign: "left", padding: "10px 12px", borderRadius: 10, border: "none", background: dateFilter === "custom" ? accentBg : "transparent", color: dateFilter === "custom" ? accentText : text, fontWeight: dateFilter === "custom" ? 700 : 500, fontSize: 13, cursor: "pointer" }}>
        Custom Range
      </button>
      {dateFilter === "custom" && (
        <div style={{ padding: "12px 8px 4px", borderTop: `1px solid ${border}`, marginTop: 8, display: "flex", flexDirection: "column", gap: 10 }}>
          <div>
            <label style={labelSt}>Start</label>
            <DateInput value={customStart} onChange={(val) => setCustomStart(val)} style={inputStyle} />
          </div>
          <div>
            <label style={labelSt}>End</label>
            <DateInput value={customEnd} onChange={(val) => setCustomEnd(val)} style={inputStyle} />
          </div>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            onClick={() => { if (customStart && customEnd) onClose(); }}
            disabled={!customStart || !customEnd}
            style={{ padding: "10px 0", borderRadius: 10, border: "none", background: customStart && customEnd ? accent : isDark ? "#2A2A3A" : "#E5E7EB", color: customStart && customEnd ? "#fff" : isDark ? "#68687A" : "#9CA3AF", fontWeight: 700, fontSize: 13, cursor: customStart && customEnd ? "pointer" : "not-allowed" }}>
            Apply
          </motion.button>
        </div>
      )}
    </motion.div>
  );
}

/* ── Main ── */

export default function AdminLeadsSalesDetail() {
  const { token } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const navigate = useNavigate();
  const pickerRef = useRef<HTMLDivElement>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  // ── Design tokens ──
  const pageBg        = isDark
    ? "radial-gradient(circle at top, rgba(17,17,24,1) 0%, rgba(15,15,20,1) 45%, rgba(10,10,14,1) 100%)"
    : "#F8F9FC";
  const cardBg        = isDark ? "rgba(23,23,31,0.92)"      : "rgba(255,255,255,0.92)";
  const cardBorder    = isDark ? "rgba(255,255,255,0.07)"   : "rgba(255,255,255,0.60)";
  const cardShadow    = isDark
    ? "0 10px 40px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.03)"
    : "0 4px 24px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.04)";
  const textPrimary   = isDark ? "#F0F0F5"                  : "#0D0D12";
  const textSecondary = isDark ? "#A0A0B0"                  : "#6B6B7B";
  const textMuted     = isDark ? "#68687A"                  : "#9E9EAD";
  const accentMain    = isDark ? "#7C7CF0"                  : "#5B5BD6";
  const accentBg      = isDark ? "rgba(124,124,240,0.12)"   : "rgba(91,91,214,0.08)";
  const inputBg       = isDark ? "rgba(30,30,42,0.90)"      : "#F6F7F9";
  const inputBorder   = isDark ? "rgba(255,255,255,0.09)"   : "rgba(0,0,0,0.10)";
  const thBg          = isDark ? "rgba(255,255,255,0.02)"   : "rgba(246,247,249,0.80)";
  const thBorder      = isDark ? "rgba(255,255,255,0.06)"   : "rgba(0,0,0,0.07)";
  const tdBorder      = isDark ? "rgba(255,255,255,0.04)"   : "rgba(0,0,0,0.05)";
  const rowHover      = isDark ? "rgba(124,124,240,0.06)"   : "rgba(91,91,214,0.03)";
  const paginBg       = isDark ? "rgba(255,255,255,0.02)"   : "rgba(246,247,249,0.80)";
  const paginBtnBg    = isDark ? "rgba(30,30,42,0.90)"      : "#F6F7F9";
  const paginBtnBord  = isDark ? "rgba(255,255,255,0.09)"   : "rgba(0,0,0,0.08)";
  const backBtnBg     = isDark ? "rgba(23,23,31,0.92)"      : "#F6F7F9";
  const backBtnBord   = isDark ? "rgba(255,255,255,0.07)"   : "rgba(0,0,0,0.10)";
  const filterBtnBg   = isDark ? "rgba(30,30,42,0.90)"      : "#F6F7F9";
  const filterBtnBord = isDark ? "rgba(255,255,255,0.09)"   : "rgba(0,0,0,0.09)";
  const selectRowBg   = isDark ? "rgba(30,30,42,0.90)"      : "#F6F7F9";
  const greenColor    = isDark ? "#10B981"                  : "#059669";
  const greenBg       = isDark ? "rgba(16,185,129,0.18)"    : "rgba(16,185,129,0.10)";
  const redBg         = isDark ? "rgba(239,68,68,0.18)"     : "rgba(239,68,68,0.10)";
  const spinBorder    = isDark ? "rgba(124,124,240,0.15)"   : "rgba(91,91,214,0.15)";

  const card: React.CSSProperties = {
    background: cardBg, backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
    borderRadius: 22, border: `1px solid ${cardBorder}`, boxShadow: cardShadow,
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: 12,
    border: `1px solid ${inputBorder}`, background: inputBg,
    fontSize: 13, color: textPrimary, outline: "none", fontFamily: "inherit",
  };

  const labelSt: React.CSSProperties = {
    display: "block", fontSize: 11, fontWeight: 700, color: textMuted,
    marginBottom: 5, letterSpacing: "0.05em", textTransform: "uppercase",
  };

  const thStyle: React.CSSProperties = {
    padding: "14px 16px", fontSize: 11, fontWeight: 800, color: textMuted,
    textTransform: "uppercase", letterSpacing: "0.08em", textAlign: "left",
    background: thBg, borderBottom: `1px solid ${thBorder}`, whiteSpace: "nowrap",
  };

  const tdStyle: React.CSSProperties = {
    padding: "15px 16px", fontSize: 13, color: textPrimary,
    borderBottom: `1px solid ${tdBorder}`, verticalAlign: "middle",
  };

  const selectStyles = {
    control: (p: any, s: any) => ({
      ...p, border: `1px solid ${inputBorder}`, borderRadius: 12, background: inputBg, minHeight: 42,
      color: textPrimary,
      boxShadow: s.isFocused ? `0 0 0 3px ${isDark ? "rgba(124,124,240,0.20)" : "rgba(91,91,214,0.18)"}` : "none",
      "&:hover": { borderColor: isDark ? "rgba(124,124,240,0.50)" : "rgba(91,91,214,0.40)" },
    }),
    menu: (p: any) => ({
      ...p, borderRadius: 14, overflow: "hidden",
      background: isDark ? "rgba(23,23,31,0.98)" : "#fff",
      border: `1px solid ${inputBorder}`,
      boxShadow: isDark ? "0 18px 50px rgba(0,0,0,0.55)" : "0 18px 50px rgba(0,0,0,0.14)", zIndex: 9999,
    }),
    option: (p: any, s: any) => ({
      ...p,
      background: s.isSelected ? accentMain : s.isFocused ? (isDark ? "rgba(124,124,240,0.12)" : "rgba(91,91,214,0.06)") : "transparent",
      color: s.isSelected ? "#fff" : textPrimary, fontSize: 13, padding: "10px 14px", cursor: "pointer",
    }),
    singleValue: (p: any) => ({ ...p, color: textPrimary, fontSize: 13 }),
    placeholder: (p: any) => ({ ...p, color: textMuted, fontSize: 13 }),
    input: (p: any) => ({ ...p, color: textPrimary }),
    menuPortal: (p: any) => ({ ...p, zIndex: 9999 }),
    indicatorSeparator: () => ({ display: "none" }),
    dropdownIndicator: (p: any) => ({ ...p, color: textMuted }),
  };

  const [dataType, setDataType] = useState<DataType>((searchParams.get("type") as DataType) || "leads");
  const [dateFilter, setDateFilter] = useState(searchParams.get("dateFilter") || "week");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [customStart, setCustomStart] = useState(searchParams.get("customStart") || "");
  const [customEnd, setCustomEnd] = useState(searchParams.get("customEnd") || "");
  const [selectedAgent, setSelectedAgent] = useState<any>(null);
  const [agents, setAgents] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [records, setRecords] = useState<any[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hoveredRow, setHoveredRow] = useState<any>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [sidebarItemType, setSidebarItemType] = useState<"leads" | "sales" | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node))
        setShowDatePicker(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => {
    api.get("/auth/all").then((res) => {
      const list = res.data.map((u: any) => ({ value: u.id, label: u.name || u.email }));
      setAgents([{ value: null, label: "All Agents" }, ...list]);
      const agentId = searchParams.get("agentId");
      if (agentId) {
        const f = list.find((a: any) => a.value === Number(agentId));
        if (f) setSelectedAgent(f);
      }
    }).catch(() => toast.error("Failed to load agents"));
  }, []);

  useEffect(() => {
    const p: any = { type: dataType, dateFilter };
    if (dateFilter === "custom") {
      if (customStart) p.customStart = customStart;
      if (customEnd) p.customEnd = customEnd;
    }
    if (selectedAgent?.value) p.agentId = selectedAgent.value;
    setSearchParams(p);
  }, [dataType, dateFilter, customStart, customEnd, selectedAgent]);

  const fetchData = async () => {
    if (!token) return;
    setLoading(true);
    const params = new URLSearchParams({ page: page.toString(), limit: limit.toString(), type: dataType, dateFilter });
    if (dateFilter === "custom" && customStart && customEnd) {
      params.append("startDate", customStart);
      params.append("endDate", customEnd);
    }
    if (selectedAgent?.value) params.append("agentId", selectedAgent.value);
    try {
      const res = await api.get(`/voice/leads/detail?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      setRecords(res.data.data || []);
      setTotalPages(res.data.pagination?.totalPages || 1);
    } catch { toast.error("Failed to load records"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [dataType, page, limit, dateFilter, customStart, customEnd, selectedAgent]);

  const handleDelete = (id: number) => {
    const label = dataType === "leads" ? "lead" : "sale";
    toast.custom((t) => (
      <DeleteToast t={t} label={label} isDark={isDark}
        onConfirm={async () => {
          const loadingId = toast.loading(`Deleting ${label}…`);
          try {
            const url = dataType === "sales" ? `/voice/sales/delete/${id}` : `/voice/leads/delete/${id}`;
            await api.delete(url);
            toast.success(`${label.charAt(0).toUpperCase() + label.slice(1)} deleted`, { id: loadingId });
            fetchData();
          } catch (e: any) {
            toast.error(e.message || `Failed to delete ${label}`, { id: loadingId });
          }
        }}
      />
    ), { duration: Infinity, position: "top-center" });
  };

  const pageTitle: Record<DataType, string> = {
    leads: "Leads Detail View", sales: "Sales Detail View", calls: "Calls Detail View",
  };

  const dateLabel = dateFilter === "custom" && customStart && customEnd
    ? `${customStart} → ${customEnd}`
    : DATE_LABELS[dateFilter] ?? "Filter";

  const colCount = dataType === "calls" ? 6 : 7;

  return (
    <>
      {/* <Toaster position="top-right" /> */}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      <div style={{ minHeight: "100vh", background: pageBg, padding: 24, fontFamily: "'Inter', -apple-system, sans-serif" }}>
        <div style={{ maxWidth: 1320, margin: "0 auto", paddingBottom: 40 }}>

          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 28, flexWrap: "wrap" }}>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.94 }}
              onClick={() => navigate("/admin/leads")}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", borderRadius: 14, border: `1px solid ${backBtnBord}`, background: backBtnBg, color: textSecondary, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
              <ArrowLeft size={14} /> Back
            </motion.button>

            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{
                width: 52, height: 52, borderRadius: 18,
                background: isDark
                  ? "linear-gradient(135deg,#7C7CF0,#8B5CF6)"
                  : "linear-gradient(135deg,#5B5BD6,#7C3AED)",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: isDark ? "0 10px 30px rgba(124,124,240,0.35)" : "0 10px 30px rgba(91,91,214,0.35)",
              }}>
                {dataType === "leads"
                  ? <ClipboardList size={24} color="#fff" />
                  : <BadgeCheck size={24} color="#fff" />}
              </div>
              <div>
                <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: textPrimary, letterSpacing: "-0.4px" }}>
                  {pageTitle[dataType]}
                </h1>
                <p style={{ margin: "4px 0 0", fontSize: 13, color: textMuted }}>
                  {records.length} records · page {page} of {totalPages}
                </p>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div style={{ ...card, padding: "18px 20px", marginBottom: 18, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap", position: "relative", zIndex: 100 }}>
            {/* Left */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: accentBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Filter size={18} color={accentMain} />
              </div>
              <span style={{ fontSize: 13, color: textMuted, fontWeight: 700 }}>Show</span>
              <select value={limit}
                onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
                style={{ padding: "9px 12px", borderRadius: 12, border: `1px solid ${inputBorder}`, background: selectRowBg, fontSize: 13, color: textPrimary, outline: "none", cursor: "pointer" }}>
                {[10, 15, 25, 50].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
              <span style={{ fontSize: 13, color: textMuted, fontWeight: 700 }}>per page</span>
            </div>

            {/* Right */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              {/* Date picker */}
              <div ref={pickerRef} style={{ position: "relative" }}>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={() => setShowDatePicker((v) => !v)}
                  style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 15px", borderRadius: 12, border: `1px solid ${filterBtnBord}`, background: filterBtnBg, color: textPrimary, fontWeight: 600, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap" }}>
                  <Calendar size={14} color={textMuted} />
                  {dateLabel}
                  <ChevronDown size={14} color={textMuted} />
                </motion.button>
                <AnimatePresence>
                  {showDatePicker && (
                    <DatePickerDropdown
                      dateFilter={dateFilter} setDateFilter={setDateFilter}
                      customStart={customStart} setCustomStart={setCustomStart}
                      customEnd={customEnd} setCustomEnd={setCustomEnd}
                      onClose={() => setShowDatePicker(false)} isDark={isDark}
                    />
                  )}
                </AnimatePresence>
              </div>

              {/* Agent select */}
              <div style={{ width: 220 }}>
                <Select
                  value={selectedAgent} onChange={setSelectedAgent} options={agents}
                  placeholder="All Agents" styles={selectStyles}
                  menuPortalTarget={document.body} menuPosition="fixed"
                />
              </div>
            </div>
          </div>

          {/* Table */}
          <div style={card}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1000 }}>
                <thead>
                  <tr>
                    <th style={thStyle}>{dataType === "calls" ? "Direction" : "Client Name"}</th>
                    <th style={thStyle}>Phone</th>
                    {dataType === "leads" && (<><th style={thStyle}>Disposition</th><th style={thStyle}>Next Follow-up</th></>)}
                    {dataType === "sales" && (<><th style={thStyle}>Services</th><th style={thStyle}>Amount</th></>)}
                    {dataType === "calls" && (<><th style={thStyle}>Duration</th><th style={thStyle}>Status</th></>)}
                    <th style={thStyle}>Agent</th>
                    <th style={thStyle}>Created</th>
                    {dataType !== "calls" && <th style={{ ...thStyle, textAlign: "right" }}>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={colCount} style={{ textAlign: "center", padding: "70px 0" }}>
                        <div style={{ width: 34, height: 34, margin: "0 auto", borderRadius: "50%", border: `3px solid ${spinBorder}`, borderTopColor: accentMain, animation: "spin 0.7s linear infinite" }} />
                      </td>
                    </tr>
                  ) : records.length === 0 ? (
                    <tr>
                      <td colSpan={colCount} style={{ textAlign: "center", padding: "70px 0" }}>
                        
                        <p style={{ margin: "14px 0 4px", fontSize: 15, fontWeight: 700, color: textPrimary }}>No {dataType} found</p>
                        <p style={{ margin: 0, fontSize: 13, color: textMuted }}>Try adjusting your filters</p>
                      </td>
                    </tr>
                  ) : (
                    records.map((item: any) => (
                      <tr key={item.id}
                        style={{ background: hoveredRow === item.id ? rowHover : "transparent", transition: "all .15s ease" }}
                        onMouseEnter={() => setHoveredRow(item.id)}
                        onMouseLeave={() => setHoveredRow(null)}
                      >
                        {/* Name / Direction */}
                        <td style={{ ...tdStyle, fontWeight: 700 }}>
                          {dataType === "calls" ? (
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <CallIcon log={item} isDark={isDark} />
                            </div>
                          ) : item.clientName}
                        </td>

                        {/* Phone */}
                        <td style={{ ...tdStyle, color: textSecondary }}>
                          {dataType === "calls"
                            ? (item.direction === "inbound" ? item.fromNumber : item.toNumber) || "—"
                            : item.clientPhone}
                        </td>

                        {/* Leads columns */}
                        {dataType === "leads" && (<>
                          <td style={tdStyle}>
                            <DispositionBadge name={item.disposition?.name} isDark={isDark} />
                          </td>
                          <td style={{ ...tdStyle, fontSize: 12.5, color: textMuted }}>
                            {item.nextFollowupDate ? formatDateNice(item.nextFollowupDate) : "—"}
                          </td>
                        </>)}

                        {/* Sales columns */}
                        {dataType === "sales" && (<>
                          <td style={{ ...tdStyle, color: textSecondary }}>{item.services?.join(", ") || "—"}</td>
                          <td style={{ ...tdStyle, fontWeight: 800, color: greenColor }}>
                            ${item.amount || 0} {item.currency || "USD"}
                          </td>
                        </>)}

                        {/* Calls columns */}
                        {dataType === "calls" && (<>
                          <td style={{ ...tdStyle, color: textSecondary }}>{item.duration ? `${item.duration}s` : "0s"}</td>
                          <td style={tdStyle}>
                            <span style={{
                              display: "inline-block", padding: "5px 11px", borderRadius: 999,
                              background: item.status === "completed" ? greenBg : redBg,
                              color: item.status === "completed" ? greenColor : "#EF4444",
                              fontWeight: 700, fontSize: 11.5, textTransform: "capitalize",
                            }}>
                              {item.status || "—"}
                            </span>
                          </td>
                        </>)}

                        {/* Agent */}
                        <td style={{ ...tdStyle, color: textSecondary }}>
                          {item.addedBy?.name || item.user?.name || "—"}
                        </td>

                        {/* Created */}
                        <td style={{ ...tdStyle, fontSize: 12.5, color: textMuted }}>
                          {formatDateNice(item.createdAt)}
                        </td>

                        {/* Actions */}
                        {dataType !== "calls" && (
                          <td style={{ ...tdStyle, textAlign: "right" }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8 }}>
                              {dataType !== "sales" && (
                                <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
                                  onClick={() => navigate(`/admin/lead/single/${item.id}`)}
                                  style={{ width: 34, height: 34, borderRadius: 12, border: "none", background: accentBg, display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                                  <Pencil size={14} color={accentMain} />
                                </motion.button>
                              )}
                              <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
                                onClick={() => handleDelete(item.id)}
                                style={{ width: 34, height: 34, borderRadius: 12, border: "none", background: redBg, display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                                <Trash2 size={14} color="#EF4444" />
                              </motion.button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderTop: `1px solid ${cardBorder}`, background: paginBg, flexWrap: "wrap", gap: 12 }}>
                <span style={{ fontSize: 13, color: textMuted }}>
                  Page <strong style={{ color: textPrimary }}>{page}</strong> of <strong style={{ color: textPrimary }}>{totalPages}</strong>
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <motion.button whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.92 }}
                    disabled={page === 1} onClick={() => setPage((p) => p - 1)}
                    style={{ width: 36, height: 36, borderRadius: 12, border: `1px solid ${paginBtnBord}`, background: paginBtnBg, display: "flex", alignItems: "center", justifyContent: "center", cursor: page === 1 ? "not-allowed" : "pointer", opacity: page === 1 ? 0.35 : 1 }}>
                    <ChevronLeft size={16} color={textSecondary} />
                  </motion.button>
                  <span style={{ padding: "8px 14px", borderRadius: 12, background: accentBg, color: accentMain, fontWeight: 800, fontSize: 13 }}>
                    {page}
                  </span>
                  <motion.button whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.92 }}
                    disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}
                    style={{ width: 36, height: 36, borderRadius: 12, border: `1px solid ${paginBtnBord}`, background: paginBtnBg, display: "flex", alignItems: "center", justifyContent: "center", cursor: page === totalPages ? "not-allowed" : "pointer", opacity: page === totalPages ? 0.35 : 1 }}>
                    <ChevronRight size={16} color={textSecondary} />
                  </motion.button>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <LeadSaleSidebar
            isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)}
            item={selectedItem} itemType={sidebarItemType} onSaveSuccess={fetchData}
          />
        </div>
      </div>
    </>
  );
}