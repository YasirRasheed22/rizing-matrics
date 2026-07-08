// src/pages/admin/InboundReportPage.tsx
// @ts-nocheck
import React, { useEffect, useRef, useState } from "react";
import {
  Filter, ChevronDown, ChevronLeft, ChevronRight,
  ArrowLeft, PhoneIncoming, PhoneCall, PhoneOff,
  FileSpreadsheet, FileText, Clock, X, Mic, CheckCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import api from "../../api";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import Select from "react-select";
import { DateInput } from "../../components/ui/AppDatePicker";
import { useNavigate } from "react-router-dom";
import { getAppTz } from "../../hooks/dateFormat";
import { API_URL } from "../../main";

type DateFilter = "all" | "today" | "week" | "month" | "custom";

function secondsToHms(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0 sec";
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (total < 60) return `${total} sec`;
  if (h === 0) return s > 0 ? `${m} min ${s} sec` : `${m} min`;
  return [h > 0 && `${h} hr`, m > 0 && `${m} min`, s > 0 && `${s} sec`].filter(Boolean).join(" ");
}

function formatDateNice(str: string) {
  if (!str) return "—";
  return new Date(str).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true, timeZone: getAppTz(),
  });
}

function StatusBadge({ status }: { status: string }) {
  const s = (status || "").toLowerCase();
  const isGreen = s === "connected" || s === "answered" || s === "completed";
  const isRed   = s === "missed" || s === "no-answer" || s === "failed" || s === "busy" || s === "not_connected";
  const bg    = isGreen ? "#DCFCE7" : isRed ? "#FEE2E2" : "#FEF3C7";
  const color = isGreen ? "#16A34A" : isRed ? "#DC2626" : "#D97706";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", padding: "3px 10px",
      borderRadius: 20, fontSize: 11.5, fontWeight: 700,
      background: bg, color, textTransform: "capitalize",
    }}>
      {s === "not_connected" ? "Not Connected" : status || "unknown"}
    </span>
  );
}

export default function InboundReportPage() {
  const { token } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const navigate = useNavigate();

  // ── Design tokens ──
  const pageBg       = isDark ? "#0F0F14"                   : "#F6F7F9";
  const cardBg       = isDark ? "rgba(23,23,31,0.95)"       : "#fff";
  const cardBorder   = isDark ? "rgba(255,255,255,0.07)"    : "rgba(0,0,0,0.07)";
  const cardShadow   = isDark ? "0 2px 12px rgba(0,0,0,0.40)" : "0 2px 12px rgba(0,0,0,0.06)";
  const textPrimary  = isDark ? "#F0F0F5"                   : "#0D0D12";
  const textSecond   = isDark ? "#A0A0B0"                   : "#6B6B7B";
  const textMuted    = isDark ? "#68687A"                   : "#9E9EAD";
  const accentMain   = isDark ? "#7C7CF0"                   : "#5B5BD6";
  const accentBg     = isDark ? "rgba(124,124,240,0.12)"    : "rgba(91,91,214,0.09)";
  const inputBg      = isDark ? "rgba(30,30,42,0.90)"       : "#F6F7F9";
  const inputBorder  = isDark ? "rgba(255,255,255,0.09)"    : "rgba(0,0,0,0.10)";
  const thBg         = isDark ? "rgba(255,255,255,0.03)"    : "#FAFAFA";
  const thBorder     = isDark ? "rgba(255,255,255,0.06)"    : "rgba(0,0,0,0.07)";
  const tdBorder     = isDark ? "rgba(255,255,255,0.045)"   : "rgba(0,0,0,0.05)";
  const rowHover     = isDark ? "rgba(255,255,255,0.03)"    : "#FAFAFA";
  const toolbarBg    = isDark ? "rgba(255,255,255,0.02)"    : "#FAFAFA";
  const paginBg      = isDark ? "rgba(255,255,255,0.02)"    : "#FAFAFA";
  const backBtnBg    = isDark ? "rgba(255,255,255,0.06)"    : "#fff";
  const backBtnBord  = isDark ? "rgba(255,255,255,0.09)"    : "rgba(0,0,0,0.08)";
  const dropdownBg   = isDark ? "rgba(23,23,31,0.98)"       : "#fff";
  const dropdownBord = isDark ? "rgba(255,255,255,0.09)"    : "rgba(0,0,0,0.08)";
  const navBtnBg     = isDark ? "rgba(255,255,255,0.06)"    : "#fff";
  const navBtnBord   = isDark ? "rgba(255,255,255,0.09)"    : "rgba(0,0,0,0.10)";
  const spinBorder   = isDark ? "rgba(124,124,240,0.15)"    : "rgba(91,91,214,0.15)";
  const durInputBg   = isDark ? "rgba(40,40,55,0.90)"       : "#F6F7F9";
  const durHintClr   = isDark ? "#3A3A4A"                   : "#BBBBC8";

  const card: React.CSSProperties = {
    background: cardBg, borderRadius: 16,
    border: `1px solid ${cardBorder}`, boxShadow: cardShadow, overflow: "hidden",
  };
  const thStyle: React.CSSProperties = {
    padding: "11px 14px", fontSize: 11, fontWeight: 700, color: textMuted,
    textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "left",
    background: thBg, borderBottom: `1px solid ${thBorder}`, whiteSpace: "nowrap",
  };
  const tdStyle: React.CSSProperties = {
    padding: "13px 14px", fontSize: 13, color: textPrimary,
    borderBottom: `1px solid ${tdBorder}`, whiteSpace: "nowrap",
  };

  const selectStyles = {
    control: (p: any, s: any) => ({
      ...p, border: `1px solid ${inputBorder}`, borderRadius: 10,
      padding: "2px 4px", background: inputBg, minHeight: 40,
      boxShadow: s.isFocused ? `0 0 0 3px ${accentBg}` : "none",
      "&:hover": { borderColor: isDark ? "rgba(124,124,240,0.35)" : "rgba(91,91,214,0.35)" }, fontSize: 13.5,
    }),
    menu: (p: any) => ({
      ...p, borderRadius: 10, background: dropdownBg, border: `1px solid ${dropdownBord}`,
      boxShadow: isDark ? "0 12px 32px rgba(0,0,0,0.55)" : "0 12px 32px rgba(0,0,0,0.12)", zIndex: 99999,
    }),
    option: (p: any, s: any) => ({
      ...p, background: s.isSelected ? accentMain : s.isFocused ? accentBg : "transparent",
      color: s.isSelected ? "#fff" : textPrimary, fontSize: 13.5, padding: "9px 14px",
    }),
    placeholder: (p: any) => ({ ...p, color: textMuted, fontSize: 13.5 }),
    singleValue:  (p: any) => ({ ...p, color: textPrimary, fontSize: 13.5 }),
    indicatorSeparator: () => ({ display: "none" }),
    dropdownIndicator: (p: any) => ({ ...p, color: textMuted }),
    input: (p: any) => ({ ...p, color: textPrimary }),
  };

  // ── State ──
  const [page, setPage]             = useState(1);
  const [limit, setLimit]           = useState(10);
  const [dateFilter, setDateFilter] = useState<DateFilter>("week");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd]     = useState("");
  const [inboundData, setInboundData] = useState<any[]>([]);
  const [isLoading, setIsLoading]   = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [error, setError]           = useState<string | null>(null);
  const [agentFilter, setAgentFilter]   = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState<any>(null);
  const [agentsList, setAgentsList] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalInbound: 0, connected: 0, notConnected: 0, talkTime: 0 });
  const [minDur, setMinDur] = useState("");
  const [maxDur, setMaxDur] = useState("");

  // ── Export state ──
  const [exportProgress, setExportProgress] = useState(0);
  const [exportType, setExportType]         = useState<"excel" | "pdf" | null>(null);
  const [exportStatus, setExportStatus]     = useState<"idle" | "fetching" | "generating" | "done">("idle");
  const exportXhrRef  = useRef<XMLHttpRequest | null>(null);
  const fakeTimerRef  = useRef<any>(null);

  const isDurationActive = minDur !== "" || maxDur !== "";

  useEffect(() => { setPage(1); }, [limit, dateFilter, customStart, customEnd, agentFilter, statusFilter, minDur, maxDur]);

  useEffect(() => {
    if (!token) return;
    api.get("/auth/all", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => setAgentsList(r.data.map((a: any) => ({ value: a.id, label: a.name || a.email }))))
      .catch(console.error);
  }, [token]);

  const fetchData = async () => {
    setIsFetching(true); setError(null);
    try {
      const p = new URLSearchParams();
      p.append("page", String(page)); p.append("limit", String(limit)); p.append("dateFilter", dateFilter);
      if (dateFilter === "custom" && customStart && customEnd) { p.append("startDate", customStart); p.append("endDate", customEnd); }
      if (agentFilter?.value)  p.append("agentId", agentFilter.value);
      if (statusFilter?.value) p.append("callStatus", statusFilter.value);
      if (minDur !== "") p.append("minDuration", minDur);
      if (maxDur !== "") p.append("maxDuration", maxDur);
      const res = await api.get(`/voice/reports/inbound?${p}`, { headers: { Authorization: `Bearer ${token}` } });
      setInboundData(res.data.data || []); setStats(res.data.stats);
      setTotalPages(res.data.pagination?.totalPages || 1);
      setTotalRecords(res.data.pagination?.total || 0);
    } catch { setError("Failed to load inbound calls. Please try again."); }
    finally { setIsFetching(false); setIsLoading(false); }
  };

  useEffect(() => { if (token) fetchData(); }, [token, page, limit, dateFilter, customStart, customEnd, agentFilter, statusFilter, minDur, maxDur]);

  // ── Export helpers ──
  const buildExportParams = () => {
    const p = new URLSearchParams();
    p.append("dateFilter", dateFilter);
    if (dateFilter === "custom" && customStart && customEnd) {
      p.append("startDate", customStart); p.append("endDate", customEnd);
    }
    if (agentFilter?.value)  p.append("agentId",    String(agentFilter.value));
    if (statusFilter?.value) p.append("callStatus", statusFilter.value);
    if (minDur !== "") p.append("minDuration", minDur);
    if (maxDur !== "") p.append("maxDuration", maxDur);
    return p.toString();
  };

  const cancelExport = () => {
    if (fakeTimerRef.current) clearInterval(fakeTimerRef.current);
    exportXhrRef.current?.abort();
    exportXhrRef.current = null;
    setExportProgress(0); setExportType(null); setExportStatus("idle");
  };

  const triggerExport = (type: "excel" | "pdf") => {
    if (exportStatus !== "idle") return;
    setExportType(type); setExportStatus("fetching"); setExportProgress(0);

    const xhr = new XMLHttpRequest();
    exportXhrRef.current = xhr;
    const token_val = localStorage.getItem("token");
    
    const url       = `${API_URL}/voice/reports/inbound/export?${buildExportParams()}`;

    xhr.open("GET", url);
    if (token_val) xhr.setRequestHeader("Authorization", `Bearer ${token_val}`);

    let fakeVal = 0;
    fakeTimerRef.current = setInterval(() => {
      fakeVal = Math.min(fakeVal + Math.random() * 6, 55);
      setExportProgress(Math.round(fakeVal));
    }, 180);

    xhr.onprogress = (e) => {
      if (e.lengthComputable) {
        clearInterval(fakeTimerRef.current);
        setExportProgress(Math.round((e.loaded / e.total) * 60));
      }
    };

    xhr.onload = () => {
      clearInterval(fakeTimerRef.current);
      if (xhr.status !== 200) {
        setExportStatus("idle"); setExportType(null); setExportProgress(0); return;
      }
      setExportStatus("generating"); setExportProgress(65);

      try {
        const json   = JSON.parse(xhr.responseText);
        const rows   = json.data || [];
        const mapped = rows.map((i: any) => ({
          ID:       i.id,
          From:     i.contactName || i.fromNumber || "—",
          To:       i.user?.name  || i.toNumber   || "—",
          Duration: secondsToHms(i.duration),
          Status:   i.status,
          Date:     formatDateNice(i.startTime),
          Agent:    i.user?.name || "Unknown",
        }));

        setExportProgress(80);

        if (type === "excel") {
          const ws = XLSX.utils.json_to_sheet(mapped);
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, "Inbound Calls");
          setExportProgress(95);
          XLSX.writeFile(wb, `Inbound_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
        } else {
          const doc = new jsPDF();
          doc.setFontSize(16);
          doc.text("Inbound Calls Report", 105, 20, { align: "center" });
          doc.setFontSize(10); doc.setTextColor(150);
          doc.text(`Generated: ${new Date().toLocaleString()}  |  Total: ${rows.length} records`, 105, 28, { align: "center" });
          setExportProgress(90);
          autoTable(doc, {
            head: [["ID", "From", "To", "Duration", "Status", "Date", "Agent"]],
            body: mapped.map((r: any) => [r.ID, r.From, r.To, r.Duration, r.Status, r.Date, r.Agent]),
            startY: 36, theme: "grid",
            styles: { fontSize: 8, cellPadding: 3 },
            headStyles: { fillColor: [91, 91, 214] },
          });
          setExportProgress(95);
          doc.save(`Inbound_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
        }

        setExportProgress(100); setExportStatus("done");
        setTimeout(() => { setExportStatus("idle"); setExportType(null); setExportProgress(0); }, 2000);
      } catch {
        setExportStatus("idle"); setExportType(null); setExportProgress(0);
      }
    };

    xhr.onerror = xhr.onabort = () => {
      clearInterval(fakeTimerRef.current);
      setExportStatus("idle"); setExportType(null); setExportProgress(0);
    };

    xhr.send();
  };

  // ── Sub-components ──
  function StatCard({ label, value, icon: Icon, accent }: any) {
    return (
      <div style={{ background: cardBg, borderRadius: 16, border: `1px solid ${cardBorder}`, boxShadow: cardShadow, padding: "18px 20px", position: "relative", overflow: "visible" }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, borderRadius: "16px 16px 0 0", background: accent }} />
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: `${accent}${isDark ? "22" : "18"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Icon size={20} color={accent} />
          </div>
          <div>
            <p style={{ margin: "0 0 2px", fontSize: 11.5, fontWeight: 700, color: textMuted, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</p>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: textPrimary, letterSpacing: "-0.4px" }}>{value}</p>
          </div>
        </div>
      </div>
    );
  }

  function DatePickerDropdown({ dateFilter, setDateFilter, customStart, setCustomStart, customEnd, setCustomEnd }: any) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
      const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
      document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
    }, []);
    const label = dateFilter === "all" ? "All Time" : dateFilter === "today" ? "Today" : dateFilter === "week" ? "This Week" : dateFilter === "month" ? "This Month" : (customStart && customEnd) ? `${customStart} → ${customEnd}` : "Custom Range";
    const presets: DateFilter[] = ["all", "today", "week", "month"];
    const presetLabels: Record<string, string> = { all: "All Time", today: "Today", week: "This Week", month: "This Month" };
    return (
      <div ref={ref} style={{ position: "relative" }}>
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={() => setOpen(o => !o)}
          style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 14px", borderRadius: 10, border: `1px solid ${inputBorder}`, background: inputBg, color: textPrimary, fontSize: 13.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
          <Filter size={14} color={textMuted} />{label}<ChevronDown size={13} color={textMuted} />
        </motion.button>
        <AnimatePresence>
          {open && (
            <motion.div initial={{ opacity: 0, y: -6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.97 }} transition={{ duration: 0.15 }}
              style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, width: 260, background: dropdownBg, borderRadius: 14, border: `1px solid ${dropdownBord}`, boxShadow: isDark ? "0 12px 36px rgba(0,0,0,0.55)" : "0 12px 36px rgba(0,0,0,0.12)", zIndex: 9999, overflow: "hidden" }}>
              <div style={{ padding: "8px 6px" }}>
                {presets.map(f => (
                  <button key={f} onClick={() => { setDateFilter(f); setCustomStart(""); setCustomEnd(""); setOpen(false); }}
                    style={{ display: "block", width: "100%", textAlign: "left", padding: "9px 12px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13.5, fontWeight: dateFilter === f ? 700 : 500, background: dateFilter === f ? accentBg : "transparent", color: dateFilter === f ? accentMain : textPrimary, fontFamily: "inherit" }}>
                    {presetLabels[f]}
                  </button>
                ))}
                <button onClick={() => setDateFilter("custom")}
                  style={{ display: "block", width: "100%", textAlign: "left", padding: "9px 12px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13.5, fontWeight: dateFilter === "custom" ? 700 : 500, background: dateFilter === "custom" ? accentBg : "transparent", color: dateFilter === "custom" ? accentMain : textPrimary, fontFamily: "inherit" }}>
                  Custom Range
                </button>
              </div>
              <AnimatePresence>
                {dateFilter === "custom" && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: "hidden", borderTop: `1px solid ${thBorder}` }}>
                    <div style={{ padding: "14px 14px 10px" }}>
                      {[{ label: "Start Date", val: customStart, set: setCustomStart }, { label: "End Date", val: customEnd, set: setCustomEnd }].map(({ label: lbl, val, set }) => (
                        <div key={lbl} style={{ marginBottom: 10 }}>
                          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: textMuted, marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em" }}>{lbl}</label>
                          <DateInput value={val} onChange={(v) => set(v)} style={{ width: "100%", boxSizing: "border-box", borderRadius: 8 }} />
                        </div>
                      ))}
                      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                        onClick={() => { if (customStart && customEnd) setOpen(false); }} disabled={!customStart || !customEnd}
                        style={{ width: "100%", padding: "9px", borderRadius: 9, border: "none", background: (!customStart || !customEnd) ? (isDark ? "#2A2A3A" : "#BBBBC8") : accentMain, color: (!customStart || !customEnd) ? textMuted : "#fff", fontWeight: 700, fontSize: 13, cursor: (!customStart || !customEnd) ? "not-allowed" : "pointer", marginTop: 4, fontFamily: "inherit" }}>
                        Apply Range
                      </motion.button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  function DurationFilter({ minDur, maxDur, onApply, onClear }: any) {
    const [open, setOpen]         = useState(false);
    const [localMin, setLocalMin] = useState(minDur);
    const [localMax, setLocalMax] = useState(maxDur);
    const [minFocused, setMinFocused] = useState(false);
    const [maxFocused, setMaxFocused] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
      const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
      document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
    }, []);
    useEffect(() => { setLocalMin(minDur); }, [minDur]);
    useEffect(() => { setLocalMax(maxDur); }, [maxDur]);
    const isActive    = minDur !== "" || maxDur !== "";
    const handleApply = () => { onApply(localMin, localMax); setOpen(false); };
    const handleClear = (e?: React.MouseEvent) => { e?.stopPropagation(); setLocalMin(""); setLocalMax(""); onClear(); setOpen(false); };
    const label = isActive ? `${minDur !== "" ? `${minDur}s` : "0s"} – ${maxDur !== "" ? `${maxDur}s` : "∞"}` : "Duration";
    return (
      <div ref={ref} style={{ position: "relative" }}>
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={() => setOpen(o => !o)}
          style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 12px", borderRadius: 10, border: `1px solid ${isActive ? (isDark ? "rgba(124,124,240,0.35)" : "rgba(91,91,214,0.35)") : inputBorder}`, background: isActive ? accentBg : inputBg, color: isActive ? accentMain : textPrimary, fontSize: 13.5, fontWeight: isActive ? 700 : 600, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s" }}>
          <Clock size={14} color={isActive ? accentMain : textMuted} />{label}
          {isActive
            ? <span onClick={handleClear} style={{ width: 16, height: 16, borderRadius: "50%", background: isDark ? "rgba(124,124,240,0.25)" : "rgba(91,91,214,0.20)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}><X size={9} color={accentMain} /></span>
            : <ChevronDown size={13} color={textMuted} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
          }
        </motion.button>
        <AnimatePresence>
          {open && (
            <motion.div initial={{ opacity: 0, y: -6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.97 }} transition={{ duration: 0.15 }}
              style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, width: 240, background: dropdownBg, borderRadius: 14, border: `1px solid ${dropdownBord}`, boxShadow: isDark ? "0 12px 36px rgba(0,0,0,0.55)" : "0 12px 36px rgba(0,0,0,0.12)", zIndex: 9999, padding: "16px 14px 14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
                <div style={{ width: 26, height: 26, borderRadius: 7, background: accentBg, display: "flex", alignItems: "center", justifyContent: "center" }}><Clock size={13} color={accentMain} /></div>
                <span style={{ fontSize: 12.5, fontWeight: 800, color: textPrimary }}>Filter by Duration</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                {[
                  { lbl: "Min (sec)", val: localMin, set: setLocalMin, focused: minFocused, setF: setMinFocused, ph: "0" },
                  { lbl: "Max (sec)", val: localMax, set: setLocalMax, focused: maxFocused, setF: setMaxFocused, ph: "∞" },
                ].map(({ lbl, val, set, focused, setF, ph }) => (
                  <div key={lbl}>
                    <label style={{ display: "block", fontSize: 10.5, fontWeight: 700, color: textMuted, marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em" }}>{lbl}</label>
                    <div style={{ border: `1.5px solid ${focused ? (isDark ? "rgba(124,124,240,0.45)" : "rgba(91,91,214,0.45)") : inputBorder}`, borderRadius: 9, background: durInputBg, boxShadow: focused ? `0 0 0 3px ${accentBg}` : "none", transition: "all 0.15s", overflow: "hidden" }}>
                      <input type="number" min="0" placeholder={ph} value={val}
                        onChange={e => set(e.target.value)} onFocus={() => setF(true)} onBlur={() => setF(false)}
                        onKeyDown={e => { if (e.key === "Enter") handleApply(); }}
                        style={{ border: "none", outline: "none", background: "transparent", padding: "8px 10px", fontSize: 13, fontWeight: 600, color: textPrimary, fontFamily: "inherit", width: "100%", boxSizing: "border-box" }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <p style={{ margin: "0 0 12px", fontSize: 11.5, color: durHintClr, lineHeight: 1.4 }}>Values in seconds. Leave blank for no limit.</p>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => handleClear()}
                  style={{ flex: 1, padding: "8px 0", borderRadius: 9, border: `1px solid ${inputBorder}`, background: isDark ? "rgba(255,255,255,0.06)" : "#F6F7F9", color: textSecond, fontWeight: 700, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit" }}>
                  Clear
                </button>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={handleApply}
                  style={{ flex: 2, padding: "8px 0", borderRadius: 9, border: "none", background: accentMain, color: "#fff", fontWeight: 700, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit", boxShadow: isDark ? "0 2px 8px rgba(124,124,240,0.35)" : "0 2px 8px rgba(91,91,214,0.28)" }}>
                  Apply Filter
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ── Export modal helpers ──
  const exportSteps   = [
    { key: "fetching",   label: "Fetching all filtered records" },
    { key: "generating", label: `Generating ${exportType?.toUpperCase() ?? ""} file` },
  ];
  const stepStatuses  = ["fetching", "generating", "done"];
  const currentStepIdx = stepStatuses.indexOf(exportStatus);

  return (
    <div style={{ minHeight: "100vh", background: pageBg, paddingBottom: 48, fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <style>{`
        @keyframes spin  { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.55;transform:scale(0.82)} }
      `}</style>

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => navigate("/admin/reports")}
            style={{ width: 38, height: 38, borderRadius: 10, border: `1px solid ${backBtnBord}`, background: backBtnBg, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <ArrowLeft size={17} color={textSecond} />
          </motion.button>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: textPrimary, letterSpacing: "-0.3px" }}>Inbound Report</h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div style={{ width: 200 }}>
            <Select options={[{ value: null, label: "All Agents" }, ...agentsList]} value={agentFilter || { value: null, label: "All Agents" }} styles={selectStyles} onChange={setAgentFilter} isSearchable />
          </div>
          <div style={{ width: 180 }}>
            <Select styles={selectStyles} options={[{ value: null, label: "All Status" }, { value: "connected", label: "Connected" }, { value: "not_connected", label: "Not Connected" }]} value={statusFilter || { value: null, label: "All Status" }} onChange={setStatusFilter} />
          </div>
          <DurationFilter minDur={minDur} maxDur={maxDur} onApply={(min: string, max: string) => { setMinDur(min); setMaxDur(max); }} onClear={() => { setMinDur(""); setMaxDur(""); }} />
          <DatePickerDropdown dateFilter={dateFilter} setDateFilter={setDateFilter} customStart={customStart} setCustomStart={setCustomStart} customEnd={customEnd} setCustomEnd={setCustomEnd} />
        </div>
      </div>

      {/* ── Stats ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 24 }}>
        <StatCard label="Total Inbound" value={stats.totalInbound ?? 0} icon={PhoneIncoming} accent={accentMain} />
        <StatCard label="Connected"      value={stats.connected}          icon={PhoneCall}     accent="#10B981" />
        <StatCard label="Not Connected"  value={stats.notConnected}       icon={PhoneOff}      accent="#EF4444" />
        <StatCard label="Talk Time"       value={secondsToHms(stats.talkTime ?? 0)} icon={Mic} accent="#F59E0B" />
      </div>

      {/* ── Table card ── */}
      <div style={card}>

        {/* Toolbar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: `1px solid ${thBorder}`, background: toolbarBg, flexWrap: "wrap", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: textPrimary }}>Inbound Calls</span>
            <span style={{ fontSize: 12, fontWeight: 700, background: isDurationActive ? accentBg : (isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)"), color: isDurationActive ? accentMain : textMuted, borderRadius: 99, padding: "2px 10px", border: `1px solid ${isDurationActive ? (isDark ? "rgba(124,124,240,0.25)" : "rgba(91,91,214,0.20)") : (isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)")}`, transition: "all 0.2s" }}>
              {totalRecords} records
            </span>
            {isDurationActive && (
              <motion.span initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, fontWeight: 700, color: accentMain, background: accentBg, border: `1px solid ${isDark ? "rgba(124,124,240,0.25)" : "rgba(91,91,214,0.20)"}`, borderRadius: 8, padding: "3px 9px" }}>
                <Clock size={11} />
                {minDur !== "" ? `${minDur}s` : "0s"} – {maxDur !== "" ? `${maxDur}s` : "∞"}
                <button onClick={() => { setMinDur(""); setMaxDur(""); }}
                  style={{ width: 14, height: 14, borderRadius: "50%", background: isDark ? "rgba(124,124,240,0.20)" : "rgba(91,91,214,0.15)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: 0 }}>
                  <X size={8} color={accentMain} />
                </button>
              </motion.span>
            )}
          </div>

          {/* Export buttons */}
          <div style={{ display: "flex", gap: 8 }}>
            <motion.button
              whileHover={{ scale: exportStatus !== "idle" ? 1 : 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => triggerExport("excel")}
              disabled={!inboundData.length || exportStatus !== "idle"}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 9, border: "1px solid rgba(16,185,129,0.3)", background: exportType === "excel" && exportStatus !== "idle" ? "rgba(16,185,129,0.15)" : "rgba(16,185,129,0.08)", color: "#059669", fontWeight: 700, fontSize: 12.5, cursor: (!inboundData.length || exportStatus !== "idle") ? "not-allowed" : "pointer", opacity: (!inboundData.length || (exportStatus !== "idle" && exportType !== "excel")) ? 0.45 : 1, transition: "all 0.15s", fontFamily: "inherit" }}>
              <FileSpreadsheet size={13} />
              {exportType === "excel" && exportStatus !== "idle" ? `${exportProgress}%` : "Excel"}
            </motion.button>
            <motion.button
              whileHover={{ scale: exportStatus !== "idle" ? 1 : 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => triggerExport("pdf")}
              disabled={!inboundData.length || exportStatus !== "idle"}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 9, border: "1px solid rgba(239,68,68,0.3)", background: exportType === "pdf" && exportStatus !== "idle" ? "rgba(239,68,68,0.15)" : "rgba(239,68,68,0.08)", color: "#DC2626", fontWeight: 700, fontSize: 12.5, cursor: (!inboundData.length || exportStatus !== "idle") ? "not-allowed" : "pointer", opacity: (!inboundData.length || (exportStatus !== "idle" && exportType !== "pdf")) ? 0.45 : 1, transition: "all 0.15s", fontFamily: "inherit" }}>
              <FileText size={13} />
              {exportType === "pdf" && exportStatus !== "idle" ? `${exportProgress}%` : "PDF"}
            </motion.button>
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>{["ID", "From", "To", "Duration", "Status", "Date", "Agent"].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {isLoading || isFetching ? (
                <tr><td colSpan={7} style={{ textAlign: "center", padding: "56px 0" }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", border: `3px solid ${spinBorder}`, borderTopColor: accentMain, animation: "spin 0.7s linear infinite", margin: "0 auto 10px" }} />
                  <p style={{ margin: 0, fontSize: 13, color: textMuted }}>Loading inbound calls…</p>
                </td></tr>
              ) : error ? (
                <tr><td colSpan={7} style={{ textAlign: "center", padding: "48px 0" }}>
                  <p style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 700, color: "#EF4444" }}>{error}</p>
                  <motion.button whileHover={{ scale: 1.03 }} onClick={fetchData} style={{ padding: "8px 20px", borderRadius: 9, border: "none", background: accentMain, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Retry</motion.button>
                </td></tr>
              ) : inboundData.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: "center", padding: "56px 0" }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: accentBg, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
                    {isDurationActive ? <Clock size={20} color={accentMain} /> : <PhoneOff size={20} color={accentMain} />}
                  </div>
                  <p style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 700, color: textPrimary }}>{isDurationActive ? "No calls match this duration range" : "No inbound calls found"}</p>
                  <p style={{ margin: 0, fontSize: 13, color: textMuted }}>{isDurationActive ? "Try adjusting the min / max seconds" : "Try changing the date or agent filter"}</p>
                  {isDurationActive && (
                    <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => { setMinDur(""); setMaxDur(""); }}
                      style={{ marginTop: 14, padding: "7px 18px", borderRadius: 9, border: "none", background: accentMain, color: "#fff", fontWeight: 700, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit" }}>
                      Clear Duration Filter
                    </motion.button>
                  )}
                </td></tr>
              ) : (
                inboundData.map((item, idx) => (
                  <motion.tr key={item.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.015 }}
                    style={{ transition: "background 0.12s" }}
                    onMouseEnter={e => (e.currentTarget.style.background = rowHover)}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                    <td style={{ ...tdStyle, color: textMuted, fontSize: 12 }}>{item.id}</td>
                    <td style={tdStyle}>{item.contactName || item.from}</td>
                    <td style={tdStyle}>{item.agentName || item.to}</td>
                    <td style={{ ...tdStyle, color: textSecond }}>{secondsToHms(item.duration) || "—"}</td>
                    <td style={tdStyle}><StatusBadge status={item.status} /></td>
                    <td style={{ ...tdStyle, color: textSecond }}>{formatDateNice(item.startTime || item.date || item.createdAt)}</td>
                    <td style={tdStyle}>{item.agentName || "Unknown"}</td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderTop: `1px solid ${thBorder}`, background: paginBg, flexWrap: "wrap", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 12.5, color: textMuted, fontWeight: 600 }}>Rows per page:</span>
              <select value={limit} onChange={e => setLimit(Number(e.target.value))}
                style={{ padding: "5px 10px", borderRadius: 8, border: `1px solid ${inputBorder}`, background: inputBg, fontSize: 13, color: textPrimary, cursor: "pointer", outline: "none" }}>
                {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} disabled={page === 1 || isFetching} onClick={() => setPage(p => p - 1)}
                style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${navBtnBord}`, background: navBtnBg, display: "flex", alignItems: "center", justifyContent: "center", cursor: page === 1 ? "not-allowed" : "pointer", opacity: page === 1 ? 0.4 : 1 }}>
                <ChevronLeft size={15} color={textSecond} />
              </motion.button>
              <span style={{ padding: "4px 14px", borderRadius: 8, background: accentMain, color: "#fff", fontSize: 13, fontWeight: 700 }}>{page}</span>
              <span style={{ fontSize: 13, color: textMuted }}>of {totalPages}</span>
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} disabled={page === totalPages || isFetching} onClick={() => setPage(p => p + 1)}
                style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${navBtnBord}`, background: navBtnBg, display: "flex", alignItems: "center", justifyContent: "center", cursor: page === totalPages ? "not-allowed" : "pointer", opacity: page === totalPages ? 0.4 : 1 }}>
                <ChevronRight size={15} color={textSecond} />
              </motion.button>
            </div>
          </div>
        )}
      </div>

      {/* ── Export Progress Modal ── */}
      <AnimatePresence>
        {exportStatus !== "idle" && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, zIndex: 99999, background: "rgba(0,0,0,0.50)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <motion.div
              initial={{ scale: 0.90, opacity: 0, y: 20 }}
              animate={{ scale: 1,    opacity: 1, y: 0  }}
              exit={{   scale: 0.90, opacity: 0, y: 20  }}
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
              style={{ width: 360, background: cardBg, borderRadius: 22, border: `1px solid ${cardBorder}`, boxShadow: isDark ? "0 28px 70px rgba(0,0,0,0.70)" : "0 28px 70px rgba(0,0,0,0.20)", padding: "28px 26px 24px", display: "flex", flexDirection: "column", gap: 20 }}>

              {/* Icon + title */}
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 50, height: 50, borderRadius: 14, flexShrink: 0, background: exportStatus === "done" ? "rgba(16,185,129,0.12)" : exportType === "excel" ? "rgba(16,185,129,0.10)" : "rgba(239,68,68,0.10)", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.3s" }}>
                  {exportStatus === "done"
                    ? <CheckCircle size={24} color="#10B981" />
                    : exportType === "excel"
                      ? <FileSpreadsheet size={24} color="#059669" />
                      : <FileText size={24} color="#DC2626" />
                  }
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: textPrimary, letterSpacing: "-0.2px" }}>
                    {exportStatus === "done" ? "Download Complete!" : exportType === "excel" ? "Exporting Excel…" : "Exporting PDF…"}
                  </p>
                  <p style={{ margin: "4px 0 0", fontSize: 12.5, color: textMuted }}>
                    {exportStatus === "fetching"   && "Fetching records from server…"}
                    {exportStatus === "generating" && `Generating ${exportType?.toUpperCase()} file…`}
                    {exportStatus === "done"       && "Your file has been saved successfully."}
                  </p>
                </div>
              </div>

              {/* Progress bar */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: textSecond }}>
                    {exportStatus === "fetching"   ? "Downloading data"
                     : exportStatus === "generating" ? "Building file"
                     : "Complete"}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: exportStatus === "done" ? "#10B981" : accentMain, transition: "color 0.3s" }}>
                    {exportProgress}%
                  </span>
                </div>
                <div style={{ height: 8, borderRadius: 99, background: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)", overflow: "hidden" }}>
                  <motion.div
                    animate={{ width: `${exportProgress}%` }}
                    transition={{ ease: "easeOut", duration: 0.35 }}
                    style={{ height: "100%", borderRadius: 99, background: exportStatus === "done" ? "linear-gradient(90deg,#10B981,#34D399)" : exportType === "excel" ? "linear-gradient(90deg,#059669,#34D399)" : "linear-gradient(90deg,#DC2626,#F87171)" }}
                  />
                </div>
              </div>

              {/* Steps */}
              {exportStatus !== "done" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {exportSteps.map(({ key, label }, idx) => {
                    const stepIdx  = stepStatuses.indexOf(key);
                    const isDone   = currentStepIdx > stepIdx;
                    const isActive = currentStepIdx === stepIdx;
                    return (
                      <div key={key} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ width: 24, height: 24, borderRadius: "50%", flexShrink: 0, border: `2px solid ${isDone ? "#10B981" : isActive ? accentMain : (isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.10)")}`, background: isDone ? "#10B981" : isActive ? accentBg : "transparent", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.25s" }}>
                          {isDone
                            ? <svg width="11" height="11" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            : isActive
                              ? <div style={{ width: 8, height: 8, borderRadius: "50%", background: accentMain, animation: "pulse 1s ease-in-out infinite" }} />
                              : <span style={{ fontSize: 9, fontWeight: 700, color: textMuted }}>{idx + 1}</span>
                          }
                        </div>
                        <span style={{ fontSize: 13, fontWeight: isActive ? 700 : 500, color: isActive ? textPrimary : textMuted, transition: "all 0.2s" }}>
                          {label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Cancel / Close */}
              <motion.button
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                onClick={exportStatus === "done"
                  ? () => { setExportStatus("idle"); setExportType(null); setExportProgress(0); }
                  : cancelExport}
                style={{ padding: "11px 0", borderRadius: 12, border: `1px solid ${exportStatus === "done" ? "rgba(16,185,129,0.35)" : inputBorder}`, background: exportStatus === "done" ? "rgba(16,185,129,0.08)" : isDark ? "rgba(255,255,255,0.05)" : "#F6F7F9", color: exportStatus === "done" ? "#10B981" : textSecond, fontWeight: 700, fontSize: 13.5, cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s" }}>
                {exportStatus === "done" ? "Close" : "Cancel Download"}
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}