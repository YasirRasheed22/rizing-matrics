// src/pages/admin/PerformanceReportPage.tsx
// @ts-nocheck
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Filter, ChevronDown, ArrowLeft, Users, ClipboardList,
  BadgeCheck, DollarSign, TrendingUp, PhoneCall, PhoneMissed,
  FileSpreadsheet, FileText, Search, X,
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
import { formatToCurrency } from "../../main";

type DateFilter = "all" | "today" | "week" | "month" | "custom";

const AVATAR_COLORS = ["#5B5BD6","#10B981","#F59E0B","#EF4444","#8B5CF6","#06B6D4","#F97316"];
function nameColor(name: string) {
  let h = 0;
  for (let i = 0; i < (name || "").length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

export default function PerformanceReportPage() {
  const { token } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const navigate = useNavigate();

  const pageBg      = isDark ? "#0F0F14"                  : "#F6F7F9";
  const cardBg      = isDark ? "rgba(23,23,31,0.95)"      : "#fff";
  const cardBorder  = isDark ? "rgba(255,255,255,0.07)"   : "rgba(0,0,0,0.07)";
  const cardShadow  = isDark ? "0 2px 12px rgba(0,0,0,0.40)" : "0 2px 12px rgba(0,0,0,0.06)";
  const textPrimary = isDark ? "#F0F0F5"                  : "#0D0D12";
  const textSecond  = isDark ? "#A0A0B0"                  : "#6B6B7B";
  const textMuted   = isDark ? "#68687A"                  : "#9E9EAD";
  const accentMain  = isDark ? "#7C7CF0"                  : "#5B5BD6";
  const accentBg    = isDark ? "rgba(124,124,240,0.12)"   : "rgba(91,91,214,0.09)";
  const inputBg     = isDark ? "rgba(30,30,42,0.90)"      : "#F6F7F9";
  const inputBorder = isDark ? "rgba(255,255,255,0.09)"   : "rgba(0,0,0,0.10)";
  const thBg        = isDark ? "rgba(255,255,255,0.03)"   : "#FAFAFA";
  const thBorder    = isDark ? "rgba(255,255,255,0.06)"   : "rgba(0,0,0,0.07)";
  const tdBorder    = isDark ? "rgba(255,255,255,0.045)"  : "rgba(0,0,0,0.05)";
  const rowHover    = isDark ? "rgba(255,255,255,0.03)"   : "#FAFAFA";
  const toolbarBg   = isDark ? "rgba(255,255,255,0.02)"   : "#FAFAFA";
  const backBtnBg   = isDark ? "rgba(255,255,255,0.06)"   : "#fff";
  const backBtnBord = isDark ? "rgba(255,255,255,0.09)"   : "rgba(0,0,0,0.08)";
  const dropdownBg  = isDark ? "rgba(23,23,31,0.98)"      : "#fff";
  const dropdownBord= isDark ? "rgba(255,255,255,0.09)"   : "rgba(0,0,0,0.08)";
  const spinBorder  = isDark ? "rgba(124,124,240,0.15)"   : "rgba(91,91,214,0.15)";
  const searchBg    = isDark ? "rgba(30,30,42,0.90)"      : "#fff";
  const footerBg    = isDark ? "rgba(255,255,255,0.02)"   : "#FAFAFA";

  const card: React.CSSProperties = { background: cardBg, borderRadius: 16, border: `1px solid ${cardBorder}`, boxShadow: cardShadow, overflow: "hidden" };
  const thStyle: React.CSSProperties = { padding: "11px 14px", fontSize: 11, fontWeight: 700, color: textMuted, textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "left", background: thBg, borderBottom: `1px solid ${thBorder}`, whiteSpace: "nowrap" };
  const tdStyle: React.CSSProperties = { padding: "13px 14px", fontSize: 13, color: textPrimary, borderBottom: `1px solid ${tdBorder}`, whiteSpace: "nowrap" };

  const selectStyles = {
    control: (p: any, s: any) => ({ ...p, border: `1px solid ${inputBorder}`, borderRadius: 10, padding: "2px 4px", background: inputBg, minHeight: 40, boxShadow: s.isFocused ? `0 0 0 3px ${accentBg}` : "none", "&:hover": { borderColor: isDark ? "rgba(124,124,240,0.35)" : "rgba(91,91,214,0.35)" }, fontSize: 13.5 }),
    menu: (p: any) => ({ ...p, borderRadius: 10, background: dropdownBg, border: `1px solid ${dropdownBord}`, boxShadow: isDark ? "0 12px 32px rgba(0,0,0,0.55)" : "0 12px 32px rgba(0,0,0,0.12)", zIndex: 99999 }),
    option: (p: any, s: any) => ({ ...p, background: s.isSelected ? accentMain : s.isFocused ? accentBg : "transparent", color: s.isSelected ? "#fff" : textPrimary, fontSize: 13.5, padding: "9px 14px" }),
    placeholder: (p: any) => ({ ...p, color: textMuted, fontSize: 13.5 }),
    singleValue: (p: any) => ({ ...p, color: textPrimary, fontSize: 13.5 }),
    indicatorSeparator: () => ({ display: "none" }),
    dropdownIndicator: (p: any) => ({ ...p, color: textMuted }),
    input: (p: any) => ({ ...p, color: textPrimary }),
  };

  function StatCard({ label, value, icon: Icon, accent }: any) {
    return (
      <div style={{ background: cardBg, borderRadius: 16, border: `1px solid ${cardBorder}`, boxShadow: cardShadow, padding: "16px 18px", position: "relative", overflow: "visible" }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, borderRadius: "16px 16px 0 0", background: accent }} />
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: `${accent}${isDark ? "22" : "18"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Icon size={18} color={accent} />
          </div>
          <div>
            <p style={{ margin: "0 0 2px", fontSize: 11, fontWeight: 700, color: textMuted, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</p>
            <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: textPrimary, letterSpacing: "-0.3px" }}>{value}</p>
          </div>
        </div>
      </div>
    );
  }

  function DatePickerDropdown({ dateFilter, setDateFilter, customStart, setCustomStart, customEnd, setCustomEnd }: any) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => { const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }; document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h); }, []);
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
                {presets.map(f => (<button key={f} onClick={() => { setDateFilter(f); setCustomStart(""); setCustomEnd(""); setOpen(false); }} style={{ display: "block", width: "100%", textAlign: "left", padding: "9px 12px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13.5, fontWeight: dateFilter === f ? 700 : 500, background: dateFilter === f ? accentBg : "transparent", color: dateFilter === f ? accentMain : textPrimary, fontFamily: "inherit" }}>{presetLabels[f]}</button>))}
                <button onClick={() => setDateFilter("custom")} style={{ display: "block", width: "100%", textAlign: "left", padding: "9px 12px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13.5, fontWeight: dateFilter === "custom" ? 700 : 500, background: dateFilter === "custom" ? accentBg : "transparent", color: dateFilter === "custom" ? accentMain : textPrimary, fontFamily: "inherit" }}>Custom Range</button>
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
                      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={() => { if (customStart && customEnd) setOpen(false); }} disabled={!customStart || !customEnd}
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

  const [dateFilter, setDateFilter] = useState<DateFilter>("week");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [agentFilter, setAgentFilter] = useState<any>(null);
  const [agentsList, setAgentsList] = useState<any[]>([]);
  const [reportData, setReportData] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [stats, setStats] = useState({ totalLeads: 0, totalSales: 0, totalSaleAmount: 0, dialed: 0, received: 0, connected: 0, missed: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { if (!token) return; api.get("/auth/all").then(res => setAgentsList(res.data.map((a: any) => ({ value: a.id, label: a.name || a.email })))).catch(console.error); }, [token]);

  const fetchData = async () => {
    setIsFetching(true); setError(null);
    try {
      const params = new URLSearchParams();
      params.append("page", "1"); params.append("limit", "1000"); params.append("dateFilter", dateFilter);
      params.append("agentId", agentFilter?.value ?? "");
      if (dateFilter === "custom" && customStart && customEnd) { params.append("startDate", customStart); params.append("endDate", customEnd); }
      const res = await api.get(`/voice/reports/agents?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = res.data.data || [];
      setReportData(data);
      const agg = data.reduce((acc: any, item: any) => {
        acc.totalLeads += item.totalLeads || 0; acc.totalSales += item.totalSales || 0;
        acc.totalSaleAmount += item.totalSaleAmount || 0; acc.dialed += item.dialed || 0;
        acc.received += item.received || 0; acc.connected += item.connected || 0; acc.missed += item.missed || 0;
        return acc;
      }, { totalLeads: 0, totalSales: 0, totalSaleAmount: 0, dialed: 0, received: 0, connected: 0, missed: 0 });
      setStats(agg);
    } catch { setError("Failed to load agent report. Please try again."); }
    finally { setIsFetching(false); setIsLoading(false); }
  };

  useEffect(() => { if (token) fetchData(); }, [token, dateFilter, customStart, customEnd, agentFilter]);

  const dispositionColumns = reportData.length > 0 ? (reportData[0].dispositionStats || []) : [];
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return reportData;
    const q = searchQuery.toLowerCase();
    return reportData.filter(item => (item.agentName || "").toLowerCase().includes(q));
  }, [reportData, searchQuery]);

  const downloadExcel = () => {
    if (!filteredData.length) return;
    const rows = filteredData.map(item => {
      const base: any = { AgentName: item.agentName, Dialed: item.dialed, Received: item.received, Connected: item.connected, Missed: item.missed, TotalLeads: item.totalLeads, TotalSales: item.totalSales, SaleAmount: item.totalSaleAmount };
      dispositionColumns.forEach((d: any) => { const found = item.dispositionStats?.find((x: any) => x.id === d.id); base[d.name] = found?.count || 0; });
      return base;
    });
    const ws = XLSX.utils.json_to_sheet(rows); const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Agent Report");
    XLSX.writeFile(wb, `Agent_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const downloadPDF = () => {
    if (!filteredData.length) return;
    const doc = new jsPDF(); doc.setFontSize(14); doc.text("Agent Performance Report", 105, 16, { align: "center" });
    const head = [["Agent", "Dialed", "Received", "Connected", "Missed", "Leads", "Sales", "Amount", ...dispositionColumns.map((d: any) => d.name)]];
    const body = filteredData.map(item => [item.agentName, item.dialed, item.received, item.connected, item.missed, item.totalLeads, item.totalSales, item.totalSaleAmount, ...dispositionColumns.map((d: any) => { const found = item.dispositionStats?.find((x: any) => x.id === d.id); return found?.count || 0; })]);
    autoTable(doc, { head, body, startY: 24, theme: "grid", styles: { fontSize: 8 }, headStyles: { fillColor: [91, 91, 214] } });
    doc.save(`Agent_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const colSpan = 8 + dispositionColumns.length;

  return (
    <div style={{ minHeight: "100vh", background: pageBg, paddingBottom: 48, fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => navigate("/admin/reports")}
            style={{ width: 38, height: 38, borderRadius: 10, border: `1px solid ${backBtnBord}`, background: backBtnBg, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <ArrowLeft size={17} color={textSecond} />
          </motion.button>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: textPrimary, letterSpacing: "-0.3px" }}>Agent Performance Report</h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div style={{ width: 220 }}><Select options={[{ value: null, label: "All Agents" }, ...agentsList]} value={agentFilter || { value: null, label: "All Agents" }} styles={selectStyles} onChange={setAgentFilter} isSearchable /></div>
          <DatePickerDropdown dateFilter={dateFilter} setDateFilter={setDateFilter} customStart={customStart} setCustomStart={setCustomStart} customEnd={customEnd} setCustomEnd={setCustomEnd} />
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
        <StatCard label="Total Leads"  value={stats.totalLeads}                        icon={ClipboardList} accent={accentMain} />
        <StatCard label="Dialed"       value={stats.dialed}                             icon={TrendingUp}    accent="#8B5CF6" />
        <StatCard label="Received"     value={stats.received}                           icon={Users}         accent="#06B6D4" />
        <StatCard label="Connected"    value={stats.connected}                          icon={PhoneCall}     accent="#10B981" />
        <StatCard label="Missed"       value={stats.missed}                             icon={PhoneMissed}   accent="#EF4444" />
        <StatCard label="Total Sales"  value={stats.totalSales}                        icon={BadgeCheck}    accent="#F59E0B" />
        <StatCard label="Sale Amount"  value={formatToCurrency(stats.totalSaleAmount)} icon={DollarSign}    accent="#10B981" />
      </div>

      {/* Table */}
      <div style={card}>
        <div style={{ padding: "14px 20px", borderBottom: `1px solid ${thBorder}`, background: toolbarBg }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: textPrimary }}>
              {agentFilter?.value ? "Agent Details" : "All Agents Performance"}
              {filteredData.length > 0 && <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 600, color: textMuted }}>({filteredData.length} agent{filteredData.length !== 1 ? "s" : ""})</span>}
            </span>
            <div style={{ display: "flex", gap: 8 }}>
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={downloadExcel} disabled={!filteredData.length || isFetching} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 9, border: "1px solid rgba(16,185,129,0.3)", background: "rgba(16,185,129,0.08)", color: "#059669", fontWeight: 700, fontSize: 12.5, cursor: "pointer", opacity: (!filteredData.length || isFetching) ? 0.5 : 1 }}><FileSpreadsheet size={13} /> Excel</motion.button>
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={downloadPDF} disabled={!filteredData.length || isFetching} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 9, border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.08)", color: "#DC2626", fontWeight: 700, fontSize: 12.5, cursor: "pointer", opacity: (!filteredData.length || isFetching) ? 0.5 : 1 }}><FileText size={13} /> PDF</motion.button>
            </div>
          </div>
          <div style={{ position: "relative", maxWidth: 380 }}>
            <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: textMuted, pointerEvents: "none" }} />
            <input type="text" placeholder="Search agent by name…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              style={{ width: "100%", boxSizing: "border-box", padding: "9px 36px 9px 34px", borderRadius: 10, border: `1px solid ${inputBorder}`, background: searchBg, fontSize: 13.5, color: textPrimary, outline: "none", fontFamily: "inherit", transition: "border-color 0.15s" }}
              onFocus={e => (e.target.style.borderColor = isDark ? "rgba(124,124,240,0.45)" : "rgba(91,91,214,0.40)")}
              onBlur={e => (e.target.style.borderColor = inputBorder)}
            />
            {searchQuery && (<button onClick={() => setSearchQuery("")} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 2, display: "flex", alignItems: "center" }}><X size={13} color={textMuted} /></button>)}
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Agent", "Dialed", "Received", "Connected", "Missed", "Total Leads", "Total Sales", "Sale Amount"].map(h => <th key={h} style={thStyle}>{h}</th>)}
                {dispositionColumns.map((d: any) => <th key={d.id} style={{ ...thStyle, color: accentMain }}>{d.name}</th>)}
              </tr>
            </thead>
            <tbody>
              {isLoading || isFetching ? (
                <tr><td colSpan={colSpan} style={{ textAlign: "center", padding: "56px 0" }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", border: `3px solid ${spinBorder}`, borderTopColor: accentMain, animation: "spin 0.7s linear infinite", margin: "0 auto 10px" }} />
                  <p style={{ margin: 0, fontSize: 13, color: textMuted }}>Loading agent report…</p>
                </td></tr>
              ) : error ? (
                <tr><td colSpan={colSpan} style={{ textAlign: "center", padding: "48px 0" }}>
                  <p style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 700, color: "#EF4444" }}>{error}</p>
                  <motion.button whileHover={{ scale: 1.03 }} onClick={fetchData} style={{ padding: "8px 20px", borderRadius: 9, border: "none", background: accentMain, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Retry</motion.button>
                </td></tr>
              ) : filteredData.length === 0 ? (
                <tr><td colSpan={colSpan} style={{ textAlign: "center", padding: "56px 0" }}>
                  <div style={{ width: 48, height: 48, borderRadius: 14, background: accentBg, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
                    {searchQuery ? <Search size={22} color={accentMain} /> : <Users size={22} color={accentMain} />}
                  </div>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: textPrimary }}>{searchQuery ? `No agents match "${searchQuery}"` : "No data found"}</p>
                  <p style={{ margin: "4px 0 0", fontSize: 12.5, color: textMuted }}>{searchQuery ? "Try a different name" : "No agent data found for the selected filters"}</p>
                </td></tr>
              ) : (
                filteredData.map(item => {
                  const color    = nameColor(item.agentName || "?");
                  const initials = (item.agentName || "?").split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
                  return (
                    <tr key={item.agentId} style={{ transition: "background 0.12s" }}
                      onMouseEnter={e => (e.currentTarget.style.background = rowHover)}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    >
                      <td style={tdStyle}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ width: 30, height: 30, borderRadius: 8, background: `${color}${isDark ? "22" : "18"}`, border: `1px solid ${color}${isDark ? "35" : "30"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color, flexShrink: 0 }}>{initials}</div>
                          <span style={{ fontWeight: 600, color: textPrimary }}>{item.agentName || "Unknown"}</span>
                        </div>
                      </td>
                      <td style={tdStyle}>{item.dialed}</td>
                      <td style={tdStyle}>{item.received}</td>
                      <td style={tdStyle}><span style={{ fontWeight: 700, color: "#10B981" }}>{item.connected}</span></td>
                      <td style={tdStyle}><span style={{ fontWeight: 700, color: "#EF4444" }}>{item.missed}</span></td>
                      <td style={tdStyle}>{item.totalLeads}</td>
                      <td style={{ ...tdStyle, fontWeight: 700, color: accentMain }}>{item.totalSales}</td>
                      <td style={{ ...tdStyle, fontWeight: 700, color: textPrimary }}>{formatToCurrency(item.totalSaleAmount) || "—"}</td>
                      {dispositionColumns.map((d: any) => {
                        const found = item.dispositionStats?.find((x: any) => x.id === d.id);
                        const count = found?.count || 0;
                        return <td key={d.id} style={{ ...tdStyle, color: count > 0 ? accentMain : textMuted, fontWeight: count > 0 ? 700 : 400 }}>{count}</td>;
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {!isLoading && !isFetching && filteredData.length > 0 && (
          <div style={{ padding: "10px 20px", borderTop: `1px solid ${thBorder}`, background: footerBg, textAlign: "right" }}>
            <span style={{ fontSize: 12, color: textMuted }}>Showing {filteredData.length} agent{filteredData.length !== 1 ? "s" : ""}{searchQuery ? ` matching "${searchQuery}"` : ""}</span>
          </div>
        )}
      </div>
    </div>
  );
}