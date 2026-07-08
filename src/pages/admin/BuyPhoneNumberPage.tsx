// src/pages/admin/BuyPhoneNumberPage.tsx
//@ts-nocheck
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Phone, DollarSign, CheckCircle, ArrowLeft, X, Globe, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast, Toaster } from "react-hot-toast";
import DataTable from "../../components/shared/DataTable";
import type { ColumnDef } from "@tanstack/react-table";
import api from "../../api";
import { useTheme } from "../../context/ThemeContext";

/* ─── types ─────────────────────────────────────────── */
interface AvailableNumber {
  number: string;
  friendlyName: string;
  region: string;
  isoCountry: string;
  capabilities: string[];
  monthlyPrice: number;
  setupPrice: number;
}
const card: React.CSSProperties = {
  background: "rgba(255,255,255,0.92)",
  backdropFilter: "blur(24px) saturate(180%)",
  WebkitBackdropFilter: "blur(24px) saturate(180%)",
  borderRadius: 18,
  border: "1px solid rgba(255,255,255,0.60)",
  boxShadow: "0 4px 24px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.04)",
};

const inputStyle: React.CSSProperties = {
  width: "100%", boxSizing: "border-box",
  padding: "10px 13px", borderRadius: 10,
  border: "1px solid rgba(0,0,0,0.10)",
  background: "#F6F7F9", fontSize: 13.5,
  color: "#0D0D12", outline: "none",
  fontFamily: "inherit", transition: "border-color 0.15s",
};

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 11.5, fontWeight: 700,
  color: "#6B6B7B", marginBottom: 6, letterSpacing: "0.04em",
  textTransform: "uppercase",
};

const capStyle = { bg: "rgba(245,158,11,0.10)", text: "#D97706" };
/* ─── Confirm Modal ──────────────────────────────────── */
function ConfirmModal({ number, type, onCancel, onConfirm, buying, error }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const textPrimary = isDark ? "#F0F0F5" : "#0D0D12";
  const textMuted = isDark ? "#68687A" : "#9E9EAD";
  const accentMain = isDark ? "#7C7CF0" : "#5B5BD6";
  const cardBg = isDark ? "rgba(20,20,28,0.98)" : "rgba(255,255,255,0.97)";
  const cardBorder = isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.70)";
  const secondaryBg = isDark ? "rgba(30,30,42,0.90)" : "#F6F7F9";

  return (
    <AnimatePresence>
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }}
        onClick={onCancel}
        style={{
          position: "fixed", 
          inset: 0, 
          zIndex: 9000,
          background: isDark ? "rgba(0,0,0,0.75)" : "rgba(13,13,18,0.45)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
          display: "flex", 
          alignItems: "center", 
          justifyContent: "center", 
          padding: 20,
        }}
      >
        <motion.div
          key="modal"
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            width: "100%", 
            maxWidth: 440,
            background: cardBg,
            backdropFilter: "blur(24px) saturate(180%)",
            WebkitBackdropFilter: "blur(24px) saturate(180%)",
            borderRadius: 20, 
            border: `1px solid ${cardBorder}`,
            boxShadow: isDark ? "0 24px 64px rgba(0,0,0,0.55)" : "0 24px 64px rgba(0,0,0,0.18)",
            fontFamily: "'Inter', -apple-system, sans-serif",
            color: textPrimary,
          }}
        >
          {/* Header */}
          <div style={{ 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "space-between", 
            padding: "18px 22px 16px", 
            borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)"}` 
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ 
                width: 34, height: 34, borderRadius: 10, 
                background: isDark ? "rgba(124,124,240,0.15)" : "rgba(91,91,214,0.12)", 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center" 
              }}>
                <CheckCircle size={16} color={accentMain} />
              </div>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>Confirm Purchase</p>
              
            </div>
           
            <motion.button
              whileHover={{ scale: 1.08 }} 
              whileTap={{ scale: 0.92 }}
              onClick={onCancel}
              style={{ 
                width: 28, height: 28, borderRadius: 7, 
                border: "none", 
                background: isDark ? "rgba(30,30,42,0.90)" : "#F0F0F5", 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center", 
                cursor: "pointer" 
              }}
            >
              <X size={13} color={textMuted} />
            </motion.button>
          </div>
          
            

          {/* Body */}
          <div style={{ padding: "18px 22px", display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              { label: "Number",       value: number.friendlyName },
              { label: "Type",         value: type.toUpperCase()  },
              { label: "Region",       value: number.region       },
              { label: "Capabilities", value: number.capabilities.join(", ") },
              { label: "Monthly Cost", value: `$${Number(number.monthlyPrice).toFixed(2)} / mo` },
              { label: "Setup Fee",    value: `$${Number(number.setupPrice).toFixed(2)}`        },
            ].map(({ label, value }) => (
              <div key={label} style={{ 
                display: "flex", 
                justifyContent: "space-between", 
                alignItems: "center", 
                padding: "9px 12px", 
                borderRadius: 9, 
                background: secondaryBg 
              }}>
                <span style={{ 
                  fontSize: 12, 
                  fontWeight: 700, 
                  color: textMuted, 
                  textTransform: "uppercase", 
                  letterSpacing: "0.04em" 
                }}>
                  {label}
                </span>
                <span style={{ fontSize: 13.5, fontWeight: 600, color: textPrimary }}>
                  {value}
                </span>
              </div>
            ))}

            {error && (
              <p style={{ margin: "4px 0 0", fontSize: 12.5, color: "#E5534B", fontWeight: 600 }}>{error}</p>
            )}
          </div>

          {/* Footer */}
          <div style={{ 
            display: "flex", 
            gap: 8, 
            width:'100%'
            // padding: "14px 22px 20px", 
            // borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)"}` 
          }}>
            <span style={{width:'100%',padding:'10px 10px 10px',margin:'10px 10px'}} className="alert alert-warning">This process is under development......</span>
          
          </div>
          <div style={{ 
            display: "flex", 
            gap: 8, 
            padding: "14px 22px 20px", 
            borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)"}` 
          }}>
            <motion.button
              whileHover={{ scale: 1.02 }} 
              whileTap={{ scale: 0.97 }}
              onClick={onCancel}
              style={{ 
                flex: 1, 
                padding: "10px 0", 
                borderRadius: 10, 
                border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.10)"}`, 
                background: secondaryBg, 
                color: textMuted, 
                fontWeight: 700, 
                fontSize: 13, 
                cursor: "pointer" 
              }}
            >
              Cancel
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }} 
              whileTap={{ scale: 0.97 }}
              onClick={onConfirm}
              disabled={buying}
              style={{ 
                flex: 1, 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center", 
                gap: 6, 
                padding: "10px 0", 
                borderRadius: 10, 
                border: "none", 
                background: buying ? "#BBBBC8" : accentMain, 
                color: "#fff", 
                fontWeight: 700, 
                fontSize: 13, 
                cursor: buying ? "not-allowed" : "pointer", 
                boxShadow: buying ? "none" : (isDark ? "0 2px 10px rgba(124,124,240,0.35)" : "0 2px 10px rgba(91,91,214,0.28)") 
              }}
            >
              <CheckCircle size={14} />
              {buying ? "Purchasing…" : "Confirm Buy"}
            </motion.button>
          </div>
          
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ─── Main Page ──────────────────────────────────────── */
export default function BuyPhoneNumberPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const textPrimary = isDark ? "#F0F0F5" : "#0D0D12";
  const textMuted = isDark ? "#68687A" : "#9E9EAD";
  const accentMain = isDark ? "#7C7CF0" : "#5B5BD6";
  const cardBg = isDark ? "rgba(20,20,28,0.98)" : "rgba(255,255,255,0.92)";
  const cardBorder = isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.60)";
  const inputBg = isDark ? "rgba(30,30,42,0.90)" : "#F6F7F9";
  const inputBorder = isDark ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.10)";

  const navigate = useNavigate();
  const [availableNumbers, setAvailableNumbers] = useState<AvailableNumber[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchParams, setSearchParams] = useState({ country: "US", type: "local", areaCode: "", prefix: "" });
  const [selectedNumber, setSelectedNumber] = useState<AvailableNumber | null>(null);
  const [buying, setBuying] = useState(false);
  const [error, setError] = useState("");

  const set = (key: string, val: string) => setSearchParams((p) => ({ ...p, [key]: val }));

  const fetchAvailable = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/voice/numbers/available-numbers", { params: searchParams });
      setAvailableNumbers(res.data.data || []);
    } catch (err: any) {
      const msg = err.response?.data?.message || "Failed to search numbers";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAvailable(); }, []);

  const handleBuy = async () => {
    if (!selectedNumber) return;
    setBuying(true);
    setError("");
    try {
      const res = await api.post("/voice/numbers/buy-number", { phoneNumber: selectedNumber.number });
      if (res.data.success) {
        toast.success("Number purchased successfully!");
        setSelectedNumber(null);
        fetchAvailable();
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || "Purchase failed";
      setError(msg);
      toast.error(msg);
    } finally {
      setBuying(false);
    }
  };

  const capStyle = { 
    bg: isDark ? "rgba(245,158,11,0.15)" : "rgba(245,158,11,0.10)", 
    text: "#D97706" 
  };

  /* ── columns ── */
  const columns: ColumnDef<AvailableNumber>[] = [
    {
      accessorKey: "friendlyName",
      header: "Number",
      cell: ({ row }) => (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ 
            width: 30, 
            height: 30, 
            borderRadius: 8, 
            background: isDark ? "rgba(124,124,240,0.15)" : "rgba(91,91,214,0.10)", 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center", 
            flexShrink: 0 
          }}>
            <Phone size={13} color={accentMain} />
          </div>
          <span style={{ fontWeight: 700, fontSize: 13.5, color: textPrimary }}>
            {row.original.friendlyName}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "region",
      header: "Region",
      cell: ({ row }) => (
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Globe size={13} color={textMuted} />
          <span style={{ fontSize: 13, color: textMuted }}>{row.original.region || "—"}</span>
        </div>
      ),
    },
    {
      accessorKey: "capabilities",
      header: "Capabilities",
      cell: ({ row }) => (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {row.original.capabilities.map((cap) => (
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
      ),
    },
    {
      accessorKey: "monthlyPrice",
      header: "Monthly Cost",
      cell: ({ row }) => (
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <DollarSign size={13} color="#10B981" />
          <span style={{ fontWeight: 700, fontSize: 13.5, color: textPrimary }}>
            {Number(row.original.monthlyPrice).toFixed(2)}
            <span style={{ fontSize: 11.5, color: textMuted, fontWeight: 500 }}> / mo</span>
          </span>
        </div>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <motion.button
            whileHover={{ scale: 1.04 }} 
            whileTap={{ scale: 0.96 }}
            onClick={() => setSelectedNumber(row.original)}
            style={{ 
              display: "inline-flex", 
              alignItems: "center", 
              gap: 5, 
              padding: "7px 16px", 
              borderRadius: 8, 
              border: "none", 
              background: accentMain, 
              color: "#fff", 
              fontWeight: 700, 
              fontSize: 12.5, 
              cursor: "pointer", 
              boxShadow: isDark ? "0 2px 8px rgba(124,124,240,0.35)" : "0 2px 8px rgba(91,91,214,0.22)" 
            }}
          >
            <Zap size={12} /> Buy
          </motion.button>
        </div>
      ),
    },
  ];

  return (
    <>
      {/* <Toaster position="top-right" /> */}
      <div style={{ 
        fontFamily: "'Inter', -apple-system, sans-serif", 
        maxWidth: 1100,
        color: textPrimary 
      }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
          <motion.button
            whileHover={{ scale: 1.05 }} 
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate("/admin/numbers")}
            style={{ 
              display: "flex", 
              alignItems: "center", 
              gap: 6, 
              padding: "8px 14px", 
              borderRadius: 10, 
              border: `1px solid ${cardBorder}`, 
              background: isDark ? "rgba(30,30,42,0.90)" : "#F6F7F9", 
              color: textMuted, 
              fontWeight: 700, 
              fontSize: 13, 
              cursor: "pointer" 
            }}
          >
            <ArrowLeft size={14} /> Back
          </motion.button>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
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
                Buy New Number
              </h1>
              <p style={{ margin: 0, fontSize: 12.5, color: textMuted }}>
                Search and purchase available phone numbers
              </p>
            </div>
          </div>
        </div>

        {/* Search Form */}
        <div style={{ 
          ...card, 
          background: cardBg, 
          border: `1px solid ${cardBorder}`, 
          padding: "20px 22px", 
          marginBottom: 18 
        }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 14, alignItems: "flex-end" }}>

            <div>
              <label style={{
                display: "block", 
                fontSize: 11.5, 
                fontWeight: 700,
                color: textMuted, 
                marginBottom: 6, 
                letterSpacing: "0.04em",
                textTransform: "uppercase"
              }}>Country</label>
              <select
                value={searchParams.country}
                onChange={(e) => set("country", e.target.value)}
                style={{
                  ...inputStyle,
                  background: inputBg,
                  border: `1px solid ${inputBorder}`,
                  color: textPrimary,
                }}
                onFocus={(e) => (e.target.style.borderColor = accentMain)}
                onBlur={(e) => (e.target.style.borderColor = inputBorder)}
              >
                <option value="US">🇺🇸 United States</option>
                <option value="CA">🇨🇦 Canada</option>
                <option value="GB">🇬🇧 United Kingdom</option>
                <option value="AU">🇦🇺 Australia</option>
              </select>
            </div>

            <div>
              <label style={{
                display: "block", 
                fontSize: 11.5, 
                fontWeight: 700,
                color: textMuted, 
                marginBottom: 6, 
                letterSpacing: "0.04em",
                textTransform: "uppercase"
              }}>Number Type</label>
              <select
                value={searchParams.type}
                onChange={(e) => set("type", e.target.value)}
                style={{
                  ...inputStyle,
                  background: inputBg,
                  border: `1px solid ${inputBorder}`,
                  color: textPrimary,
                }}
                onFocus={(e) => (e.target.style.borderColor = accentMain)}
                onBlur={(e) => (e.target.style.borderColor = inputBorder)}
              >
                <option value="local">Local</option>
                <option value="tollfree">Toll-Free</option>
              </select>
            </div>

            <div>
              {searchParams.type === "local" ? (
                <>
                  <label style={{
                    display: "block", 
                    fontSize: 11.5, 
                    fontWeight: 700,
                    color: textMuted, 
                    marginBottom: 6, 
                    letterSpacing: "0.04em",
                    textTransform: "uppercase"
                  }}>Area Code</label>
                  <input
                    type="text"
                    placeholder="e.g. 415"
                    value={searchParams.areaCode}
                    onChange={(e) => set("areaCode", e.target.value)}
                    style={{
                      ...inputStyle,
                      background: inputBg,
                      border: `1px solid ${inputBorder}`,
                      color: textPrimary,
                    }}
                    onFocus={(e) => (e.target.style.borderColor = accentMain)}
                    onBlur={(e) => (e.target.style.borderColor = inputBorder)}
                  />
                </>
              ) : (
                <>
                  <label style={{
                    display: "block", 
                    fontSize: 11.5, 
                    fontWeight: 700,
                    color: textMuted, 
                    marginBottom: 6, 
                    letterSpacing: "0.04em",
                    textTransform: "uppercase"
                  }}>Prefix</label>
                  <input
                    type="text"
                    placeholder="e.g. 888"
                    value={searchParams.prefix}
                    onChange={(e) => set("prefix", e.target.value)}
                    style={{
                      ...inputStyle,
                      background: inputBg,
                      border: `1px solid ${inputBorder}`,
                      color: textPrimary,
                    }}
                    onFocus={(e) => (e.target.style.borderColor = accentMain)}
                    onBlur={(e) => (e.target.style.borderColor = inputBorder)}
                  />
                </>
              )}
            </div>

            <motion.button
              whileHover={{ scale: 1.03 }} 
              whileTap={{ scale: 0.97 }}
              onClick={fetchAvailable}
              disabled={loading}
              style={{ 
                display: "flex", 
                alignItems: "center", 
                gap: 7, 
                padding: "10px 22px", 
                borderRadius: 10, 
                border: "none", 
                background: loading ? "#BBBBC8" : accentMain, 
                color: "#fff", 
                fontWeight: 700, 
                fontSize: 13, 
                cursor: loading ? "not-allowed" : "pointer", 
                whiteSpace: "nowrap", 
                boxShadow: loading ? "none" : (isDark ? "0 2px 10px rgba(124,124,240,0.35)" : "0 2px 10px rgba(91,91,214,0.26)") 
              }}
            >
              <Search size={14} /> {loading ? "Searching…" : "Search"}
            </motion.button>
          </div>

          {error && !selectedNumber && (
            <p style={{ margin: "12px 0 0", fontSize: 12.5, color: "#E5534B", fontWeight: 600 }}>{error}</p>
          )}
        </div>

        {/* Results Table */}
        <DataTable
          columns={columns}
          data={availableNumbers}
          loading={loading}
          searchPlaceholder="Filter available numbers…"
        />

        {/* Confirm Modal */}
        {selectedNumber && (
          <ConfirmModal
            number={selectedNumber}
            type={searchParams.type}
            onCancel={() => { setSelectedNumber(null); setError(""); }}
            onConfirm={handleBuy}
            buying={buying}
            error={error}
          />
        )}
      </div>
    </>
  );
}