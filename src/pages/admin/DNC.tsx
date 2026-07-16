// src/pages/DNC.tsx
//@ts-nocheck
import React, { useState, useEffect } from "react";
import DataTable from "../../components/shared/DataTable";
import type { ColumnDef } from "@tanstack/react-table";
import api from "../../api";
import { PhoneOff, Trash2, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";
import { useTheme } from "../../context/ThemeContext";
import { toast } from "react-hot-toast";

interface DNCEntry {
  id: number;
  number: string;
  markedAt: string;
}

export default function DNC() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [dncList, setDncList] = useState<DNCEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [newNumber, setNewNumber] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Theme Colors
  const textPrimary = isDark ? "#F0F0F5" : "#0D0D12";
  const textSecondary = isDark ? "#A0A0B0" : "#6B6B7B";
  const textMuted = isDark ? "#68687A" : "#9E9EAD";

  const accentMain = isDark ? "#7C7CF0" : "#5B5BD6";
  const accentBg = isDark
    ? "rgba(124,124,240,0.12)"
    : "rgba(91,91,214,0.12)";

  const cardBg = isDark
    ? "rgba(20,20,28,0.98)"
    : "rgba(255,255,255,0.98)";

  const cardBorder = isDark
    ? "rgba(255,255,255,0.08)"
    : "rgba(0,0,0,0.08)";

  const cardShadow = isDark
    ? "0 20px 50px rgba(0,0,0,0.55)"
    : "0 20px 50px rgba(0,0,0,0.10)";

  const inputBg = isDark
    ? "rgba(30,30,42,0.90)"
    : "#F6F7F9";

  const inputBorder = isDark
    ? "rgba(255,255,255,0.09)"
    : "rgba(0,0,0,0.10)";

  const sectionTitle = isDark ? "#68687A" : "#9E9EAD";

  const fetchDncList = async () => {
    setLoading(true);

    try {
      const res = await api.get("/voice/dnc");
      setDncList(res.data.dnc || []);
    } catch (err) {
      console.error("Failed to load DNC list", err);
      setError("Failed to load DNC list. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDncList();
  }, []);

  const handleAddNumber = async () => {
    if (!newNumber.trim()) {
      setError("Please enter a valid phone number.");
      return;
    }

    try {
      await api.post("/voice/dnc", { number: newNumber });

      toast.success("Number added to DNC");

      setNewNumber("");
      setError(null);

      fetchDncList();
    } catch (err) {
      console.error("Failed to add number", err);
      setError("Failed to add number. Please try again.");
    }
  };

  const handleRemoveNumber = async (id: number) => {
    try {
      await api.delete(`/voice/dnc/${id}`);

      toast.success("Number removed successfully");

      fetchDncList();
    } catch (err) {
      console.error("Failed to remove number", err);
      setError("Failed to remove number. Please try again.");
    }
  };

  const columns: ColumnDef<DNCEntry>[] = [
    {
      accessorKey: "number",
      header: "Phone Number",
      cell: ({ row }) => (
        <div
          style={{
            color: textPrimary,
            fontWeight: 600,
            fontSize: 13.5,
          }}
        >
          {row.original.number}
        </div>
      ),
    },
    {
      accessorKey: "markedAt",
      header: "Added Date",
      cell: ({ row }) => (
        <div
          style={{
            color: textSecondary,
            fontSize: 13,
          }}
        >
          {new Date(row.original.markedAt).toLocaleString()}
        </div>
      ),
    },
    {
      header: "Actions",
      cell: ({ row }) => (
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => handleRemoveNumber(row.original.id)}
          style={{
            padding: "8px 14px",
            borderRadius: 10,
            border: isDark
              ? "1px solid rgba(255,255,255,0.08)"
              : "1px solid rgba(0,0,0,0.08)",
            background: isDark
              ? "rgba(255,255,255,0.04)"
              : "#F6F7F9",
            color: "#EF4444",
            fontWeight: 700,
            fontSize: 13,
            display: "flex",
            alignItems: "center",
            gap: 8,
            cursor: "pointer",
          }}
        >
          <Trash2 size={15} />
          Remove
        </motion.button>
      ),
    },
  ];

  return (
    <div
      className="Ringnex-page"
      style={{
        color: textPrimary,
      }}
    >
      {/* Header */}
      <div className="mb-6">
        <h4
          className="Ringnex-title"
          style={{
            color: textPrimary,
            marginBottom: 8,
          }}
        >
          Do Not Call (DNC) List
        </h4>

        <p
          style={{
            color: textMuted,
            fontSize: 14,
            lineHeight: 1.6,
            margin: 0,
          }}
        >
          All numbers in this list are restricted from outbound
          calling by any agent.
        </p>
      </div>

      {/* Add Number Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        style={{
          background: cardBg,
          border: `1px solid ${cardBorder}`,
          borderRadius: 22,
          boxShadow: cardShadow,
          padding: 24,
          marginBottom: 24,
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
        }}
      >
        {/* Section Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 20,
          }}
        >
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              background: accentBg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ShieldCheck size={18} color={accentMain} />
          </div>

          <div>
            <div
              style={{
                fontSize: 15,
                fontWeight: 800,
                color: textPrimary,
              }}
            >
              Add New DNC Number
            </div>

            <div
              style={{
                fontSize: 12,
                color: sectionTitle,
                marginTop: 2,
              }}
            >
              Restrict a number from outbound calling
            </div>
          </div>
        </div>

        {/* Form */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 14,
            alignItems: "end",
          }}
        >
          <div
            style={{
              flex: 1,
              minWidth: 240,
            }}
          >
            <label
              style={{
                display: "block",
                fontSize: 11.5,
                fontWeight: 700,
                color: textMuted,
                marginBottom: 8,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              Phone Number
            </label>

            <input
              type="text"
              value={newNumber}
              onChange={(e) => setNewNumber(e.target.value)}
              placeholder="+1234567890"
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "12px 14px",
                borderRadius: 12,
                border: `1px solid ${inputBorder}`,
                background: inputBg,
                color: textPrimary,
                fontSize: 14,
                outline: "none",
                transition: "all 0.15s",
              }}
              onFocus={(e) =>
                (e.target.style.borderColor = isDark
                  ? "rgba(124,124,240,0.45)"
                  : "rgba(91,91,214,0.40)")
              }
              onBlur={(e) =>
                (e.target.style.borderColor = inputBorder)
              }
            />
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleAddNumber}
            style={{
              padding: "12px 20px",
              borderRadius: 12,
              border: "none",
              background: accentMain,
              color: "#fff",
              fontWeight: 700,
              fontSize: 13.5,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 10,
              boxShadow: isDark
                ? "0 4px 16px rgba(124,124,240,0.35)"
                : "0 4px 16px rgba(91,91,214,0.25)",
            }}
          >
            <PhoneOff size={17} />
            Add to DNC
          </motion.button>
        </div>

        {/* Error */}
        {error && (
          <div
            style={{
              marginTop: 14,
              color: "#EF4444",
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            {error}
          </div>
        )}
      </motion.div>

      {/* Table */}
      <div
        style={{
          background: cardBg,
          border: `1px solid ${cardBorder}`,
          borderRadius: 22,
          boxShadow: cardShadow,
          overflow: "hidden",
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
        }}
      >
        <DataTable
          columns={columns}
          data={dncList}
          loading={loading}
          searchPlaceholder="Search numbers..."
        />
      </div>
    </div>
  );
}