// src/pages/admin/Teams.tsx
//@ts-nocheck
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Plus, Users } from "lucide-react";
import { toast, Toaster } from "react-hot-toast";
import { useTheme } from "../../context/ThemeContext";
import TeamTable from "../../components/teams/TeamTable";
import CreateTeamModal from "../../components/teams/CreateTeamModal";
import api from "../../api";

export default function Teams() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const textPrimary  = isDark ? "#F0F0F5" : "#0D0D12";
  const textMuted    = isDark ? "#68687A"  : "#9E9EAD";
  const accentMain   = isDark ? "#7C7CF0"  : "#5B5BD6";
  const accentBg     = isDark ? "rgba(124,124,240,0.12)" : "rgba(91,91,214,0.10)";
  const cardBg       = isDark ? "rgba(23,23,31,0.92)"    : "rgba(255,255,255,0.92)";
  const cardBorder   = isDark ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.60)";
  const cardShadow   = isDark
    ? "0 4px 24px rgba(0,0,0,0.40), 0 0 0 1px rgba(255,255,255,0.04)"
    : "0 4px 24px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.04)";
  const spinBorder   = isDark ? "rgba(124,124,240,0.15)" : "rgba(91,91,214,0.15)";
  const errorColor   = isDark ? "#F87171"                : "#E5534B";

  const [teams, setTeams]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [showModal, setShowModal] = useState(false);

  const fetchTeams = async () => {
    try {
      setLoading(true); setError(null);
      const response = await api.get("/voice/team");
      const teamData = response.data.data || response.data || [];
      setTeams(teamData.map((team) => ({
        id: team.id, name: team.name,
        description: team.description || "No description",
        agents: team.members?.length || 0, queues: 0,
        supervisor: team.supervisor?.name || "Not assigned",
        supervisorId: team.supervisorId, status: team.status, createdAt: team.createdAt,
      })));
    } catch (err) {
      console.error("Failed to load teams:", err);
      setError("Failed to load teams. Please try again.");
      toast.error("Could not fetch teams");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTeams(); }, []);

  const addTeam = (newTeamFromServer) => {
    setTeams((prev) => [...prev, {
      id: newTeamFromServer.id, name: newTeamFromServer.name,
      description: newTeamFromServer.description || "No description",
      agents: newTeamFromServer.users?.length || 0, queues: 0,
      supervisor: newTeamFromServer.supervisor?.name || "Not assigned",
      supervisorId: newTeamFromServer.supervisorId,
      status: newTeamFromServer.status || "active",
    }]);
  };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "80px 0" }}>
      <div style={{ width: 36, height: 36, borderRadius: "50%", border: `3px solid ${spinBorder}`, borderTopColor: accentMain, animation: "spin 0.7s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (error) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 0", gap: 12 }}>
      <p style={{ color: errorColor, fontSize: 14, fontWeight: 600 }}>{error}</p>
      <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={fetchTeams}
        style={{ padding: "8px 20px", borderRadius: 10, border: "none", background: accentMain, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
        Retry
      </motion.button>
    </div>
  );

  return (
    <>
      {/* <Toaster position="top-right" /> */}
      <div style={{ fontFamily: "'Inter', -apple-system, sans-serif" }}>

        {/* Page header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: accentBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Users size={20} color={accentMain} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: textPrimary, letterSpacing: "-0.4px" }}>Teams</h1>
              <p style={{ margin: 0, fontSize: 12.5, color: textMuted }}>Manage groups of agents and assign queues</p>
            </div>
          </div>
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => setShowModal(true)}
            style={{ display: "flex", alignItems: "center", gap: 7, padding: "10px 20px", borderRadius: 10, border: "none", background: accentMain, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", boxShadow: isDark ? "0 2px 12px rgba(124,124,240,0.35)" : "0 2px 12px rgba(91,91,214,0.28)" }}>
            <Plus size={15} /> Create Team
          </motion.button>
        </div>

        {/* Table / Empty */}
        {teams.length === 0 ? (
          <div style={{ background: cardBg, backdropFilter: "blur(24px) saturate(180%)", WebkitBackdropFilter: "blur(24px) saturate(180%)", borderRadius: 18, border: `1px solid ${cardBorder}`, boxShadow: cardShadow, padding: "60px 24px", textAlign: "center" }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: accentBg, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <Users size={26} color={accentMain} />
            </div>
            <p style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 700, color: textPrimary }}>No teams yet</p>
            <p style={{ margin: "0 0 20px", fontSize: 13, color: textMuted }}>Create your first team to get started</p>
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => setShowModal(true)}
              style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "10px 20px", borderRadius: 10, border: "none", background: accentMain, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
              <Plus size={14} /> Create Team
            </motion.button>
          </div>
        ) : (
          <TeamTable teams={teams} onRefresh={fetchTeams} isDark={isDark} />
        )}

        {showModal && <CreateTeamModal onClose={() => setShowModal(false)} onSave={addTeam} isDark={isDark} />}
      </div>
    </>
  );
}