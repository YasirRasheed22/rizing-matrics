// src/pages/admin/NumberDetailPage.tsx
// @ts-nocheck
import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Phone, Settings, Users, Shield, Activity } from "lucide-react";
import { Toaster } from "react-hot-toast";
import { useTheme } from "../../context/ThemeContext";

import NumberProfileTab       from "../../components/numbers/NumberProfileTab";
import NumberAssignmentTab    from "../../components/numbers/NumberAssignmentTab";
import NumberCapabilitiesTab  from "../../components/numbers/NumberCapabilitiesTab";
import NumberAnalyticsTab     from "../../components/numbers/NumberAnalyticsTab";
import NumberConfigurationTab from "../../components/numbers/NumberConfigurationTab";

const TABS = [
  { id: "profile",       label: "Profile",       icon: Settings  },
  { id: "assignment",    label: "Assignment",     icon: Users     },
  { id: "capabilities",  label: "Capabilities",   icon: Shield    },
  { id: "analytics",     label: "Analytics",      icon: Activity  },
  { id: "configuration", label: "Configuration",  icon: Settings  },
];

export default function NumberDetailPage() {
  const { id: numberId } = useParams();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [activeTab, setActiveTab] = useState("profile");

  const textPrimary  = isDark ? "#F0F0F5"                  : "#0D0D12";
  const textMuted    = isDark ? "#68687A"                  : "#9E9EAD";
  const textSecondary= isDark ? "#A0A0B0"                  : "#6B6B7B";
  const accentMain   = isDark ? "#7C7CF0"                  : "#5B5BD6";
  const accentBg     = isDark ? "rgba(124,124,240,0.12)"   : "rgba(91,91,214,0.12)";
  const cardBg       = isDark ? "rgba(23,23,31,0.92)"      : "rgba(255,255,255,0.92)";
  const cardBorder   = isDark ? "rgba(255,255,255,0.07)"   : "rgba(255,255,255,0.60)";
  const cardShadow   = isDark
    ? "0 4px 24px rgba(0,0,0,0.40), 0 0 0 1px rgba(255,255,255,0.04)"
    : "0 4px 24px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.04)";
  const backBtnBg    = isDark ? "rgba(255,255,255,0.06)"   : "#F6F7F9";
  const backBtnBord  = isDark ? "rgba(255,255,255,0.09)"   : "rgba(0,0,0,0.10)";
  const tabInactiveCl= isDark ? "#A0A0B0"                  : "#6B6B7B";
  const tabInactiveBg= isDark ? "transparent"              : "transparent";
  const tabHoverBg   = isDark ? "rgba(255,255,255,0.04)"   : "rgba(0,0,0,0.03)";

  const card: React.CSSProperties = {
    background: cardBg,
    backdropFilter: "blur(24px) saturate(180%)",
    WebkitBackdropFilter: "blur(24px) saturate(180%)",
    borderRadius: 18, border: `1px solid ${cardBorder}`, boxShadow: cardShadow,
  };

  return (
    <>
      {/* <Toaster position="top-right" /> */}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ fontFamily: "'Inter', -apple-system, sans-serif" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
          <motion.button
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={() => navigate("/admin/numbers")}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 10, border: `1px solid ${backBtnBord}`, background: backBtnBg, color: textSecondary, fontWeight: 700, fontSize: 13, cursor: "pointer" }}
          >
            <ArrowLeft size={14} /> Back
          </motion.button>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: accentBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Phone size={20} color={accentMain} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: textPrimary, letterSpacing: "-0.3px" }}>Phone Number Details</h1>
              <p style={{ margin: 0, fontSize: 12, color: textMuted }}>ID: {numberId}</p>
            </div>
          </div>
        </div>

        {/* Tab bar */}
        <div style={{ ...card, padding: "6px 8px", marginBottom: 16, display: "inline-flex", flexWrap: "wrap", gap: 4 }}>
          {TABS.map(({ id: tabId, label, icon: Icon }) => {
            const active = activeTab === tabId;
            return (
              <motion.button
                key={tabId}
                whileHover={{ scale: active ? 1 : 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setActiveTab(tabId)}
                style={{
                  display: "flex", alignItems: "center", gap: 7,
                  padding: "8px 16px", borderRadius: 10, border: "none",
                  background: active ? accentMain : tabInactiveBg,
                  color: active ? "#fff" : tabInactiveCl,
                  fontWeight: 700, fontSize: 13, cursor: "pointer",
                  boxShadow: active ? (isDark ? "0 2px 10px rgba(124,124,240,0.35)" : "0 2px 10px rgba(91,91,214,0.25)") : "none",
                  transition: "all 0.18s",
                }}
              >
                <Icon size={14} />
                {label}
              </motion.button>
            );
          })}
        </div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.16 }}
            style={{ ...card, padding: "24px" }}
          >
            {activeTab === "profile"       && <NumberProfileTab       numberId={numberId} isDark={isDark} />}
            {activeTab === "assignment"    && <NumberAssignmentTab    numberId={numberId} isDark={isDark} />}
            {activeTab === "capabilities"  && <NumberCapabilitiesTab  numberId={numberId} isDark={isDark} />}
            {activeTab === "analytics"     && <NumberAnalyticsTab     numberId={numberId} isDark={isDark} />}
            {activeTab === "configuration" && <NumberConfigurationTab numberId={numberId} isDark={isDark} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </>
  );
}