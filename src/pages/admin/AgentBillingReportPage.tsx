// src/pages/AgentBillingReportPage.tsx
//@ts-nocheck
import React, { useEffect, useState } from "react";
import {
  ChevronDown, Download, DollarSign, PhoneOutgoing,
  PhoneIncoming, MessageSquare, AlertCircle, ArrowLeft,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import api from "../../api";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import Select from "react-select";
import { useNavigate } from "react-router-dom";
import { DateInput } from "../../components/ui/AppDatePicker";

type DateFilter = "all" | "today" | "week" | "month" | "custom";

export default function AgentBillingReportPage() {
  const { token } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const navigate = useNavigate();

  // ── Design tokens ──
  const pageBg        = isDark ? "#0F0F14"                  : "#F8F9FC";
  const cardBg        = isDark ? "rgba(23,23,31,0.95)"      : "#fff";
  const cardBorder    = isDark ? "rgba(255,255,255,0.07)"   : "rgba(0,0,0,0.07)";
  const cardShadow    = isDark ? "0 2px 12px rgba(0,0,0,0.40)" : "0 2px 12px rgba(0,0,0,0.06)";
  const textPrimary   = isDark ? "#F0F0F5"                  : "#101828";
  const textSecondary = isDark ? "#A0A0B0"                  : "#344054";
  const textMuted     = isDark ? "#68687A"                  : "#6B7280";
  const accentMain    = isDark ? "#7C7CF0"                  : "#5B5BD6";
  const accentBg      = isDark ? "rgba(124,124,240,0.12)"   : "rgba(91,91,214,0.08)";
  const inputBg       = isDark ? "rgba(30,30,42,0.90)"      : "#F6F7F9";
  const inputBorder   = isDark ? "rgba(255,255,255,0.09)"   : "rgba(0,0,0,0.10)";
  const thBg          = isDark ? "rgba(255,255,255,0.03)"   : "#F9FAFB";
  const thBorder      = isDark ? "rgba(255,255,255,0.06)"   : "rgba(0,0,0,0.07)";
  const tdBorder      = isDark ? "rgba(255,255,255,0.05)"   : "rgba(0,0,0,0.05)";
  const rowHover      = isDark ? "rgba(255,255,255,0.04)"   : "#F9FAFB";
  const toolbarBg     = isDark ? "rgba(255,255,255,0.02)"   : "#F9FAFB";
  const paginBg       = isDark ? "rgba(255,255,255,0.02)"   : "#FAFAFA";
  const backBtnBg     = isDark ? "rgba(255,255,255,0.06)"   : "transparent";
  const backBtnBord   = isDark ? "rgba(255,255,255,0.09)"   : "transparent";
  const dateBtnBg     = isDark ? "rgba(30,30,42,0.90)"      : "#fff";
  const dateBtnBord   = isDark ? "rgba(255,255,255,0.09)"   : "rgba(0,0,0,0.10)";
  const dropdownBg    = isDark ? "rgba(23,23,31,0.98)"      : "#fff";
  const dropdownBord  = isDark ? "rgba(255,255,255,0.09)"   : "rgba(0,0,0,0.08)";
  const activeOptBg   = isDark ? "rgba(124,124,240,0.12)"   : "#EFF6FF";
  const activeOptClr  = isDark ? "#7C7CF0"                  : "#5B5BD6";
  const applyBtnBg    = isDark ? "rgba(124,124,240,0.12)"   : "#F97316";
  const spinBorder    = isDark ? "rgba(124,124,240,0.15)"   : "rgba(91,91,214,0.15)";

  const selectStyles = {
    control: (p: any, s: any) => ({
      ...p, border: `1px solid ${inputBorder}`, borderRadius: 8,
      padding: "2px 6px", background: inputBg, minHeight: 40, color: textPrimary,
      boxShadow: s.isFocused ? `0 0 0 3px ${accentBg}` : "none",
      "&:hover": { borderColor: isDark ? "rgba(124,124,240,0.35)" : "rgba(91,91,214,0.35)" },
    }),
    menu: (p: any) => ({
      ...p, borderRadius: 10, overflow: "hidden",
      background: dropdownBg, border: `1px solid ${dropdownBord}`,
      boxShadow: isDark ? "0 18px 50px rgba(0,0,0,0.55)" : "0 18px 50px rgba(0,0,0,0.15)",
      zIndex: 99999,
    }),
    option: (p: any, s: any) => ({
      ...p,
      background: s.isSelected ? accentMain : s.isFocused ? (isDark ? "rgba(124,124,240,0.10)" : "#F8F9FA") : "transparent",
      color: s.isSelected ? "#fff" : textPrimary, padding: "8px 15px", fontSize: "14px",
    }),
    placeholder: (p: any) => ({ ...p, color: textMuted, fontSize: "14px" }),
    singleValue: (p: any) => ({ ...p, color: textPrimary, fontSize: "14px" }),
    dropdownIndicator: (p: any) => ({ ...p, color: textMuted }),
    indicatorSeparator: () => ({ display: "none" }),
    input: (p: any) => ({ ...p, color: textPrimary }),
  };

  const [dateFilter, setDateFilter] = useState<DateFilter>("week");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [agentFilter, setAgentFilter] = useState<any>(null);
  const [agentsList, setAgentsList] = useState<any[]>([]);
  const [billingData, setBillingData] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalMessagesCost: 0, totalOutboundCallsCost: 0, totalInboundCallsCost: 0, grandTotal: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    api.get("/auth/all", { headers: { Authorization: `Bearer ${token}` } }).then((res) => {
      setAgentsList(res.data.map((agent: any) => ({ value: agent.id, label: agent.name || agent.email })));
    }).catch(() => {});
  }, [token]);

  useEffect(() => { setIsLoading(true); }, [dateFilter, customStart, customEnd, agentFilter]);

  const fetchBillingReport = async () => {
    setIsFetching(true); setError(null);
    try {
      const params = new URLSearchParams();
      params.append("dateFilter", dateFilter);
      if (agentFilter?.value) params.append("agentId", agentFilter.value);
      if (dateFilter === "custom" && customStart && customEnd) {
        params.append("startDate", customStart); params.append("endDate", customEnd);
      }
      const res = await api.get(`/voice/reports/billing?${params.toString()}`, { headers: { Authorization: `Bearer ${token}` } });
      setBillingData(res.data.data || []);
      setStats(res.data.stats || { totalMessagesCost: 0, totalOutboundCallsCost: 0, totalInboundCallsCost: 0, grandTotal: 0 });
    } catch {
      setError("Failed to load billing data. Please check connection or try again.");
    } finally { setIsFetching(false); setIsLoading(false); }
  };

  useEffect(() => { if (token) fetchBillingReport(); }, [token, dateFilter, customStart, customEnd, agentFilter]);

  const downloadPDF = () => {
    if (!billingData.length) return;
    const doc = new jsPDF();
    doc.setFontSize(18); doc.text("Billing Report", 105, 20, { align: "center" });
    let yPos = 35;
    doc.setFontSize(12);
    doc.text(`Date Range: ${dateFilter === "custom" ? `${customStart} → ${customEnd}` : dateFilter}`, 14, yPos); yPos += 10;
    doc.text(`Agent: ${agentFilter ? agentFilter.label : "All Agents"}`, 14, yPos); yPos += 15;
    doc.text(`Messages Cost: $${stats.totalMessagesCost.toFixed(2)}`, 14, yPos); yPos += 10;
    doc.text(`Outbound Calls Cost: $${stats.totalOutboundCallsCost.toFixed(2)}`, 14, yPos); yPos += 10;
    doc.text(`Inbound Calls Cost: $${stats.totalInboundCallsCost.toFixed(2)}`, 14, yPos); yPos += 10;
    doc.setFontSize(14); doc.text(`Grand Total: $${stats.grandTotal.toFixed(2)}`, 14, yPos);
    autoTable(doc, {
      startY: yPos + 15,
      head: [["Agent ID", "Agent Name", "Messages Cost", "Outbound Calls Cost", "Inbound Calls Cost", "Total Cost"]],
      body: billingData.map((item) => [item.agentId || "Overall", item.agentName || "All Agents", `$${item.messagesCost?.toFixed(2) || "0.00"}`, `$${item.outboundCallsCost?.toFixed(2) || "0.00"}`, `$${item.inboundCallsCost?.toFixed(2) || "0.00"}`, `$${item.totalCost?.toFixed(2) || "0.00"}`]),
      theme: "grid", styles: { fontSize: 9, cellPadding: 3 }, headStyles: { fillColor: [91, 91, 214] },
    });
    doc.save(`Billing_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const dateLabel = dateFilter === "all" ? "All Time" : dateFilter === "today" ? "Today" : dateFilter === "week" ? "This Week" : dateFilter === "month" ? "This Month" : customStart && customEnd ? `${customStart} → ${customEnd}` : "Custom Range";

  const statCards = [
    { icon: MessageSquare, label: "Messages Cost",       value: stats.totalMessagesCost,       accent: isDark ? "#60A5FA" : "#2563EB" },
    { icon: PhoneOutgoing, label: "Outbound Calls Cost", value: stats.totalOutboundCallsCost,  accent: isDark ? "#FB923C" : "#EA580C" },
    { icon: PhoneIncoming, label: "Inbound Calls Cost",  value: stats.totalInboundCallsCost,   accent: isDark ? "#C084FC" : "#9333EA" },
    { icon: DollarSign,    label: "Grand Total",          value: stats.grandTotal,               accent: isDark ? "#34D399" : "#059669", bold: true },
  ];

  return (
    <div style={{ minHeight: "100vh", background: pageBg, padding: "24px", fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 28, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => navigate("/admin/reports")}
            style={{ padding: "8px", background: backBtnBg, border: `1px solid ${backBtnBord}`, borderRadius: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ArrowLeft size={22} color={textSecondary} />
          </button>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: textPrimary, margin: 0 }}>Billing Report</h1>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          {/* Agent Dropdown */}
          <div style={{ width: 240 }}>
            <Select
              options={[{ value: null, label: "All Agents" }, ...agentsList]}
              value={agentFilter || { value: null, label: "All Agents" }}
              onChange={setAgentFilter} isSearchable styles={selectStyles}
            />
          </div>

          {/* Date Filter */}
          <div style={{ position: "relative" }}>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={() => setShowDatePicker(!showDatePicker)}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 14px", background: dateBtnBg, border: `1px solid ${dateBtnBord}`, borderRadius: 9, cursor: "pointer", fontSize: 13.5, fontWeight: 600, color: textPrimary, fontFamily: "inherit" }}>
              {dateLabel} <ChevronDown size={14} color={textMuted} />
            </motion.button>

            <AnimatePresence>
              {showDatePicker && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                  style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, width: 250, zIndex: 9999, background: dropdownBg, borderRadius: 14, border: `1px solid ${dropdownBord}`, boxShadow: isDark ? "0 16px 50px rgba(0,0,0,0.55)" : "0 16px 50px rgba(0,0,0,0.15)", padding: 8 }}>
                  {(["all", "today", "week", "month"] as DateFilter[]).map((f) => (
                    <button key={f} onClick={() => { setDateFilter(f); setShowDatePicker(false); setCustomStart(""); setCustomEnd(""); }}
                      style={{ width: "100%", textAlign: "left", padding: "9px 12px", borderRadius: 9, border: "none", background: dateFilter === f ? activeOptBg : "transparent", color: dateFilter === f ? activeOptClr : textPrimary, fontWeight: dateFilter === f ? 700 : 500, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
                      {f === "all" ? "All Time" : f.charAt(0).toUpperCase() + f.slice(1) === "Week" ? "This Week" : f.charAt(0).toUpperCase() + f.slice(1) === "Month" ? "This Month" : f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                  ))}
                  <button onClick={() => setDateFilter("custom")}
                    style={{ width: "100%", textAlign: "left", padding: "9px 12px", borderRadius: 9, border: "none", background: dateFilter === "custom" ? activeOptBg : "transparent", color: dateFilter === "custom" ? activeOptClr : textPrimary, fontWeight: dateFilter === "custom" ? 700 : 500, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
                    Custom Range
                  </button>
                  {dateFilter === "custom" && (
                    <div style={{ padding: "12px 8px 4px", borderTop: `1px solid ${cardBorder}`, marginTop: 8, display: "flex", flexDirection: "column", gap: 10 }}>
                      <div>
                        <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: textMuted, marginBottom: 5, textTransform: "uppercase" }}>Start</label>
                        <DateInput value={customStart} onChange={(val) => setCustomStart(val)} />
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: textMuted, marginBottom: 5, textTransform: "uppercase" }}>End</label>
                        <DateInput value={customEnd} onChange={(val) => setCustomEnd(val)} />
                      </div>
                      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                        onClick={() => { if (customStart && customEnd) setShowDatePicker(false); }}
                        disabled={!customStart || !customEnd}
                        style={{ padding: "10px 0", borderRadius: 10, border: "none", background: customStart && customEnd ? accentMain : (isDark ? "#2A2A3A" : "#E5E7EB"), color: customStart && customEnd ? "#fff" : textMuted, fontWeight: 700, fontSize: 13, cursor: customStart && customEnd ? "pointer" : "not-allowed" }}>
                        Apply
                      </motion.button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14, marginBottom: 20 }}>
        {statCards.map((item, idx) => (
          <motion.div key={idx} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }}
            style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 14, boxShadow: cardShadow, padding: "16px 18px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: `${item.accent}${isDark ? "22" : "18"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <item.icon size={15} color={item.accent} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: textMuted, textTransform: "uppercase", letterSpacing: "0.05em" }}>{item.label}</span>
            </div>
            <p style={{ margin: 0, fontSize: 24, fontWeight: 800, color: item.bold ? "#10B981" : textPrimary, letterSpacing: "-0.4px" }}>
              ${item.value.toFixed(2)}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 16, boxShadow: cardShadow, overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px", background: toolbarBg, borderBottom: `1px solid ${thBorder}`, flexWrap: "wrap", gap: 10 }}>
          <h5 style={{ fontSize: 15, fontWeight: 700, color: textPrimary, margin: 0 }}>Billing Breakdown</h5>
          <button onClick={downloadPDF} disabled={billingData.length === 0 || isFetching}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.25)", color: "#EF4444", borderRadius: 9, cursor: "pointer", fontWeight: 700, fontSize: 13, opacity: billingData.length === 0 || isFetching ? 0.5 : 1 }}>
            <Download size={14} /> Export PDF
          </button>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
            <thead>
              <tr style={{ background: thBg }}>
                {["Agent ID", "Agent Name", "Messages Cost", "Outbound Calls Cost", "Inbound Calls Cost", "Total Cost"].map(h => (
                  <th key={h} style={{ padding: "11px 14px", fontSize: 11, fontWeight: 700, color: textMuted, textTransform: "uppercase", letterSpacing: "0.06em", textAlign: "left", borderBottom: `1px solid ${thBorder}`, whiteSpace: "nowrap" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading || isFetching ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "56px 0" }}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", border: `3px solid ${spinBorder}`, borderTopColor: accentMain, animation: "spin 0.7s linear infinite", margin: "0 auto 10px" }} />
                    <p style={{ margin: 0, fontSize: 13, color: textMuted }}>Loading billing data...</p>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "48px 0", color: "#EF4444" }}>
                    <AlertCircle size={32} style={{ margin: "0 auto 10px", display: "block" }} />
                    <p style={{ margin: 0, fontSize: 13 }}>{error}</p>
                  </td>
                </tr>
              ) : billingData.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "48px 0", fontSize: 13, color: textMuted }}>
                    No billing records found for selected filters
                  </td>
                </tr>
              ) : (
                billingData.map((item, idx) => (
                  <tr key={idx}
                    style={{ borderBottom: `1px solid ${tdBorder}`, transition: "background 0.12s" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = rowHover)}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <td style={{ padding: "13px 14px", fontSize: 13, color: textMuted }}>{item.agentId || "Overall"}</td>
                    <td style={{ padding: "13px 14px", fontSize: 13, color: textPrimary, fontWeight: 600 }}>{item.agentName || "All Agents"}</td>
                    <td style={{ padding: "13px 14px", fontSize: 13, color: textSecondary }}>${(item.messagesCost || 0).toFixed(2)}</td>
                    <td style={{ padding: "13px 14px", fontSize: 13, color: textSecondary }}>${(item.outboundCallsCost || 0).toFixed(2)}</td>
                    <td style={{ padding: "13px 14px", fontSize: 13, color: textSecondary }}>${(item.inboundCallsCost || 0).toFixed(2)}</td>
                    <td style={{ padding: "13px 14px", fontSize: 13, fontWeight: 700, color: "#10B981" }}>${(item.totalCost || 0).toFixed(2)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}