// src/pages/admin/Numbers.tsx
//@ts-nocheck
import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Phone, Plus, User, Users, Layers, ChevronRight } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import DataTable from "../../components/shared/DataTable";
import type { ColumnDef } from "@tanstack/react-table";
import api from "../../api";
import { useTheme } from "../../context/ThemeContext";

interface PhoneNumber {
  id: string;
  number: string;
  type: "Local" | "Toll-Free" | "International";
  assignedTo: { type: "User" | "Queue" | "Team"; name: string } | null;
  capabilities: string[];
  status: string;
}

export default function PhoneNumbersPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  /* ── Theme Colors ── */
  const textPrimary = isDark ? "#F0F0F5" : "#0D0D12";
  const textMuted = isDark ? "#68687A" : "#9E9EAD";
  const accentMain = isDark ? "#7C7CF0" : "#5B5BD6";
  const cardBorder = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)";

  const navigate = useNavigate();
  const [numbers, setNumbers] = useState<PhoneNumber[]>([]);
  const [loading, setLoading] = useState(true);

  /* ─── capability / type colours ─────────────────────── */
  const typeStyle = (t: string) => {
    if (t === "Toll-Free") return { 
      bg: isDark ? "rgba(124,58,237,0.15)" : "rgba(124,58,237,0.10)", 
      text: "#7C3AED" 
    };
    if (t === "International") return { 
      bg: isDark ? "rgba(14,165,233,0.15)" : "rgba(14,165,233,0.10)", 
      text: "#0284C7" 
    };
    return { 
      bg: isDark ? "rgba(124,124,240,0.15)" : "rgba(91,91,214,0.10)", 
      text: accentMain 
    };
  };

  const capStyle = { 
    bg: isDark ? "rgba(245,158,11,0.15)" : "rgba(245,158,11,0.10)", 
    text: "#D97706" 
  };

  const statusStyle = (s: string) =>
    s === "in-use"
      ? { bg: isDark ? "rgba(16,185,129,0.15)" : "rgba(16,185,129,0.10)", text: "#059669" }
      : { bg: isDark ? "rgba(107,107,123,0.15)" : "rgba(107,107,123,0.10)", text: textMuted };

  const fetchNumbers = async () => {
    try {
      setLoading(true);
      const res = await api.get("/voice/numbers-list");
      setNumbers(res.data.data || []);
    } catch (err) {
      console.error("Failed to fetch numbers:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchNumbers(); }, []);

  /* ── columns ── */
  const columns: ColumnDef<PhoneNumber>[] = [
    {
      accessorKey: "number",
      header: "Phone Number",
      cell: ({ row }) => (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ 
            width: 32, 
            height: 32, 
            borderRadius: 9, 
            background: isDark ? "rgba(124,124,240,0.15)" : "rgba(91,91,214,0.10)", 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center", 
            flexShrink: 0 
          }}>
            <Phone size={14} color={accentMain} />
          </div>
          <Link
            to={`/admin/numbers/view/${row.original.id}`}
            style={{ 
              fontWeight: 700, 
              fontSize: 13.5, 
              color: accentMain, 
              textDecoration: "none" 
            }}
            onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
            onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
          >
            {row.getValue("number")}
          </Link>
        </div>
      ),
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => {
        const t = row.getValue("type") as string;
        const sc = typeStyle(t);
        return (
          <span style={{ 
            display: "inline-block", 
            padding: "3px 10px", 
            borderRadius: 6, 
            background: sc.bg, 
            color: sc.text, 
            fontWeight: 700, 
            fontSize: 11.5, 
            letterSpacing: "0.03em" 
          }}>
            {t}
          </span>
        );
      },
    },
    {
      accessorKey: "assignedTo",
      header: "Assigned To",
      cell: ({ row }) => {
        const assigned = row.getValue("assignedTo") as PhoneNumber["assignedTo"];
        if (!assigned) {
          return <span style={{ color: textMuted, fontSize: 13, fontStyle: "italic" }}>Unassigned</span>;
        }
        const Icon = assigned.type === "User" ? User : assigned.type === "Team" ? Users : Layers;
        return (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ 
              width: 26, 
              height: 26, 
              borderRadius: 7, 
              background: isDark ? "rgba(124,124,240,0.15)" : "rgba(91,91,214,0.08)", 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center" 
            }}>
              <Icon size={13} color={accentMain} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 500, color: textPrimary }}>
              {assigned.name}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "capabilities",
      header: "Capabilities",
      cell: ({ row }) => {
        const caps = row.getValue("capabilities") as string[];
        return (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
            {caps.map((cap) => (
              <span 
                key={cap} 
                style={{ 
                  padding: "2px 8px", 
                  borderRadius: 5, 
                  background: capStyle.bg, 
                  color: capStyle.text, 
                  fontWeight: 700, 
                  fontSize: 11 
                }}
              >
                {cap}
              </span>
            ))}
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const s = row.getValue("status") as string;
        const sc = statusStyle(s);
        return (
          <span style={{ 
            display: "inline-block", 
            padding: "3px 10px", 
            borderRadius: 6, 
            background: sc.bg, 
            color: sc.text, 
            fontWeight: 700, 
            fontSize: 11.5, 
            textTransform: "capitalize" 
          }}>
            {s}
          </span>
        );
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <motion.button
            whileHover={{ scale: 1.04 }} 
            whileTap={{ scale: 0.96 }}
            onClick={() => navigate(`/admin/numbers/view/${row.original.id}`)}
            style={{ 
              display: "inline-flex", 
              alignItems: "center", 
              gap: 5, 
              padding: "6px 14px", 
              borderRadius: 8, 
              border: "none", 
              background: isDark ? "rgba(124,124,240,0.12)" : "rgba(91,91,214,0.08)", 
              color: accentMain, 
              fontWeight: 700, 
              fontSize: 12.5, 
              cursor: "pointer" 
            }}
          >
            Manage <ChevronRight size={12} />
          </motion.button>
        </div>
      ),
    },
  ];

  return (
    <>
     
      <div style={{ 
        fontFamily: "'Inter', -apple-system, sans-serif", 
        maxWidth: 1100,
        color: textPrimary 
      }}>

        {/* ── Header ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ 
              width: 40, 
              height: 40, 
              borderRadius: 12, 
              background: isDark ? "rgba(124,124,240,0.15)" : "rgba(91,91,214,0.12)", 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center" 
            }}>
              <Phone size={20} color={accentMain} />
            </div>
            <div>
              <h1 style={{ 
                margin: 0, 
                fontSize: 22, 
                fontWeight: 800, 
                color: textPrimary, 
                letterSpacing: "-0.4px" 
              }}>
                Phone Numbers
              </h1>
              <p style={{ 
                margin: 0, 
                fontSize: 12.5, 
                color: textMuted 
              }}>
                Manage company numbers, assignments & routing
              </p>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.03 }} 
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate("/admin/buy-number")}
            style={{ 
              display: "flex", 
              alignItems: "center", 
              gap: 7, 
              padding: "10px 20px", 
              borderRadius: 10, 
              border: "none", 
              background: accentMain, 
              color: "#fff", 
              fontWeight: 700, 
              fontSize: 13, 
              cursor: "pointer", 
              boxShadow: isDark 
                ? "0 2px 12px rgba(124,124,240,0.35)" 
                : "0 2px 12px rgba(91,91,214,0.28)" 
            }}
          >
            <Plus size={15} /> Buy New Number
          </motion.button>
        </div>

        {/* ── Table ── */}
        <DataTable
          columns={columns}
          data={numbers}
          loading={loading}
          searchPlaceholder="Search phone numbers…"
        />
      </div>
    </>
  );
}