// src/pages/admin/SettingsBilling.tsx
//@ts-nocheck
import React, { useEffect, useState, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DollarSign, PhoneOutgoing, PhoneIncoming, MessageSquare,
  AlertCircle, Filter, Download, ChevronDown, X, Search,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import api from "../../api";
import Select from "react-select";
import { DateInput } from "../../components/ui/AppDatePicker";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/* ─── shared styles ─────────────────────────────────── */
const card: React.CSSProperties = {
  background: "rgba(255,255,255,0.92)",
  backdropFilter: "blur(24px) saturate(180%)",
  WebkitBackdropFilter: "blur(24px) saturate(180%)",
  borderRadius: 18,
  border: "1px solid rgba(255,255,255,0.60)",
  boxShadow: "0 4px 24px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.04)",
};

const selectStyles = {
  control: (p: any, s: any) => ({
    ...p,
    border: "1px solid rgba(0,0,0,0.10)", borderRadius: 10,
    background: "#F6F7F9", minHeight: 40,
    boxShadow: s.isFocused ? "0 0 0 3px rgba(91,91,214,0.18)" : "none",
    "&:hover": { borderColor: "rgba(91,91,214,0.40)" },
    fontSize: 13,
  }),
  menu: (p: any) => ({
    ...p, borderRadius: 12, overflow: "hidden",
    boxShadow: "0 16px 40px rgba(0,0,0,0.14)", zIndex: 9999,
  }),
  option: (p: any, s: any) => ({
    ...p,
    background: s.isSelected ? "#5B5BD6" : s.isFocused ? "rgba(91,91,214,0.06)" : "white",
    color: s.isSelected ? "white" : "#0D0D12",
    fontSize: 13, padding: "9px 14px",
  }),
  singleValue: (p: any) => ({ ...p, color: "#0D0D12", fontSize: 13 }),
  placeholder: (p: any) => ({ ...p, color: "#BBBBC8", fontSize: 13 }),
  indicatorSeparator: () => ({ display: "none" }),
};

type DateFilter = "all" | "today" | "week" | "month" | "custom";
const DATE_LABELS: Record<DateFilter, string> = {
  all: "All Time", today: "Today", week: "This Week", month: "This Month", custom: "Custom Range",
};

export default function AgentBillingReportPage() {
  const { token } = useAuth();
  const pickerRef = useRef<HTMLDivElement>(null);

  const [dateFilter, setDateFilter] = useState<DateFilter>("week");
  const [showPicker, setShowPicker] = useState(false);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd]     = useState("");
  const [agentFilter, setAgentFilter] = useState<any>(null);
  const [agentsList, setAgentsList]   = useState<any[]>([]);
  const [billingData, setBillingData] = useState<any[]>([]);
  const [tableSearch, setTableSearch] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [stats, setStats] = useState({
    totalMessagesCost: 0, totalOutboundCallsCost: 0,
    totalInboundCallsCost: 0, totalMissedCallsCost: 0,
    totalVoicemailCost: 0, grandTotal: 0,
  });
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* close picker on outside click */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setShowPicker(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* fetch agents */
  useEffect(() => {
    api.get("/auth/all", { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        setAgentsList(res.data.map((a: any) => ({ value: a.id, label: a.name || a.email })));
      }).catch(() => {});
  }, [token]);

  /* fetch billing */
  const fetchBilling = async () => {
    setFetching(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.append("dateFilter", dateFilter);
      if (agentFilter?.value) params.append("agentId", agentFilter.value);
      if (dateFilter === "custom" && customStart && customEnd) {
        params.append("startDate", customStart);
        params.append("endDate", customEnd);
      }
      const res = await api.get(`/voice/reports/billing?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setBillingData(res.data.data || []);
      setStats(res.data.stats || {});
    } catch {
      setError("Failed to load billing data. Please try again.");
    } finally {
      setFetching(false);
      setLoading(false);
    }
  };

  useEffect(() => { if (token) fetchBilling(); }, [token, dateFilter, customStart, customEnd, agentFilter]);

  /* ── client-side table search ── */
  const filteredData = useMemo(() => {
    const q = tableSearch.trim().toLowerCase();
    if (!q) return billingData;
    return billingData.filter((item) =>
      (item.agentName || "All Agents").toLowerCase().includes(q)
    );
  }, [billingData, tableSearch]);

  const downloadPDF = () => {
    if (!billingData.length) return;
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Billing Report", 105, 20, { align: "center" });
    doc.setFontSize(11);
    doc.text(`Period: ${DATE_LABELS[dateFilter]}`, 14, 34);
    doc.text(`Agent: ${agentFilter?.label || "All Agents"}`, 14, 42);
    autoTable(doc, {
      startY: 52,
      head: [["Agent", "Messages", "Outbound", "Inbound", "Missed", "Voicemail", "Total"]],
      body: billingData.map((i) => [
        i.agentName || "All",
        `$${(i.messagesCost || 0).toFixed(2)}`,
        `$${(i.outboundCallsCost || 0).toFixed(2)}`,
        `$${(i.inboundCallsCost || 0).toFixed(2)}`,
        `$${(i.missedCallsCost || 0).toFixed(2)}`,
        `$${(i.voicemailCost || 0).toFixed(2)}`,
        `$${(i.totalCost || 0).toFixed(2)}`,
      ]),
      theme: "grid",
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [91, 91, 214] },
    });
    doc.save(`Billing_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const statCards = [
    { label: "Messages Cost",  value: stats.totalMessagesCost,      icon: MessageSquare, accent: "#5B5BD6" },
    { label: "Outbound Calls", value: stats.totalOutboundCallsCost, icon: PhoneOutgoing, accent: "#D38A00" },
    { label: "Inbound Calls",  value: stats.totalInboundCallsCost,  icon: PhoneIncoming, accent: "#17A363" },
    { label: "Missed Calls",   value: stats.totalMissedCallsCost,   icon: AlertCircle,   accent: "#D0281A" },
    { label: "Voicemail",      value: stats.totalVoicemailCost,     icon: Filter,        accent: "#9E9EAD" },
    { label: "Grand Total",    value: stats.grandTotal,             icon: DollarSign,    accent: "#17A363", bold: true },
  ];

  const thStyle: React.CSSProperties = {
    padding: "11px 16px", textAlign: "left",
    fontSize: 10.5, fontWeight: 700, color: "#9E9EAD",
    textTransform: "uppercase", letterSpacing: "0.07em", whiteSpace: "nowrap",
  };
  const tdStyle: React.CSSProperties = {
    padding: "12px 16px", fontSize: 13, color: "#0D0D12", verticalAlign: "middle",
  };

  return (
    <div style={{ fontFamily: "'Inter', -apple-system, sans-serif", minHeight: "100vh" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Page header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(23,163,99,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <DollarSign size={20} color="#17A363" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#0D0D12", letterSpacing: "-0.4px" }}>Billing Report</h1>
            <p style={{ margin: 0, fontSize: 12.5, color: "#9E9EAD" }}>{DATE_LABELS[dateFilter]}</p>
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {/* Agent select */}
          <div style={{ minWidth: 200 }}>
            <Select
              options={[{ value: null, label: "All Agents" }, ...agentsList]}
              value={agentFilter || { value: null, label: "All Agents" }}
              onChange={(opt) => setAgentFilter(opt?.value ? opt : null)}
              styles={selectStyles}
              menuPortalTarget={document.body}
              placeholder="All Agents"
              isSearchable
            />
          </div>

          {/* Date picker */}
          <div ref={pickerRef} style={{ position: "relative" }}>
            <button
              onClick={() => setShowPicker(!showPicker)}
              style={{
                display: "flex", alignItems: "center", gap: 7,
                padding: "9px 14px", borderRadius: 10,
                border: "1px solid rgba(0,0,0,0.10)", background: "#F6F7F9",
                fontSize: 13, color: "#0D0D12", fontWeight: 600, cursor: "pointer",
              }}
            >
              {DATE_LABELS[dateFilter]}
              <ChevronDown size={13} style={{ color: "#9E9EAD", transform: showPicker ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
            </button>

            <AnimatePresence>
              {showPicker && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.97 }}
                  style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 9999, ...card, padding: 8, minWidth: 200 }}
                >
                  {(["all", "today", "week", "month"] as DateFilter[]).map((f) => (
                    <button key={f} onClick={() => { setDateFilter(f); setCustomStart(""); setCustomEnd(""); setShowPicker(false); }}
                      style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 12px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: dateFilter === f ? 700 : 400, background: dateFilter === f ? "rgba(91,91,214,0.08)" : "transparent", color: dateFilter === f ? "#5B5BD6" : "#0D0D12" }}>
                      {DATE_LABELS[f]}
                    </button>
                  ))}
                  <button onClick={() => setDateFilter("custom")}
                    style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 12px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: dateFilter === "custom" ? 700 : 400, background: dateFilter === "custom" ? "rgba(91,91,214,0.08)" : "transparent", color: dateFilter === "custom" ? "#5B5BD6" : "#0D0D12" }}>
                    Custom Range
                  </button>
                  {dateFilter === "custom" && (
                    <div style={{ padding: "8px 8px 4px", borderTop: "1px solid rgba(0,0,0,0.06)", marginTop: 4 }}>
                      <div style={{ marginBottom: 8 }}>
                        <label style={{ fontSize: 11, fontWeight: 700, color: "#9E9EAD", display: "block", marginBottom: 4 }}>Start</label>
                        <DateInput value={customStart} onChange={(val) => setCustomStart(val)} style={{ width: "100%", borderRadius: 8 }} />
                      </div>
                      <div style={{ marginBottom: 8 }}>
                        <label style={{ fontSize: 11, fontWeight: 700, color: "#9E9EAD", display: "block", marginBottom: 4 }}>End</label>
                        <DateInput value={customEnd} onChange={(val) => setCustomEnd(val)} style={{ width: "100%", borderRadius: 8 }} />
                      </div>
                      <button onClick={() => { if (customStart && customEnd) setShowPicker(false); }}
                        disabled={!customStart || !customEnd}
                        style={{ width: "100%", padding: "7px 0", borderRadius: 8, border: "none", background: customStart && customEnd ? "#5B5BD6" : "#E5E7EB", color: customStart && customEnd ? "#fff" : "#9CA3AF", fontSize: 12, fontWeight: 700, cursor: customStart && customEnd ? "pointer" : "not-allowed" }}>
                        Apply
                      </button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Export */}
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            onClick={downloadPDF} disabled={!billingData.length || fetching}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 10, border: "none", background: billingData.length ? "#5B5BD6" : "#BBBBC8", color: "#fff", fontWeight: 700, fontSize: 13, cursor: billingData.length ? "pointer" : "not-allowed" }}
          >
            <Download size={13} /> Export PDF
          </motion.button>
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12, marginBottom: 20 }}>
        {statCards.map(({ label, value, icon: Icon, accent, bold }) => (
          <motion.div key={label} whileHover={{ y: -2, boxShadow: "0 8px 28px rgba(0,0,0,0.10)" }} style={{ ...card, padding: "14px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: `${accent}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon size={14} color={accent} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#9E9EAD", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span>
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: bold ? "#17A363" : "#0D0D12", letterSpacing: "-0.4px" }}>
              ${(value || 0).toFixed(2)}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Table */}
      <div style={card}>

        {/* ── Table toolbar with search ── */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 16px", borderBottom: "1px solid rgba(0,0,0,0.06)",
          gap: 12, flexWrap: "wrap",
        }}>
          <span style={{ fontSize: 13.5, fontWeight: 700, color: "#0D0D12" }}>
            Billing Breakdown
          </span>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* Agent name search */}
            <div style={{ position: "relative" }}>
              <Search
                size={13}
                style={{
                  position: "absolute", left: 10, top: "50%",
                  transform: "translateY(-50%)", color: "#9E9EAD", pointerEvents: "none",
                }}
              />
              <input
                type="text"
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                placeholder="Search by agent name…"
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                style={{
                  width: 220, padding: "7px 30px 7px 30px",
                  borderRadius: 10,
                  border: `1.5px solid ${searchFocused ? "rgba(91,91,214,0.45)" : "rgba(0,0,0,0.10)"}`,
                  background: "#F6F7F9", fontSize: 13, color: "#0D0D12",
                  outline: "none", fontFamily: "inherit",
                  boxShadow: searchFocused ? "0 0 0 3px rgba(91,91,214,0.10)" : "none",
                  transition: "border-color 0.15s, box-shadow 0.15s",
                }}
              />
              {tableSearch && (
                <button
                  onClick={() => setTableSearch("")}
                  style={{
                    position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
                    width: 16, height: 16, borderRadius: "50%",
                    background: "rgba(0,0,0,0.10)", border: "none",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer", color: "#9E9EAD", padding: 0,
                    transition: "background 0.12s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,0,0,0.18)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(0,0,0,0.10)")}
                >
                  <X size={9} />
                </button>
              )}
            </div>

            {/* Record count badge */}
            <span style={{
              fontSize: 12, color: "#9E9EAD",
              background: "#F6F7F9", borderRadius: 99,
              padding: "3px 10px", border: "1px solid rgba(0,0,0,0.06)",
              whiteSpace: "nowrap",
            }}>
              {filteredData.length}
              {tableSearch && ` / ${billingData.length}`} records
            </span>
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "rgba(246,247,249,0.80)", borderBottom: "1px solid rgba(0,0,0,0.07)" }}>
                <th style={thStyle}>Agent</th>
                <th style={thStyle}>Messages</th>
                <th style={thStyle}>Outbound</th>
                <th style={thStyle}>Inbound</th>
                <th style={thStyle}>Missed</th>
                <th style={thStyle}>Voicemail</th>
                <th style={{ ...thStyle, color: "#17A363" }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {loading || fetching ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "60px 0" }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", border: "3px solid rgba(91,91,214,0.15)", borderTopColor: "#5B5BD6", animation: "spin 0.7s linear infinite", margin: "0 auto" }} />
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "60px 0", color: "#D0281A" }}>
                    <AlertCircle size={28} style={{ margin: "0 auto 10px", display: "block" }} />
                    {error}
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "60px 0" }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: "#F6F7F9", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px" }}>
                      <Search size={18} color="#9E9EAD" />
                    </div>
                    <p style={{ margin: 0, fontSize: 13.5, fontWeight: 600, color: "#0D0D12" }}>
                      {tableSearch ? `No results for "${tableSearch}"` : "No billing records found"}
                    </p>
                    <p style={{ margin: "4px 0 0", fontSize: 12.5, color: "#9E9EAD" }}>
                      {tableSearch ? "Try a different agent name" : "Adjust your filters and try again"}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredData.map((item, idx) => (
                  <motion.tr
                    key={idx}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.02 }}
                    style={{ borderBottom: "1px solid rgba(0,0,0,0.05)", background: idx % 2 === 0 ? "transparent" : "rgba(246,247,249,0.40)", transition: "background 0.12s" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(91,91,214,0.04)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = idx % 2 === 0 ? "transparent" : "rgba(246,247,249,0.40)")}
                  >
                    <td style={{ ...tdStyle, fontWeight: 600 }}>
                      {/* highlight matching text */}
                      {tableSearch
                        ? (() => {
                            const name = item.agentName || "All Agents";
                            const idx2 = name.toLowerCase().indexOf(tableSearch.toLowerCase());
                            if (idx2 === -1) return name;
                            return (
                              <>
                                {name.slice(0, idx2)}
                                <mark style={{ background: "rgba(91,91,214,0.15)", color: "#5B5BD6", borderRadius: 3, padding: "0 2px" }}>
                                  {name.slice(idx2, idx2 + tableSearch.length)}
                                </mark>
                                {name.slice(idx2 + tableSearch.length)}
                              </>
                            );
                          })()
                        : (item.agentName || "All Agents")}
                    </td>
                    <td style={tdStyle}>${(item.messagesCost || 0).toFixed(2)}</td>
                    <td style={tdStyle}>${(item.outboundCallsCost || 0).toFixed(2)}</td>
                    <td style={tdStyle}>${(item.inboundCallsCost || 0).toFixed(2)}</td>
                    <td style={tdStyle}>${(item.missedCallsCost || 0).toFixed(2)}</td>
                    <td style={tdStyle}>${(item.voicemailCost || 0).toFixed(2)}</td>
                    <td style={{ ...tdStyle, fontWeight: 800, color: "#17A363" }}>${(item.totalCost || 0).toFixed(2)}</td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}