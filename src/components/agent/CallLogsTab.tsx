// components/agent/CallLogsTab.tsx
// @ts-nocheck
import { useTheme } from "../../context/ThemeContext";
import DataTable from "../shared/DataTable";
import {
  PhoneIncoming, PhoneOutgoing, PhoneMissed,
  Phone, Users,
} from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";

interface CallLog {
  type:     "inbound" | "outbound" | "missed";
  number:   string;
  date:     string;
  duration: string;
  status:   string;
}

/* ── helpers ── */
function formatDate(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-US", { month:"short", day:"numeric" });
}
function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour:"numeric", minute:"2-digit" });
}

export default function CallLogsTab({
  callStats,
  callLogs,
}: {
  callStats: any;
  callLogs: CallLog[];
}) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  /* ── Theme Colors (Consistent with DNC) ── */
  const textPrimary = isDark ? "#F0F0F5" : "#0D0D12";
  const textMuted = isDark ? "#68687A" : "#9E9EAD";
  const cardBg = isDark ? "rgba(20,20,28,0.98)" : "#FFFFFF";
  const cardBorder = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)";
  const cardShadow = isDark ? "0 20px 50px rgba(0,0,0,0.55)" : "0 1px 4px rgba(0,0,0,0.05)";

  const secondaryBg = isDark ? "rgba(30,30,42,0.80)" : "#F6F7F9";

  const safeStats = callStats || {};

  /* ── Type Icon with Dark Mode ── */
  function TypeIcon({ type }: { type: string }) {
    if (type === "inbound") return (
      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          background: isDark ? "rgba(22,163,74,0.15)" : "rgba(22,163,74,0.10)",
          display: "flex", alignItems: "center", justifyContent: "center"
        }}>
          <PhoneIncoming size={14} color="#16A34A" />
        </div>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: "#16A34A" }}>Inbound</span>
      </div>
    );

    if (type === "outbound") return (
      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          background: isDark ? "rgba(37,99,235,0.15)" : "rgba(37,99,235,0.10)",
          display: "flex", alignItems: "center", justifyContent: "center"
        }}>
          <PhoneOutgoing size={14} color="#2563EB" />
        </div>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: "#2563EB" }}>Outbound</span>
      </div>
    );

    if (type === "missed") return (
      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          background: isDark ? "rgba(220,38,38,0.15)" : "rgba(220,38,38,0.10)",
          display: "flex", alignItems: "center", justifyContent: "center"
        }}>
          <PhoneMissed size={14} color="#DC2626" />
        </div>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: "#DC2626" }}>Missed</span>
      </div>
    );

    return <Phone size={15} color={textMuted} />;
  }

  const columns: ColumnDef<CallLog>[] = [
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => <TypeIcon type={row.getValue("type") as string} />,
    },
    {
      accessorKey: "number",
      header: "Phone Number",
      cell: ({ row }) => (
        <span style={{ 
          fontSize: 13.5, 
          fontWeight: 600, 
          color: textPrimary, 
          fontVariantNumeric: "tabular-nums" 
        }}>
          {row.getValue("number")}
        </span>
      ),
    },
    {
      accessorKey: "date",
      header: "Timestamp",
      cell: ({ row }) => {
        const iso = row.getValue("date") as string;
        return (
          <div style={{ lineHeight: 1.5 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: textPrimary }}>
              {formatDate(iso)}
            </div>
            <div style={{ fontSize: 12, color: textMuted }}>
              at {formatTime(iso)}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "duration",
      header: "Duration",
      cell: ({ row }) => (
        <span style={{ 
          fontSize: 13.5, 
          fontWeight: 600, 
          color: textPrimary, 
          fontVariantNumeric: "tabular-nums" 
        }}>
          {row.getValue("duration") || "—"}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const s = (row.getValue("status") as string || "").toLowerCase();
        const color = s === "completed" ? "#16A34A"
                    : s === "missed"    ? "#DC2626"
                    : s === "busy"      ? "#D97706"
                    : textMuted;
        const bg = s === "completed" ? (isDark ? "rgba(22,163,74,0.15)" : "rgba(22,163,74,0.09)")
                 : s === "missed"    ? (isDark ? "rgba(220,38,38,0.15)" : "rgba(220,38,38,0.09)")
                 : s === "busy"      ? (isDark ? "rgba(217,119,6,0.15)" : "rgba(217,119,6,0.09)")
                 : (isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)");

        return (
          <span style={{
            fontSize: 11.5, 
            fontWeight: 700, 
            textTransform: "capitalize",
            background: bg, 
            color,
            border: `1px solid ${color}33`,
            borderRadius: 9999, 
            padding: "3px 10px",
          }}>
            {row.getValue("status") || "—"}
          </span>
        );
      },
    },
  ];

  return (
    <div style={{
      background: cardBg,
      border: `1px solid ${cardBorder}`,
      borderRadius: 20,
      padding: 28,
      boxShadow: cardShadow,
      backdropFilter: isDark ? "blur(20px) saturate(180%)" : "none",
    }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{
          margin: 0,
          fontSize: 17,
          fontWeight: 800,
          color: textPrimary,
          letterSpacing: "-0.02em"
        }}>
          Call Logs
        </h2>
        <p style={{
          margin: "4px 0 0",
          fontSize: 13,
          color: textMuted
        }}>
          Activity summary and full call history
        </p>
      </div>

      {/* Divider */}
      <div style={{
        height: 1,
        background: cardBorder,
        marginBottom: 24
      }} />

      {/* Stat Cards */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
        gap: 12,
        marginBottom: 24,
      }}>
        {[
          { key: "total", label: "Total", icon: Phone, bg: isDark ? "rgba(124,124,240,0.15)" : "rgba(91,91,214,0.08)", fg: "#7C7CF0" },
          { key: "dialed", label: "Dialed", icon: PhoneOutgoing, bg: isDark ? "rgba(37,99,235,0.15)" : "rgba(37,99,235,0.08)", fg: "#2563EB" },
          { key: "received", label: "Received", icon: PhoneIncoming, bg: isDark ? "rgba(22,163,74,0.15)" : "rgba(22,163,74,0.08)", fg: "#16A34A" },
          { key: "answered", label: "Answered", icon: Phone, bg: isDark ? "rgba(16,185,129,0.15)" : "rgba(16,185,129,0.08)", fg: "#059669" },
          { key: "missed", label: "Missed", icon: PhoneMissed, bg: isDark ? "rgba(220,38,38,0.15)" : "rgba(220,38,38,0.08)", fg: "#DC2626" },
          { key: "connected", label: "Connected", icon: Users, bg: isDark ? "rgba(139,92,246,0.15)" : "rgba(124,58,237,0.08)", fg: "#7C3AED" },
        ].map(({ key, label, icon: Icon, bg, fg }) => (
          <div key={key} style={{
            background: cardBg,
            border: `1px solid ${cardBorder}`,
            borderRadius: 16,
            padding: "14px 16px",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}>
            <div style={{
              width: 38, height: 38, borderRadius: 11,
              background: bg,
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0
            }}>
              <Icon size={17} color={fg} />
            </div>
            <div>
              <div style={{
                fontSize: 11,
                fontWeight: 600,
                color: textMuted,
                textTransform: "uppercase",
                letterSpacing: "0.04em"
              }}>
                {label}
              </div>
              <div style={{
                fontSize: 20,
                fontWeight: 800,
                color: textPrimary,
                fontVariantNumeric: "tabular-nums",
                lineHeight: 1.2
              }}>
                {safeStats[key] ?? 0}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Call Log Table */}
      <DataTable
        columns={columns}
        data={callLogs || []}
        loading={false}
        searchPlaceholder="Search calls…"
      />
    </div>
  );
}