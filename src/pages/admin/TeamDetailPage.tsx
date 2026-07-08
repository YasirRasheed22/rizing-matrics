// src/pages/admin/TeamDetailPage.tsx
//@ts-nocheck
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Users, Settings, BarChart3,
  Trash2, AlertTriangle,
} from "lucide-react";
import { toast, Toaster } from "react-hot-toast";
import { useTheme } from "../../context/ThemeContext";

import TeamProfileTab    from "../../components/teams/TeamProfileTab";
import TeamAgentsTab     from "../../components/teams/TeamAgentsTab";
import TeamAnalyticsTab  from "../../components/teams/TeamAnalyticsTab";
import api from "../../api";

/* ─── tabs config ────────────────────────────────────── */
const TABS = [
  { id: "profile",   label: "Profile",   icon: Settings  },
  { id: "agents",    label: "Agents",    icon: Users     },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
];

/* ─── delete confirmation toast ─────────────────────── */
function DeleteConfirmToast({ t, teamName, teamId, onSuccess }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const textPrimary = isDark ? "#F0F0F5" : "#0D0D12";
  const textMuted = isDark ? "#68687A" : "#6B6B7B";
  const cardBg = isDark ? "rgba(20,20,28,0.98)" : "#fff";
  const cardBorder = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";

  const [busy, setBusy] = useState(false);

  return (
    <div style={{
      background: cardBg,
      borderRadius: 14,
      padding: "16px 18px",
      boxShadow: isDark ? "0 20px 50px rgba(0,0,0,0.55)" : "0 16px 48px rgba(0,0,0,0.18)",
      border: `1px solid ${cardBorder}`,
      maxWidth: 380,
      fontFamily: "'Inter', -apple-system, sans-serif",
      display: "flex",
      gap: 14,
      alignItems: "flex-start",
      color: textPrimary,
    }}>
      <div style={{
        width: 38, height: 38, borderRadius: 10,
        background: isDark ? "rgba(229,83,75,0.20)" : "rgba(229,83,75,0.12)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0
      }}>
        <AlertTriangle size={18} color="#E5534B" />
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 700 }}>Delete Team?</p>
        <p style={{ margin: "0 0 14px", fontSize: 12.5, color: textMuted, lineHeight: 1.5 }}>
          Are you sure you want to delete <strong>{teamName}</strong>? This cannot be undone — all agents will be unassigned.
        </p>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            onClick={() => toast.dismiss(t.id)}
            style={{
              padding: "7px 16px",
              borderRadius: 8,
              border: `1px solid ${cardBorder}`,
              background: isDark ? "rgba(30,30,42,0.90)" : "#F6F7F9",
              color: textMuted,
              fontWeight: 700,
              fontSize: 12.5,
              cursor: "pointer"
            }}
          >
            Cancel
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              toast.dismiss(t.id);
              const tid = toast.loading("Deleting team…");
              try {
                await api.delete(`/voice/team/${teamId}`);
                toast.success("Team deleted", { id: tid });
                onSuccess();
              } catch (err) {
                toast.error(err.response?.data?.message || "Failed to delete team", { id: tid });
              } finally {
                setBusy(false);
              }
            }}
            style={{
              padding: "7px 16px",
              borderRadius: 8,
              border: "none",
              background: busy ? "#BBBBC8" : "#E5534B",
              color: "#fff",
              fontWeight: 700,
              fontSize: 12.5,
              cursor: busy ? "not-allowed" : "pointer"
            }}
          >
            {busy ? "Deleting…" : "Yes, Delete"}
          </motion.button>
        </div>
      </div>
    </div>
  );
}

/* ─── main page ─────────────────────────────────────── */
export default function TeamDetailPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  /* ── Theme Colors (Consistent with DNC) ── */
  const textPrimary = isDark ? "#F0F0F5" : "#0D0D12";
  const textMuted = isDark ? "#68687A" : "#9E9EAD";
  const accentMain = isDark ? "#7C7CF0" : "#5B5BD6";
  const cardBg = isDark ? "rgba(20,20,28,0.98)" : "rgba(255,255,255,0.92)";
  const cardBorder = isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.60)";
  const cardShadow = isDark 
    ? "0 20px 50px rgba(0,0,0,0.55)" 
    : "0 4px 24px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.04)";

  const { id } = useParams();
  const navigate = useNavigate();
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("profile");

  const fetchTeam = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const res = await api.get(`/voice/team/${id}`);
      if (res.data.success) {
        setTeam(res.data.data);
      } else {
        throw new Error(res.data.message || "Failed to load team");
      }
    } catch (err) {
      setError(err.message || "Failed to load team details");
      toast.error("Could not load team information");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTeam(); }, [id]);

  /* ── loading ── */
  if (loading) {
    return (
      <div style={{ 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center", 
        minHeight: "60vh",
        color: textMuted
      }}>
        <div style={{ 
          width: 36, height: 36, borderRadius: "50%", 
          border: `3px solid ${isDark ? "rgba(124,124,240,0.15)" : "rgba(91,91,214,0.15)"}`, 
          borderTopColor: accentMain, 
          animation: "spin 0.7s linear infinite" 
        }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  /* ── error ── */
  if (error || !team) {
    return (
      <div style={{ 
        display: "flex", 
        flexDirection: "column", 
        alignItems: "center", 
        justifyContent: "center", 
        minHeight: "60vh", 
        gap: 14 
      }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: "#E5534B" }}>
          {error || "Team not found"}
        </p>
        <motion.button
          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          onClick={() => navigate(-1)}
          style={{ 
            padding: "9px 20px", 
            borderRadius: 10, 
            border: "none", 
            background: accentMain, 
            color: "#fff", 
            fontWeight: 700, 
            fontSize: 13, 
            cursor: "pointer" 
          }}
        >
          Back to Teams
        </motion.button>
      </div>
    );
  }

  const membersCount = team.members?.length ?? 0;

  return (
    <>
      {/* <Toaster position="top-right" /> */}
      <div style={{ fontFamily: "'Inter', -apple-system, sans-serif", color: textPrimary }}>

        {/* ── Page header ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>

          {/* Left: back + name */}
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <motion.button
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => navigate(-1)}
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
                width: 40, height: 40, borderRadius: 12,
                background: isDark ? "rgba(124,124,240,0.15)" : "rgba(91,91,214,0.12)",
                display: "flex", alignItems: "center", justifyContent: "center"
              }}>
                <Users size={20} color={accentMain} />
              </div>
              <div>
                <h1 style={{ 
                  margin: 0, 
                  fontSize: 20, 
                  fontWeight: 800, 
                  color: textPrimary, 
                  letterSpacing: "-0.3px" 
                }}>
                  {team.name}
                </h1>
                <p style={{ margin: 0, fontSize: 12, color: textMuted }}>
                  {membersCount} agent{membersCount !== 1 ? "s" : ""} · {team.supervisor?.name || "No supervisor"}
                </p>
              </div>
            </div>
          </div>

          {/* Right: delete */}
          <motion.button
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={() =>
              toast.custom(
                (t) => (
                  <DeleteConfirmToast
                    t={t}
                    teamName={team.name}
                    teamId={team.id}
                    onSuccess={() => navigate(-1)}
                  />
                ),
                { duration: Infinity, position: "top-center" }
              )
            }
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              padding: "9px 18px",
              borderRadius: 10,
              border: "1px solid rgba(229,83,75,0.25)",
              background: isDark ? "rgba(229,83,75,0.15)" : "rgba(229,83,75,0.07)",
              color: "#E5534B",
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer"
            }}
          >
            <Trash2 size={14} /> Delete Team
          </motion.button>
        </div>

        {/* ── Tab bar ── */}
        <div style={{
          background: cardBg,
          backdropFilter: "blur(24px) saturate(180%)",
          WebkitBackdropFilter: "blur(24px) saturate(180%)",
          borderRadius: 18,
          border: `1px solid ${cardBorder}`,
          boxShadow: cardShadow,
          padding: "6px 8px",
          marginBottom: 16,
          display: "inline-flex",
          gap: 4
        }}>
          {TABS.map(({ id: tabId, label, icon: Icon }) => {
            const active = activeTab === tabId;
            return (
              <motion.button
                key={tabId}
                whileHover={{ scale: active ? 1 : 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setActiveTab(tabId)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  padding: "8px 18px",
                  borderRadius: 10,
                  border: "none",
                  background: active ? accentMain : "transparent",
                  color: active ? "#fff" : textMuted,
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer",
                  boxShadow: active ? (isDark ? "0 3px 12px rgba(124,124,240,0.35)" : "0 2px 10px rgba(91,91,214,0.25)") : "none",
                  transition: "all 0.18s",
                }}
              >
                <Icon size={14} />
                {label}
              </motion.button>
            );
          })}
        </div>

        {/* ── Tab content ── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16 }}
            style={{
              background: cardBg,
              backdropFilter: "blur(24px) saturate(180%)",
              WebkitBackdropFilter: "blur(24px) saturate(180%)",
              borderRadius: 18,
              border: `1px solid ${cardBorder}`,
              boxShadow: cardShadow,
              padding: "24px"
            }}
          >
            {activeTab === "profile" && <TeamProfileTab team={team} onTeamUpdated={fetchTeam} />}
            {activeTab === "agents" && <TeamAgentsTab team={team} />}
            {activeTab === "analytics" && <TeamAnalyticsTab team={team} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </>
  );
}