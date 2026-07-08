// src/components/teams/TeamAgentsTab.tsx
//@ts-nocheck
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Trash2, Plus, X, Users } from "lucide-react";
import api from "../../api";
import { toast } from "react-hot-toast";
import { useTheme } from "../../context/ThemeContext";
import Select from "react-select";

/* ─── status badge colours ───────────────────────────── */
const statusStyle = (status: string, isDark: boolean) => {
  if (status === "AVAILABLE")
    return { bg: isDark ? "rgba(16,185,129,0.15)" : "rgba(16,185,129,0.10)", text: "#059669" };
  if (status === "BUSY" || status === "ON_CALL")
    return { bg: isDark ? "rgba(245,158,11,0.15)" : "rgba(245,158,11,0.10)", text: "#D97706" };
  return { bg: isDark ? "rgba(107,107,123,0.15)" : "rgba(107,107,123,0.10)", text: "#6B6B7B" };
};

/* ─── avatar colour from name ───────────────────────── */
const palette = ["#5B5BD6","#7C3AED","#0EA5E9","#10B981","#F59E0B","#EF4444"];
const avatarColor = (name: string) => palette[(name?.charCodeAt(0) ?? 0) % palette.length];

/* ─── Add Agent Modal ────────────────────────────────── */
function AddAgentModal({ allAgents, onClose, onAdd }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const textPrimary  = isDark ? "#F0F0F5"                    : "#0D0D12";
  const textMuted    = isDark ? "#68687A"                    : "#6B6B7B";
  const accentMain   = isDark ? "#7C7CF0"                    : "#5B5BD6";
  const cardBg       = isDark ? "rgba(20,20,28,0.98)"        : "rgba(255,255,255,0.97)";
  const cardBorder   = isDark ? "rgba(255,255,255,0.08)"     : "rgba(255,255,255,0.70)";
  const inputBg      = isDark ? "rgba(30,30,42,0.90)"        : "#F6F7F9";
  const inputBorder  = isDark ? "rgba(255,255,255,0.09)"     : "rgba(0,0,0,0.10)";
  const menuBg       = isDark ? "#1A1A2E"                    : "#fff";
  const optionHover  = isDark ? "rgba(124,124,240,0.12)"     : "rgba(91,91,214,0.07)";
  const optionActive = isDark ? "#7C7CF0"                    : "#5B5BD6";

  const [selected, setSelected] = useState<any>(null);

  // Transform agents into react-select option shape
  const options = allAgents.map((a) => ({
    value: a.id,
    label: a.name,
    sublabel: a.email,
    agent: a,
  }));

  // Custom option with avatar + email subtitle
  const formatOptionLabel = ({ label, sublabel }: any) => {
    const color = avatarColor(label || "");
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 30, height: 30, borderRadius: 8,
          background: `${color}20`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 12, fontWeight: 800, color, flexShrink: 0,
        }}>
          {(label || "?").charAt(0).toUpperCase()}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: textPrimary, lineHeight: 1.3 }}>
            {label}
          </div>
          <div style={{ fontSize: 11.5, color: textMuted, lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {sublabel}
          </div>
        </div>
      </div>
    );
  };

  // react-select style overrides — fully theme-aware
  const selectStyles = {
    control: (base: any, state: any) => ({
      ...base,
      background: inputBg,
      border: `1px solid ${state.isFocused ? accentMain : inputBorder}`,
      borderRadius: 10,
      boxShadow: state.isFocused
        ? `0 0 0 3px ${isDark ? "rgba(124,124,240,0.18)" : "rgba(91,91,214,0.14)"}`
        : "none",
      minHeight: 44,
      cursor: "text",
      "&:hover": { borderColor: accentMain },
    }),
    valueContainer: (base: any) => ({ ...base, padding: "4px 12px" }),
    input: (base: any) => ({ ...base, color: textPrimary, fontSize: 13.5 }),
    placeholder: (base: any) => ({ ...base, color: isDark ? "#44445A" : "#BBBBC8", fontSize: 13.5 }),
    singleValue: (base: any) => ({ ...base, color: textPrimary }),
    menu: (base: any) => ({
      ...base,
      background: menuBg,
      border: `1px solid ${inputBorder}`,
      borderRadius: 12,
      boxShadow: isDark
        ? "0 16px 40px rgba(0,0,0,0.55)"
        : "0 16px 40px rgba(0,0,0,0.14)",
      zIndex: 9999,
      overflow: "hidden",
    }),
    menuList: (base: any) => ({ ...base, padding: 6 }),
    option: (base: any, state: any) => ({
      ...base,
      background: state.isSelected
        ? optionActive
        : state.isFocused
          ? optionHover
          : "transparent",
      color: state.isSelected ? "#fff" : textPrimary,
      borderRadius: 8,
      padding: "7px 10px",
      cursor: "pointer",
      fontSize: 13,
    }),
    noOptionsMessage: (base: any) => ({ ...base, color: textMuted, fontSize: 13 }),
    indicatorSeparator: () => ({ display: "none" }),
    dropdownIndicator: (base: any) => ({ ...base, color: isDark ? "#44445A" : "#BBBBC8" }),
    clearIndicator: (base: any) => ({ ...base, color: isDark ? "#44445A" : "#BBBBC8", cursor: "pointer" }),
  };

  return (
    <AnimatePresence>
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 9000,
          background: isDark ? "rgba(0,0,0,0.75)" : "rgba(13,13,18,0.45)",
          backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
        }}
      >
        <motion.div
          key="modal"
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            width: "100%", maxWidth: 420,
            background: cardBg,
            backdropFilter: "blur(24px) saturate(180%)",
            WebkitBackdropFilter: "blur(24px) saturate(180%)",
            borderRadius: 20, border: `1px solid ${cardBorder}`,
            boxShadow: isDark ? "0 24px 64px rgba(0,0,0,0.55)" : "0 24px 64px rgba(0,0,0,0.18)",
            fontFamily: "'Inter', -apple-system, sans-serif",
            color: textPrimary,
          }}
        >
          {/* Header */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "18px 22px 16px",
            borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)"}`,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 9,
                background: isDark ? "rgba(124,124,240,0.15)" : "rgba(91,91,214,0.12)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Plus size={15} color={accentMain} />
              </div>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>Add Agent to Team</p>
            </div>
            <motion.button
              whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
              onClick={onClose}
              style={{
                width: 28, height: 28, borderRadius: 7, border: "none",
                background: isDark ? "rgba(30,30,42,0.90)" : "#F0F0F5",
                display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
              }}
            >
              <X size={13} color={textMuted} />
            </motion.button>
          </div>

          {/* Body */}
          <div style={{ padding: "18px 22px" }}>
            <label style={{
              display: "block", fontSize: 11.5, fontWeight: 700,
              color: textMuted, marginBottom: 6,
              letterSpacing: "0.04em", textTransform: "uppercase",
            }}>
              Select Agent
            </label>
            <Select
              options={options}
              value={selected ? options.find((o) => o.value === selected.id) ?? null : null}
              onChange={(opt) => setSelected(opt ? opt.agent : null)}
              formatOptionLabel={formatOptionLabel}
              placeholder="Search by name or email…"
              isClearable
              styles={selectStyles}
              menuPortalTarget={document.body}
              menuPosition="fixed"
              noOptionsMessage={() => "No agents found"}
            />
          </div>

          {/* Footer */}
          <div style={{
            display: "flex", justifyContent: "flex-end", gap: 8,
            padding: "14px 22px 18px",
            borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)"}`,
          }}>
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              onClick={onClose}
              style={{
                padding: "9px 18px", borderRadius: 9,
                border: `1px solid ${inputBorder}`,
                background: inputBg, color: textMuted,
                fontWeight: 700, fontSize: 13, cursor: "pointer",
              }}
            >
              Cancel
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              onClick={() => selected && onAdd(selected)}
              disabled={!selected}
              style={{
                padding: "9px 20px", borderRadius: 9, border: "none",
                background: selected ? accentMain : "#BBBBC8",
                color: "#fff", fontWeight: 700, fontSize: 13,
                cursor: selected ? "pointer" : "not-allowed",
                boxShadow: selected
                  ? (isDark ? "0 2px 10px rgba(124,124,240,0.35)" : "0 2px 10px rgba(91,91,214,0.26)")
                  : "none",
              }}
            >
              Add to Team
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ─── Main Component ─────────────────────────────────── */
export default function TeamAgentsTab({ team }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const textPrimary = isDark ? "#F0F0F5"                : "#0D0D12";
  const textMuted   = isDark ? "#68687A"                : "#9E9EAD";
  const accentMain  = isDark ? "#7C7CF0"                : "#5B5BD6";
  const cardBg      = isDark ? "rgba(20,20,28,0.98)"    : "#FFFFFF";
  const cardBorder  = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)";
  const inputBg     = isDark ? "rgba(30,30,42,0.90)"    : "#F6F7F9";

  const [agents,       setAgents]       = useState([]);
  const [allAgents,    setAllAgents]    = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [removingId,   setRemovingId]   = useState<any>(null);
  const [hoveredRow,   setHoveredRow]   = useState<any>(null);

  const fetchTeamAgents = async () => {
    if (!team?.id) return;
    try {
      setLoading(true);
      const res = await api.get(`/voice/team/${team.id}`);
      if (res.data.success) {
        const members = res.data.data.members || [];
        setAgents(members.map((m) => ({ ...m.user, roleInTeam: m.roleInTeam, addedAt: m.addedAt })));
      }
    } catch {
      toast.error("Could not load agents");
    } finally {
      setLoading(false);
    }
  };

  const fetchAllAgents = async () => {
    try {
      const res = await api.get("/auth/all");
      const users = res.data || [];
      const filtered = users.filter((u) => u.id !== team.supervisorId);
      const assignedIds = new Set(agents.map((a) => a.id));
      setAllAgents(filtered.filter((u) => !assignedIds.has(u.id)));
    } catch {
      toast.error("Failed to load available agents");
    }
  };

  useEffect(() => { fetchTeamAgents(); }, [team?.id]);

  const handleOpenAddModal = () => {
    fetchAllAgents();
    setAddModalOpen(true);
  };

  const handleAddAgent = async (agent) => {
    setAgents((prev) => [...prev, agent]);
    setAddModalOpen(false);
    try {
      await api.patch(`/voice/team/${team.id}/assign-agent`, { agentId: agent.id });
      toast.success(`${agent.name} added to team`);
      fetchTeamAgents();
    } catch {
      toast.error("Failed to add agent");
      setAgents((prev) => prev.filter((a) => a.id !== agent.id));
    }
  };

  const handleRemoveAgent = async (agentId, agentName) => {
    if (!window.confirm(`Remove ${agentName} from this team?`)) return;
    setRemovingId(agentId);
    setAgents((prev) => prev.filter((a) => a.id !== agentId));
    try {
      await api.patch(`/voice/team/${team.id}/remove-agent`, { agentId });
      toast.success(`${agentName} removed from team`);
      fetchTeamAgents();
    } catch {
      toast.error("Failed to remove agent");
      fetchTeamAgents();
    } finally {
      setRemovingId(null);
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 0" }}>
        <div style={{
          width: 32, height: 32, borderRadius: "50%",
          border: `3px solid ${isDark ? "rgba(124,124,240,0.15)" : "rgba(91,91,214,0.15)"}`,
          borderTopColor: accentMain,
          animation: "spin 0.7s linear infinite",
        }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, color: textPrimary }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{
          fontSize: 11.5, fontWeight: 800, color: textMuted,
          letterSpacing: "0.07em", textTransform: "uppercase",
          display: "flex", alignItems: "center", gap: 7,
        }}>
          <Users size={12} /> Team Agents
          <span style={{
            marginLeft: 4, padding: "2px 8px", borderRadius: 6,
            background: isDark ? "rgba(124,124,240,0.15)" : "rgba(91,91,214,0.10)",
            color: accentMain, fontSize: 11, fontWeight: 800,
          }}>
            {agents.length}
          </span>
        </div>
        <motion.button
          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          onClick={handleOpenAddModal}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "8px 16px", borderRadius: 9, border: "none",
            background: accentMain, color: "#fff",
            fontWeight: 700, fontSize: 12.5, cursor: "pointer",
            boxShadow: isDark ? "0 2px 10px rgba(124,124,240,0.35)" : "0 2px 10px rgba(91,91,214,0.26)",
          }}
        >
          <Plus size={13} /> Add Agent
        </motion.button>
      </div>

      {/* Empty State */}
      {agents.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "48px 24px", borderRadius: 14,
          background: isDark ? "rgba(30,30,42,0.80)" : "#FAFAFC",
          border: `1px dashed ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.10)"}`,
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            background: isDark ? "rgba(124,124,240,0.12)" : "rgba(91,91,214,0.08)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 12px",
          }}>
            <Users size={22} color={accentMain} />
          </div>
          <p style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 700 }}>No agents assigned</p>
          <p style={{ margin: "0 0 16px", fontSize: 13, color: textMuted }}>
            Add agents to this team to get started
          </p>
          <motion.button
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={handleOpenAddModal}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "8px 16px", borderRadius: 9, border: "none",
              background: accentMain, color: "#fff",
              fontWeight: 700, fontSize: 12.5, cursor: "pointer",
            }}
          >
            <Plus size={13} /> Add Agent
          </motion.button>
        </div>
      ) : (
        /* Table */
        <div style={{
          borderRadius: 14, border: `1px solid ${cardBorder}`,
          overflow: "hidden", background: cardBg,
        }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Agent", "Email", "Status", ""].map((h, i) => (
                  <th key={i} style={{
                    padding: "10px 16px", fontSize: 11, fontWeight: 800,
                    color: textMuted, textTransform: "uppercase", letterSpacing: "0.06em",
                    textAlign: i === 2 ? "center" : i === 3 ? "right" : "left",
                    background: isDark ? "rgba(30,30,42,0.80)" : "#FAFAFC",
                    borderBottom: `1px solid ${cardBorder}`,
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {agents.map((agent) => {
                const sc    = statusStyle(agent.status, isDark);
                const color = avatarColor(agent.name || "");
                return (
                  <tr
                    key={agent.id}
                    style={{
                      background: hoveredRow === agent.id
                        ? (isDark ? "rgba(124,124,240,0.08)" : "rgba(91,91,214,0.025)")
                        : "transparent",
                      transition: "background 0.12s",
                    }}
                    onMouseEnter={() => setHoveredRow(agent.id)}
                    onMouseLeave={() => setHoveredRow(null)}
                  >
                    <td style={{ padding: "12px 16px", borderBottom: `1px solid ${cardBorder}` }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: 9,
                          background: `${color}18`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          flexShrink: 0, fontSize: 12, fontWeight: 800, color,
                        }}>
                          {(agent.name || "?").charAt(0).toUpperCase()}
                        </div>
                        <span style={{ fontWeight: 600, fontSize: 13.5, color: textPrimary }}>
                          {agent.name}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: "12px 16px", borderBottom: `1px solid ${cardBorder}`, color: textMuted }}>
                      {agent.email}
                    </td>
                    <td style={{ padding: "12px 16px", borderBottom: `1px solid ${cardBorder}`, textAlign: "center" }}>
                      <span style={{
                        display: "inline-block", padding: "3px 10px", borderRadius: 6,
                        background: sc.bg, color: sc.text,
                        fontWeight: 700, fontSize: 11.5,
                        textTransform: "uppercase", letterSpacing: "0.04em",
                      }}>
                        {agent.status || "Unknown"}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px", borderBottom: `1px solid ${cardBorder}`, textAlign: "right" }}>
                      <motion.button
                        whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
                        onClick={() => handleRemoveAgent(agent.id, agent.name)}
                        disabled={removingId === agent.id}
                        style={{
                          width: 30, height: 30, borderRadius: 8, border: "none",
                          background: isDark ? "rgba(229,83,75,0.15)" : "rgba(229,83,75,0.08)",
                          display: "inline-flex", alignItems: "center", justifyContent: "center",
                          cursor: removingId === agent.id ? "not-allowed" : "pointer",
                          opacity: removingId === agent.id ? 0.5 : 1,
                        }}
                      >
                        <Trash2 size={13} color="#E5534B" />
                      </motion.button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {addModalOpen && (
        <AddAgentModal
          allAgents={allAgents}
          onClose={() => setAddModalOpen(false)}
          onAdd={handleAddAgent}
        />
      )}
    </div>
  );
}