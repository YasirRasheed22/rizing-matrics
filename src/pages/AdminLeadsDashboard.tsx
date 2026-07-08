//@ts-nocheck
import React, { useEffect, useRef, useState } from "react";
import {
  Phone,
  DollarSign,
  TrendingUp,
  ClipboardList,
  BadgeCheck,
  Calendar,
  ChevronDown,
  BarChart2,
} from "lucide-react";

import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import api from "../api";
import LeadSaleSidebar from "../components/leads/LeadSaleSidebar";
import { useNavigate } from "react-router-dom";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

import Select from "react-select";
import { toast, Toaster } from "react-hot-toast";
import { DateInput } from "../components/ui/AppDatePicker";

/* ───────────────────────────────────────────── */
/* chart colors */
/* ───────────────────────────────────────────── */

const PIE_COLORS = [
  "#5B5BD6",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
];

/* ───────────────────────────────────────────── */
/* labels */
/* ───────────────────────────────────────────── */

const DATE_LABELS: Record<string, string> = {
  all: "All Time",
  today: "Today",
  week: "This Week",
  month: "This Month",
  custom: "Custom Range",
};

/* ───────────────────────────────────────────── */
/* stat meta */
/* ───────────────────────────────────────────── */

const STAT_META = [
  {
    type: "leads",
    label: "Total Leads",
    icon: ClipboardList,
    accent: "#5B5BD6",
  },
  {
    type: "sales",
    label: "Total Sales",
    icon: BadgeCheck,
    accent: "#10B981",
  },
  {
    type: "revenue",
    label: "Revenue",
    icon: DollarSign,
    accent: "#8B5CF6",
  },
  {
    type: "calls",
    label: "Total Calls",
    icon: Phone,
    accent: "#F59E0B",
  },
];

/* ───────────────────────────────────────────── */
/* tooltip */
/* ───────────────────────────────────────────── */

function ChartTooltip({
  active,
  payload,
  label,
  isDark,
}: any) {
  if (!active || !payload?.length) return null;

  return (
    <div
      style={{
        background: isDark
          ? "rgba(24,24,34,0.98)"
          : "#fff",
        borderRadius: 12,
        border: isDark
          ? "1px solid rgba(255,255,255,0.08)"
          : "1px solid rgba(0,0,0,0.08)",
        boxShadow: isDark
          ? "0 10px 30px rgba(0,0,0,0.45)"
          : "0 10px 30px rgba(0,0,0,0.10)",
        padding: "10px 14px",
      }}
    >
      <p
        style={{
          margin: "0 0 6px",
          fontSize: 11.5,
          fontWeight: 700,
          color: isDark ? "#8E8EA0" : "#9E9EAD",
        }}
      >
        {label}
      </p>

      {payload.map((e: any) => (
        <p
          key={e.dataKey}
          style={{
            margin: "3px 0",
            fontSize: 13,
            fontWeight: 700,
            color: e.color,
          }}
        >
          {e.name}:{" "}
          <span
            style={{
              color: isDark ? "#F0F0F5" : "#0D0D12",
            }}
          >
            {e.value}
          </span>
        </p>
      ))}
    </div>
  );
}

/* ───────────────────────────────────────────── */
/* date picker */
/* ───────────────────────────────────────────── */

function DatePickerDropdown({
  dateFilter,
  setDateFilter,
  customStart,
  setCustomStart,
  customEnd,
  setCustomEnd,
  onClose,
  isDark,
  inputStyle,
  labelSt,
}: any) {
  const presets = ["all", "today", "week", "month"];

  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.97 }}
      transition={{ duration: 0.15 }}
      style={{
        position: "absolute",
        top: "calc(100% + 8px)",
        right: 0,
        width: 240,
        zIndex: 999,
        background: isDark
          ? "rgba(20,20,28,0.98)"
          : "rgba(255,255,255,0.98)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderRadius: 16,
        border: isDark
          ? "1px solid rgba(255,255,255,0.08)"
          : "1px solid rgba(0,0,0,0.08)",
        boxShadow: isDark
          ? "0 20px 50px rgba(0,0,0,0.50)"
          : "0 20px 50px rgba(0,0,0,0.12)",
        padding: 8,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {presets.map((f) => (
        <button
          key={f}
          onClick={() => {
            setDateFilter(f);
            setCustomStart("");
            setCustomEnd("");
            onClose();
          }}
          style={{
            width: "100%",
            textAlign: "left",
            padding: "9px 12px",
            borderRadius: 10,
            border: "none",
            background:
              dateFilter === f
                ? isDark
                  ? "rgba(124,124,240,0.12)"
                  : "rgba(91,91,214,0.08)"
                : "transparent",
            color:
              dateFilter === f
                ? isDark
                  ? "#7C7CF0"
                  : "#5B5BD6"
                : isDark
                ? "#F0F0F5"
                : "#0D0D12",
            fontWeight: dateFilter === f ? 700 : 500,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          {DATE_LABELS[f]}
        </button>
      ))}

      <button
        onClick={() => setDateFilter("custom")}
        style={{
          width: "100%",
          textAlign: "left",
          padding: "9px 12px",
          borderRadius: 10,
          border: "none",
          background:
            dateFilter === "custom"
              ? isDark
                ? "rgba(124,124,240,0.12)"
                : "rgba(91,91,214,0.08)"
              : "transparent",
          color:
            dateFilter === "custom"
              ? isDark
                ? "#7C7CF0"
                : "#5B5BD6"
              : isDark
              ? "#F0F0F5"
              : "#0D0D12",
          fontWeight: dateFilter === "custom" ? 700 : 500,
          fontSize: 13,
          cursor: "pointer",
        }}
      >
        Custom Range
      </button>

      {dateFilter === "custom" && (
        <div
          style={{
            padding: "12px 8px 4px",
            borderTop: isDark
              ? "1px solid rgba(255,255,255,0.07)"
              : "1px solid rgba(0,0,0,0.07)",
            marginTop: 8,
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <div>
            <label style={labelSt}>Start</label>

            <DateInput
              value={customStart}
              onChange={(val) => setCustomStart(val)}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelSt}>End</label>

            <DateInput
              value={customEnd}
              onChange={(val) => setCustomEnd(val)}
              style={inputStyle}
            />
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              if (customStart && customEnd) onClose();
            }}
            disabled={!customStart || !customEnd}
            style={{
              padding: "9px 0",
              borderRadius: 10,
              border: "none",
              background:
                customStart && customEnd
                  ? isDark
                    ? "#7C7CF0"
                    : "#5B5BD6"
                  : "#BBBBC8",
              color: "#fff",
              fontWeight: 700,
              fontSize: 13,
              cursor:
                customStart && customEnd
                  ? "pointer"
                  : "not-allowed",
            }}
          >
            Apply
          </motion.button>
        </div>
      )}
    </motion.div>
  );
}

/* ───────────────────────────────────────────── */
/* main */
/* ───────────────────────────────────────────── */

export default function AdminLeadsDashboard() {
  const { token } = useAuth();
  const { theme } = useTheme();

  const isDark = theme === "dark";

  const navigate = useNavigate();
  const pickerRef = useRef<HTMLDivElement>(null);

  /* theme colors */

  const textPrimary = isDark ? "#F0F0F5" : "#0D0D12";
  const textSecondary = isDark ? "#A0A0B0" : "#6B6B7B";
  const textMuted = isDark ? "#68687A" : "#9E9EAD";

  const accentMain = isDark ? "#7C7CF0" : "#5B5BD6";

  const cardBg = isDark
    ? "rgba(20,20,28,0.98)"
    : "rgba(255,255,255,0.95)";

  const cardBorder = isDark
    ? "rgba(255,255,255,0.08)"
    : "rgba(255,255,255,0.60)";

  const cardShadow = isDark
    ? "0 20px 60px rgba(0,0,0,0.55)"
    : "0 8px 30px rgba(0,0,0,0.08)";

  const inputBg = isDark
    ? "rgba(30,30,42,0.90)"
    : "#F6F7F9";

  const inputBorder = isDark
    ? "rgba(255,255,255,0.09)"
    : "rgba(0,0,0,0.10)";

  /* shared styles */

  const card: React.CSSProperties = {
    background: cardBg,
    backdropFilter: "blur(24px) saturate(180%)",
    WebkitBackdropFilter: "blur(24px) saturate(180%)",
    borderRadius: 20,
    border: `1px solid ${cardBorder}`,
    boxShadow: cardShadow,
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    padding: "10px 13px",
    borderRadius: 10,
    border: `1px solid ${inputBorder}`,
    background: inputBg,
    fontSize: 13,
    color: textPrimary,
    outline: "none",
    fontFamily: "inherit",
  };

  const labelSt: React.CSSProperties = {
    display: "block",
    fontSize: 11.5,
    fontWeight: 700,
    color: textMuted,
    marginBottom: 6,
    letterSpacing: "0.05em",
    textTransform: "uppercase",
  };

  const sectionTitle: React.CSSProperties = {
    fontSize: 11.5,
    fontWeight: 800,
    color: textMuted,
    letterSpacing: "0.07em",
    textTransform: "uppercase",
    display: "flex",
    alignItems: "center",
    gap: 7,
  };

  /* react select */

  const selectStyles = {
    control: (p: any, s: any) => ({
      ...p,
      border: `1px solid ${inputBorder}`,
      borderRadius: 10,
      background: inputBg,
      minHeight: 42,
      boxShadow: s.isFocused
        ? isDark
          ? "0 0 0 3px rgba(124,124,240,0.18)"
          : "0 0 0 3px rgba(91,91,214,0.18)"
        : "none",
      "&:hover": {
        borderColor: isDark
          ? "rgba(124,124,240,0.40)"
          : "rgba(91,91,214,0.40)",
      },
      fontSize: 13,
    }),

    menu: (p: any) => ({
      ...p,
      borderRadius: 14,
      overflow: "hidden",
      zIndex: 9999,
      background: isDark
        ? "rgba(23,23,31,0.98)"
        : "#fff",
      border: isDark
        ? "1px solid rgba(255,255,255,0.08)"
        : "none",
      boxShadow: isDark
        ? "0 16px 40px rgba(0,0,0,0.55)"
        : "0 16px 40px rgba(0,0,0,0.14)",
    }),

    option: (p: any, s: any) => ({
      ...p,
      background: s.isSelected
        ? accentMain
        : s.isFocused
        ? isDark
          ? "rgba(124,124,240,0.10)"
          : "rgba(91,91,214,0.06)"
        : "transparent",

      color: s.isSelected
        ? "#fff"
        : textPrimary,

      fontSize: 13,
      padding: "10px 14px",
    }),

    singleValue: (p: any) => ({
      ...p,
      color: textPrimary,
      fontSize: 13,
    }),

    placeholder: (p: any) => ({
      ...p,
      color: textMuted,
      fontSize: 13,
    }),

    indicatorSeparator: () => ({
      display: "none",
    }),

    dropdownIndicator: (p: any) => ({
      ...p,
      color: textMuted,
    }),
  };

  /* state */

  const [dateFilter, setDateFilter] =
    useState("week");

  const [showDatePicker, setShowDatePicker] =
    useState(false);

  const [customStart, setCustomStart] =
    useState("");

  const [customEnd, setCustomEnd] =
    useState("");

  const [selectedAgent, setSelectedAgent] =
    useState<any>(null);

  const [agents, setAgents] =
    useState<any[]>([]);

  const [stats, setStats] = useState({
    totalLeads: 0,
    totalSales: 0,
    totalRevenue: 0,
    totalCalls: 0,
  });

  const [chartData, setChartData] =
    useState<any[]>([]);

  const [dispositionData, setDispositionData] =
    useState<any[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [selectedItem, setSelectedItem] =
    useState<any>(null);

  const [itemType, setItemType] =
    useState<"lead" | "sale" | null>(null);

  const [sidebarOpen, setSidebarOpen] =
    useState(false);

  /* outside click */

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(e.target as Node)
      ) {
        setShowDatePicker(false);
      }
    };

    document.addEventListener("mousedown", handler);

    return () =>
      document.removeEventListener(
        "mousedown",
        handler
      );
  }, []);

  /* load agents */

  useEffect(() => {
    api
      .get("/auth/available")
      .then((res) => {
        const opts = res.data.map(
          (a: any) => ({
            value: a.id,
            label: a.name,
          })
        );

        setAgents([
          {
            value: null,
            label: "All Agents",
          },
          ...opts,
        ]);
      })
      .catch((e) =>{
        console.log(e)
        toast.error("Could not load agents list")
      }
      );
  }, []);

  /* fetch dashboard */

  const fetchAllData = async () => {
    if (!token) return;

    setLoading(true);

    try {
      const params = new URLSearchParams({
        dateFilter,
      });

      if (
        dateFilter === "custom" &&
        customStart &&
        customEnd
      ) {
        params.append("startDate", customStart);
        params.append("endDate", customEnd);
      }

      if (selectedAgent?.value) {
        params.append(
          "agentId",
          selectedAgent.value
        );
      }

      const statsRes = await api.get(
        `/voice/leads-sales/stats?${params}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setStats(statsRes.data.stats || {});
      setChartData(statsRes.data.trend || []);
      setDispositionData(
        statsRes.data.dispositions || []
      );
    } catch {
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [
    token,
    dateFilter,
    customStart,
    customEnd,
    selectedAgent,
  ]);

  const goToDetail = (type: string) => {
    if (type === "revenue") return;

    const params = new URLSearchParams({
      type,
      dateFilter,

      ...(dateFilter === "custom" &&
      customStart
        ? { customStart }
        : {}),

      ...(dateFilter === "custom" &&
      customEnd
        ? { customEnd }
        : {}),

      ...(selectedAgent?.value
        ? {
            agentId:
              selectedAgent.value.toString(),
          }
        : {}),
    });

    navigate(`/admin/leads/detail?${params}`);
  };

  const dateLabel =
    dateFilter === "custom" &&
    customStart &&
    customEnd
      ? `${customStart} → ${customEnd}`
      : DATE_LABELS[dateFilter] ?? "Filter";

  const statValues = [
    stats.totalLeads,
    stats.totalSales,
    stats.totalRevenue
      ? `$${stats.totalRevenue}`
      : "$0",
    stats.totalCalls,
  ];

  return (
    <>
      {/* <Toaster position="top-right" /> */}

      <div
        style={{
          fontFamily:
            "'Inter', -apple-system, sans-serif",
          maxWidth: 1200,
          paddingBottom: 40,
        }}
      >
        {/* Header */}

        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 16,
            marginBottom: 28,
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: 24,
                fontWeight: 800,
                color: textPrimary,
                letterSpacing: "-0.4px",
              }}
            >
              Leads & Sales Dashboard
            </h1>

            <p
              style={{
                margin: "6px 0 0",
                fontSize: 13,
                color: textMuted,
              }}
            >
              Track conversions, revenue and
              agent performance
            </p>
          </div>

          {/* Filters */}

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <div style={{ width: 220 }}>
              <Select
                value={selectedAgent}
                onChange={setSelectedAgent}
                options={agents}
                placeholder="All Agents"
                styles={selectStyles}
              />
            </div>

            {/* Date picker */}

            <div
              ref={pickerRef}
              style={{
                position: "relative",
              }}
            >
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() =>
                  setShowDatePicker((v) => !v)
                }
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: `1px solid ${inputBorder}`,
                  background: inputBg,
                  color: textPrimary,
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                <Calendar
                  size={14}
                  color={textMuted}
                />

                {dateLabel}

                <ChevronDown
                  size={14}
                  color={textMuted}
                />
              </motion.button>

              <AnimatePresence>
                {showDatePicker && (
                  <DatePickerDropdown
                    dateFilter={dateFilter}
                    setDateFilter={setDateFilter}
                    customStart={customStart}
                    setCustomStart={setCustomStart}
                    customEnd={customEnd}
                    setCustomEnd={setCustomEnd}
                    onClose={() =>
                      setShowDatePicker(false)
                    }
                    isDark={isDark}
                    inputStyle={inputStyle}
                    labelSt={labelSt}
                  />
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Stat Cards */}

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(240px,1fr))",
            gap: 16,
            marginBottom: 24,
          }}
        >
          {STAT_META.map(
            (
              {
                type,
                label,
                icon: Icon,
                accent,
              },
              i
            ) => (
              <motion.div
                key={type}
                initial={{
                  opacity: 0,
                  y: 16,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                transition={{
                  delay: i * 0.07,
                }}
                whileHover={{
                  scale:
                    type !== "revenue"
                      ? 1.02
                      : 1,
                }}
                onClick={() =>
                  goToDetail(type)
                }
                style={{
                  ...card,
                  padding: "20px",
                  position: "relative",
                  overflow: "hidden",
                  cursor:
                    type !== "revenue"
                      ? "pointer"
                      : "default",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 3,
                    background: accent,
                  }}
                />

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent:
                      "space-between",
                  }}
                >
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 14,
                      background: `${accent}18`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent:
                        "center",
                    }}
                  >
                    <Icon
                      size={21}
                      color={accent}
                    />
                  </div>

                  <div
                    style={{
                      textAlign: "right",
                    }}
                  >
                    <p
                      style={{
                        margin: "0 0 4px",
                        fontSize: 11.5,
                        fontWeight: 700,
                        color: textMuted,
                        textTransform:
                          "uppercase",
                        letterSpacing:
                          "0.05em",
                      }}
                    >
                      {label}
                    </p>

                    <p
                      style={{
                        margin: 0,
                        fontSize: 28,
                        fontWeight: 800,
                        color: textPrimary,
                        letterSpacing:
                          "-0.5px",
                      }}
                    >
                      {loading
                        ? "—"
                        : statValues[i]}
                    </p>
                  </div>
                </div>
              </motion.div>
            )
          )}
        </div>

        {/* Charts */}

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(320px,1fr))",
            gap: 18,
            marginBottom: 20,
          }}
        >
          {/* Line chart */}

          <div
            style={{
              ...card,
              padding: "22px 18px",
            }}
          >
            <div
              style={{
                ...sectionTitle,
                marginBottom: 20,
              }}
            >
              <TrendingUp size={14} />
              Performance Trend
            </div>

            {loading ? (
              <div
                style={{
                  height: 280,
                  display: "flex",
                  alignItems: "center",
                  justifyContent:
                    "center",
                }}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    border: `3px solid ${
                      isDark
                        ? "rgba(124,124,240,0.18)"
                        : "rgba(91,91,214,0.15)"
                    }`,
                    borderTopColor:
                      accentMain,
                    animation:
                      "spin 0.7s linear infinite",
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
              </div>
            ) : chartData.length === 0 ? (
              <div
                style={{
                  height: 280,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent:
                    "center",
                  gap: 8,
                }}
              >
                <BarChart2
                  size={30}
                  color={textMuted}
                />

                <p
                  style={{
                    fontSize: 13,
                    color: textMuted,
                  }}
                >
                  No trend data for this
                  period
                </p>
              </div>
            ) : (
              <ResponsiveContainer
                width="100%"
                height={280}
              >
                <LineChart
                  data={chartData}
                  margin={{
                    top: 6,
                    right: 16,
                    left: 0,
                    bottom: 24,
                  }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={
                      isDark
                        ? "rgba(255,255,255,0.05)"
                        : "rgba(0,0,0,0.05)"
                    }
                    vertical={false}
                  />

                  <XAxis
                    dataKey="date"
                    tick={{
                      fontSize: 11,
                      fill: textMuted,
                    }}
                    axisLine={false}
                    tickLine={false}
                    angle={-30}
                    textAnchor="end"
                    height={48}
                  />

                  <YAxis
                    tick={{
                      fontSize: 11,
                      fill: textMuted,
                    }}
                    axisLine={false}
                    tickLine={false}
                  />

                  <Tooltip
                    content={
                      <ChartTooltip
                        isDark={isDark}
                      />
                    }
                  />

                  <Legend
                    wrapperStyle={{
                      fontSize: 12,
                      paddingTop: 10,
                    }}
                  />

                  <Line
                    type="monotone"
                    dataKey="leads"
                    stroke="#5B5BD6"
                    strokeWidth={2.5}
                    name="Leads"
                    dot={{
                      r: 3,
                      fill: "#5B5BD6",
                    }}
                  />

                  <Line
                    type="monotone"
                    dataKey="sales"
                    stroke="#10B981"
                    strokeWidth={2.5}
                    name="Sales"
                    dot={{
                      r: 3,
                      fill: "#10B981",
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Pie chart */}

          <div
            style={{
              ...card,
              padding: "22px 18px",
            }}
          >
            <div
              style={{
                ...sectionTitle,
                marginBottom: 20,
              }}
            >
              <BarChart2 size={14} />
              Disposition Breakdown
            </div>

            {loading ? (
              <div
                style={{
                  height: 280,
                  display: "flex",
                  alignItems: "center",
                  justifyContent:
                    "center",
                }}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    border: `3px solid ${
                      isDark
                        ? "rgba(124,124,240,0.18)"
                        : "rgba(91,91,214,0.15)"
                    }`,
                    borderTopColor:
                      accentMain,
                    animation:
                      "spin 0.7s linear infinite",
                  }}
                />
              </div>
            ) : dispositionData.length ===
              0 ? (
              <div
                style={{
                  height: 280,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent:
                    "center",
                  gap: 8,
                }}
              >
                <BarChart2
                  size={30}
                  color={textMuted}
                />

                <p
                  style={{
                    fontSize: 13,
                    color: textMuted,
                  }}
                >
                  No disposition data for
                  this period
                </p>
              </div>
            ) : (
              <ResponsiveContainer
                width="100%"
                height={280}
              >
                <PieChart>
                  <Pie
                    data={dispositionData}
                    cx="50%"
                    cy="45%"
                    innerRadius={60}
                    outerRadius={100}
                    dataKey="value"
                    paddingAngle={3}
                  >
                    {dispositionData.map(
                      (_: any, idx: number) => (
                        <Cell
                          key={idx}
                          fill={
                            PIE_COLORS[
                              idx %
                                PIE_COLORS.length
                            ]
                          }
                        />
                      )
                    )}
                  </Pie>

                  <Tooltip
                    contentStyle={{
                      borderRadius: 10,
                      border: isDark
                        ? "1px solid rgba(255,255,255,0.08)"
                        : "1px solid rgba(0,0,0,0.08)",
                      background: isDark
                        ? "rgba(24,24,34,0.98)"
                        : "#fff",
                      color: textPrimary,
                    }}
                  />

                  <Legend
                    wrapperStyle={{
                      fontSize: 12,
                      paddingTop: 8,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Sidebar */}

        <LeadSaleSidebar
          isOpen={sidebarOpen}
          onClose={() =>
            setSidebarOpen(false)
          }
          item={selectedItem}
          itemType={itemType}
          onSaveSuccess={fetchAllData}
        />
      </div>
    </>
  );
}