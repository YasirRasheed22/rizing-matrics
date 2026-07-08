//@ts-nocheck
import React, { useEffect, useRef, useState } from "react";
import {
  User,
  Phone,
  DollarSign,
  Filter,
  ChevronDown,
  ClipboardList,
  BadgeCheck,
  Calendar,
  Clock,
  AlertCircle,
  Plus,
  ArrowLeft,
  ArrowRight,
  ChevronRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import api from "../api";
import LeadSaleSidebar from "../components/leads/LeadSaleSidebar";
import { Link, useNavigate, useParams } from "react-router-dom";
import { DateInput } from "../components/ui/AppDatePicker";
import { getAppTz } from "../hooks/dateFormat";
import { useTheme } from "../context/ThemeContext";

function formatDateNice(dateString: string) {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true,
    timeZone: getAppTz(),
  });
}

const DATE_LABELS = {
  all: "All Time",
  today: "Today",
  week: "This Week",
  month: "This Month",
  custom: "Custom Range",
};

// Dark mode friendly disposition styles
const DISP_STYLES_LIGHT = {
  "follow up": { bg: "#EFF6FF", color: "#4747C2", dot: "#3B82F6" },
  followup: { bg: "#EFF6FF", color: "#4747C2", dot: "#3B82F6" },
  hot: { bg: "#FEF2F2", color: "#DC2626", dot: "#EF4444" },
  closed: { bg: "#F0FDF4", color: "#16A34A", dot: "#22C55E" },
  "not interested": { bg: "#F9FAFB", color: "#6B7280", dot: "#9CA3AF" },
  default: { bg: "#F5F3FF", color: "#7C3AED", dot: "#8B5CF6" },
};

const DISP_STYLES_DARK = {
  "follow up": { bg: "rgba(59,130,246,0.15)", color: "#60A5FA", dot: "#60A5FA" },
  followup: { bg: "rgba(59,130,246,0.15)", color: "#60A5FA", dot: "#60A5FA" },
  hot: { bg: "rgba(239,68,68,0.15)", color: "#F87171", dot: "#F87171" },
  closed: { bg: "rgba(34,197,94,0.15)", color: "#4ADE80", dot: "#4ADE80" },
  "not interested": { bg: "rgba(107,114,128,0.15)", color: "#9CA3AF", dot: "#9CA3AF" },
  default: { bg: "rgba(124,58,237,0.15)", color: "#A78BFA", dot: "#A78BFA" },
};

function getDispStyle(name = "", isDark: boolean) {
  const styles = isDark ? DISP_STYLES_DARK : DISP_STYLES_LIGHT;
  const l = String(name).toLowerCase();
  for (const k of Object.keys(styles)) {
    if (k !== "default" && l.includes(k)) return styles[k];
  }
  return styles.default;
}

const getInitials = (name) =>
  (name || "?")
    .trim()
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const AVATAR_PALETTE = [
  { bg: "#EEF2FF", text: "#4338CA" },
  { bg: "#F0FDF4", text: "#15803D" },
  { bg: "#FFF7ED", text: "#C2410C" },
  { bg: "#FDF4FF", text: "#9333EA" },
  { bg: "#EFF6FF", text: "#4747C2" },
  { bg: "#FFF1F2", text: "#BE123C" },
  { bg: "#F0FDFA", text: "#0F766E" },
];

function avatarColor(str) {
  let h = 0;
  for (let i = 0; i < (str || "").length; i++) {
    h = str.charCodeAt(i) + ((h << 5) - h);
  }
  return AVATAR_PALETTE[Math.abs(h) % AVATAR_PALETTE.length];
}

function createSlug(text = "") {
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function prettifyDispositionTitle(slug = "") {
  if (!slug) return "Lead Status";
  return slug
    .replace(/-/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

export default function LeadsStatusPage() {
  const { token } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const navigate = useNavigate();
  const { dispositions } = useParams();

  // ── Theme Colors ──
  const textPrimary = isDark ? "#F0F0F5" : "#0D0D12";
  const textSecondary = isDark ? "#A3A3B0" : "#344054";
  const textMuted = isDark ? "#68687A" : "#667085";
  const accentMain = isDark ? "#7C7CF0" : "#5B5BD6";
  const cardBg = isDark ? "rgba(20,20,28,0.98)" : "#FFFFFF";
  const cardBorder = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)";
  const headerBorder = isDark ? "rgba(255,255,255,0.06)" : "#EAECF0";
  const rowHover = isDark ? "rgba(255,255,255,0.04)" : "#F9FAFB";
  const bgPage = isDark ? "#0A0A0F" : "#F8F9FC";

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [dateFilter, setDateFilter] = useState("all");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const [selectedItem, setSelectedItem] = useState(null);
  const [itemType, setItemType] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [leads, setLeads] = useState([]);
  const [isFetching, setIsFetching] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);

  const [todayFollowups, setTodayFollowups] = useState([]);
  const [upcomingFollowups, setUpcomingFollowups] = useState([]);
  const [missedFollowups, setMissedFollowups] = useState([]);

  const datePickerRef = useRef(null);

  useEffect(() => { setPage(1); }, [limit, dateFilter, dispositions]);

  useEffect(() => {
    const handler = (e) => {
      if (datePickerRef.current && !datePickerRef.current.contains(e.target)) {
        setShowDatePicker(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const fetchData = async () => {
    if (!token) return;
    setIsFetching(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        dateFilter,
      });

      if (dateFilter === "custom" && customStart && customEnd) {
        params.append("startDate", customStart);
        params.append("endDate", customEnd);
      }

      const res = await api.get(`/voice/leads?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      let filteredLeads = res?.data?.data || [];

      if (dispositions) {
        filteredLeads = filteredLeads.filter(
          (item) => createSlug(item?.disposition?.name || "") === dispositions
        );
      }

      if (dispositions === "followup" || dispositions === "follow-up") {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todays = [];
        const upcoming = [];
        const missed = [];

        filteredLeads.forEach((lead) => {
          if (!lead?.nextFollowupDate) return;
          const followDate = new Date(lead.nextFollowupDate);
          followDate.setHours(0, 0, 0, 0);

          if (followDate.getTime() === today.getTime()) todays.push(lead);
          else if (followDate < today) missed.push(lead);
          else upcoming.push(lead);
        });

        setTodayFollowups(todays);
        setUpcomingFollowups(upcoming);
        setMissedFollowups(missed);
      } else {
        setTodayFollowups([]);
        setUpcomingFollowups([]);
        setMissedFollowups([]);
      }

      setLeads(filteredLeads);
      setTotalPages(res?.data?.pagination?.totalPages || 1);
    } catch (err) {
      console.error("Fetch error", err);
      setLeads([]);
      setTotalPages(1);
    } finally {
      setIsFetching(false);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token, page, limit, dateFilter, customStart, customEnd, dispositions]);

  const dateLabel = dateFilter === "custom" && customStart && customEnd
    ? `${customStart} → ${customEnd}` : DATE_LABELS[dateFilter];

  const pageTitle = dispositions
    ? `${prettifyDispositionTitle(dispositions)} Leads`
    : "Lead Status";

  const followupStatCards = [
    { label: "Today's Follow-ups", value: todayFollowups.length, icon: Calendar, bg: isDark ? "rgba(124,124,240,0.12)" : "#EFF6FF", tc: accentMain },
    { label: "Upcoming", value: upcomingFollowups.length, icon: Clock, bg: isDark ? "rgba(16,185,129,0.12)" : "#F0FDF4", tc: "#15803D" },
    { label: "Missed", value: missedFollowups.length, icon: AlertCircle, bg: isDark ? "rgba(239,68,68,0.12)" : "#FEF2F2", tc: "#DC2626" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: bgPage, fontFamily: "'Inter', -apple-system, sans-serif", color: textPrimary }}>

      {/* Header */}
      <div style={{ background: cardBg, borderBottom: `1px solid ${headerBorder}`, padding: "20px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: textPrimary, margin: 0, letterSpacing: "-0.02em", textTransform: "uppercase" }}>
            {pageTitle}
          </h1>
          <p style={{ color: textMuted, fontSize: 13, margin: "2px 0 0" }}>
            {leads.length} records · {dateLabel}
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <Link to="/leads/add-lead" style={{ textDecoration: "none" }}>
            <button style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", background: accentMain, border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, color: "#fff", fontWeight: 600 }}>
              <Plus size={14} /> Add Lead
            </button>
          </Link>

          <Link to="/leads/calendar" style={{ textDecoration: "none" }}>
            <button style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 8, cursor: "pointer", fontSize: 13, color: textSecondary, fontWeight: 500 }}>
              <Calendar size={14} style={{ color: textMuted }} /> Calendar
            </button>
          </Link>

          {/* Date Filter */}
          <div ref={datePickerRef} style={{ position: "relative" }}>
            <button onClick={() => setShowDatePicker(!showDatePicker)} style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 14px", background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 8, cursor: "pointer", fontSize: 13, color: textSecondary, fontWeight: 500 }}>
              <Filter size={14} style={{ color: textMuted }} />
              {dateLabel}
              <ChevronDown size={13} style={{ color: textMuted, transform: showDatePicker ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
            </button>

            <AnimatePresence>
              {showDatePicker && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.97 }}
                  style={{
                    position: "absolute", top: "calc(100% + 6px)", right: 0,
                    background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 12,
                    boxShadow: isDark ? "0 10px 30px rgba(0,0,0,0.6)" : "0 8px 24px rgba(0,0,0,0.10)",
                    zIndex: 100, padding: 8, minWidth: 190,
                  }}
                >
                  {["all", "today", "week", "month"].map((f) => (
                    <button
                      key={f}
                      onClick={() => { setDateFilter(f); setShowDatePicker(false); setCustomStart(""); setCustomEnd(""); }}
                      style={{
                        display: "block", width: "100%", textAlign: "left",
                        padding: "8px 12px", borderRadius: 8, border: "none", cursor: "pointer",
                        fontSize: 13, fontWeight: dateFilter === f ? 600 : 400,
                        background: dateFilter === f ? "rgba(124,124,240,0.15)" : "transparent",
                        color: dateFilter === f ? accentMain : textSecondary,
                      }}
                    >
                      {DATE_LABELS[f]}
                    </button>
                  ))}

                  <button
                    onClick={() => setDateFilter("custom")}
                    style={{
                      display: "block", width: "100%", textAlign: "left",
                      padding: "8px 12px", borderRadius: 8, border: "none", cursor: "pointer",
                      fontSize: 13, fontWeight: dateFilter === "custom" ? 600 : 400,
                      background: dateFilter === "custom" ? "rgba(124,124,240,0.15)" : "transparent",
                      color: dateFilter === "custom" ? accentMain : textSecondary,
                    }}
                  >
                    Custom Range
                  </button>

                  {dateFilter === "custom" && (
                    <div style={{ padding: "10px 8px 4px", borderTop: `1px solid ${headerBorder}`, marginTop: 4 }}>
                      <label style={{ fontSize: 11, color: textMuted, fontWeight: 500, display: "block", marginBottom: 4 }}>Start Date</label>
                      <DateInput value={customStart} onChange={setCustomStart} style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: `1px solid ${cardBorder}`, fontSize: 12, marginBottom: 8, background: cardBg, color: textPrimary }} />

                      <label style={{ fontSize: 11, color: textMuted, fontWeight: 500, display: "block", marginBottom: 4 }}>End Date</label>
                      <DateInput value={customEnd} onChange={setCustomEnd} style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: `1px solid ${cardBorder}`, fontSize: 12, marginBottom: 8, background: cardBg, color: textPrimary }} />

                      <button onClick={() => { if (customStart && customEnd) setShowDatePicker(false); }} disabled={!customStart || !customEnd}
                        style={{ width: "100%", padding: "7px", borderRadius: 7, border: "none", background: customStart && customEnd ? accentMain : "#E5E7EB", color: customStart && customEnd ? "#fff" : "#9CA3AF", fontSize: 12, fontWeight: 600, cursor: customStart && customEnd ? "pointer" : "not-allowed" }}>
                        Apply Range
                      </button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <div style={{ padding: "24px 28px" }}>
        {/* Follow-up Stats */}
        {(dispositions === "followup" || dispositions === "follow-up") && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
            {followupStatCards.map((s, i) => (
              <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 12, padding: "18px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <p style={{ fontSize: 12, color: textMuted, fontWeight: 500, margin: "0 0 6px", textTransform: "uppercase", letterSpacing: "0.04em" }}>{s.label}</p>
                  <p style={{ fontSize: 26, fontWeight: 700, color: textPrimary, margin: 0 }}>{s.value}</p>
                </div>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: s.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <s.icon size={18} style={{ color: s.tc }} />
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Main Table */}
        <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: "14px 20px", borderBottom: `1px solid ${headerBorder}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: textSecondary }}>{pageTitle}</span>
            <span style={{ fontSize: 12, color: textMuted, background: isDark ? "rgba(255,255,255,0.06)" : "#F9FAFB", border: `1px solid ${cardBorder}`, borderRadius: 20, padding: "2px 10px" }}>
              {leads.length} records
            </span>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: isDark ? "rgba(255,255,255,0.03)" : "#F9FAFB" }}>
                  {["Client", "Phone", "Disposition", "Next Follow-up", "Created", ""].map((h) => (
                    <th key={h} style={{ padding: "12px 20px", textAlign: "left", fontSize: 11, fontWeight: 600, color: textMuted, letterSpacing: "0.05em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isFetching || isLoading ? (
                  <tr>
                    <td colSpan={6} style={{ padding: "80px 0", textAlign: "center", color: textMuted }}>Loading records...</td>
                  </tr>
                ) : leads.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: "80px 0", textAlign: "center", color: textMuted }}>
                      <User size={32} style={{ color: "#D0D5DD", margin: "0 auto 10px", display: "block" }} />
                      <p style={{ fontSize: 14, fontWeight: 600, color: textPrimary, margin: "0 0 4px" }}>No records found</p>
                      <p style={{ fontSize: 13, color: textMuted }}>Try adjusting your filter</p>
                    </td>
                  </tr>
                ) : (
                  leads.map((item, idx) => {
                    const av = avatarColor(item.clientName || "");
                    const ds = getDispStyle(item?.disposition?.name, isDark);

                    return (
                      <motion.tr
                        key={item.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: idx * 0.03 }}
                        onClick={() => navigate(`/lead/single/${item.id}`)}
                        style={{ cursor: "pointer", borderTop: `1px solid ${headerBorder}`, transition: "background 0.12s" }}
                        onMouseEnter={(e) => e.currentTarget.style.background = rowHover}
                        onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                      >
                        {/* Client */}
                        <td style={{ padding: "14px 20px", whiteSpace: "nowrap" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div style={{ width: 34, height: 34, borderRadius: "50%", background: av.bg, color: av.text, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600 }}>
                              {getInitials(item.clientName)}
                            </div>
                            <div>
                              <p style={{ fontSize: 13, fontWeight: 600, color: textPrimary, margin: 0 }}>{item.clientName}</p>
                              {item.businessName && <p style={{ fontSize: 12, color: textMuted, margin: 0 }}>{item.businessName}</p>}
                            </div>
                          </div>
                        </td>

                        {/* Phone */}
                        <td style={{ padding: "14px 20px", whiteSpace: "nowrap" }}>
                          <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, color: textMuted }}>
                            <Phone size={12} style={{ color: textMuted }} />
                            {item.clientPhone}
                          </span>
                        </td>

                        {/* Disposition */}
                        <td style={{ padding: "14px 20px", whiteSpace: "nowrap" }}>
                          {item?.disposition?.name ? (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 10px", borderRadius: 20, background: ds.bg, color: ds.color, fontSize: 12, fontWeight: 600 }}>
                              <span style={{ width: 6, height: 6, borderRadius: "50%", background: ds.dot }} />
                              {item.disposition.name}
                            </span>
                          ) : <span style={{ color: textMuted }}>—</span>}
                        </td>

                        {/* Next Follow-up */}
                        <td style={{ padding: "14px 20px", whiteSpace: "nowrap", fontSize: 13, color: textMuted }}>
                          {item.nextFollowupDate ? (
                            <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                              <Calendar size={12} style={{ color: textMuted }} />
                              {formatDateNice(item.nextFollowupDate)}
                            </span>
                          ) : <span style={{ color: textMuted }}>—</span>}
                        </td>

                        {/* Created */}
                        <td style={{ padding: "14px 20px", whiteSpace: "nowrap", fontSize: 13, color: textMuted }}>
                          {formatDateNice(item.createdAt)}
                        </td>

                        <td style={{ padding: "14px 20px", textAlign: "right" }}>
                          <ChevronRight size={14} style={{ color: textMuted }} />
                        </td>
                      </motion.tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 0 && (
            <div style={{ padding: "12px 20px", borderTop: `1px solid ${headerBorder}`, background: isDark ? "rgba(255,255,255,0.03)" : "#F9FAFB", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 13, color: textMuted }}>Rows per page:</span>
                <select value={limit} onChange={(e) => setLimit(Number(e.target.value))} style={{ padding: "5px 8px", borderRadius: 8, border: `1px solid ${cardBorder}`, fontSize: 13, color: textSecondary, background: cardBg }}>
                  {[10, 20, 30, 50].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button disabled={page === 1} onClick={() => setPage(p => p - 1)} style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${cardBorder}`, background: cardBg, color: page === 1 ? textMuted : textSecondary, cursor: page === 1 ? "not-allowed" : "pointer" }}>
                  <ArrowLeft size={14} />
                </button>
                <span style={{ fontSize: 13, color: textSecondary, minWidth: 80, textAlign: "center" }}>
                  Page <strong>{page}</strong> of <strong>{totalPages}</strong>
                </span>
                <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${cardBorder}`, background: cardBg, color: page === totalPages ? textMuted : textSecondary, cursor: page === totalPages ? "not-allowed" : "pointer" }}>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <LeadSaleSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        item={selectedItem}
        itemType={itemType}
        onSaveSuccess={fetchData}
      />
    </div>
  );
}