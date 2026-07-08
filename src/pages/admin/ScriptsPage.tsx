// @ts-nocheck
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, FileText, Edit2, Trash2, Users, ToggleLeft, ToggleRight, Search } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import api from "../../api";
import toast from "react-hot-toast";

export default function ScriptsPage() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isDark = theme === "dark";

  const [scripts, setScripts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleting, setDeleting] = useState<number | null>(null);

  // tokens
  const bg        = isDark ? "#0F0F14" : "#F6F7F9";
  const card      = isDark ? "rgba(23,23,31,0.95)" : "#fff";
  const cardBord  = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)";
  const text      = isDark ? "#F0F0F5" : "#0D0D12";
  const muted     = isDark ? "#68687A" : "#9E9EAD";
  const accent    = isDark ? "#7C7CF0" : "#5B5BD6";
  const accentBg  = isDark ? "rgba(124,124,240,0.12)" : "rgba(91,91,214,0.08)";
  const inputBg   = isDark ? "rgba(30,30,40,0.9)" : "#F6F7F9";
  const inputBord = isDark ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.10)";
  const rowHov    = isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)";

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("/voice/scripts");
      setScripts(res.data.data || []);
    } catch { toast.error("Failed to load scripts"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const toggleActive = async (s: any) => {
    try {
      await api.put(`/voice/scripts/${s.id}`, { isActive: !s.isActive });
      setScripts(prev => prev.map(x => x.id === s.id ? { ...x, isActive: !x.isActive } : x));
    } catch { toast.error("Failed to update script"); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this script? This cannot be undone.")) return;
    setDeleting(id);
    try {
      await api.delete(`/voice/scripts/${id}`);
      setScripts(prev => prev.filter(s => s.id !== id));
      toast.success("Script deleted");
    } catch { toast.error("Failed to delete"); }
    finally { setDeleting(null); }
  };

  const filtered = scripts.filter(s =>
    s.title.toLowerCase().includes(search.toLowerCase()) ||
    (s.description || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ minHeight: "100vh", background: bg, padding: "28px 24px", fontFamily: "'Inter',-apple-system,sans-serif" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: text, letterSpacing: "-0.02em" }}>
            Call Scripts
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: muted }}>
            Create and manage scripts shown to agents during calls
          </p>
        </div>
        <button
          onClick={() => navigate("/admin/scripts/new")}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "10px 18px", borderRadius: 10, border: "none",
            background: `linear-gradient(135deg, ${accent} 0%, #7C3AED 100%)`,
            color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer",
            boxShadow: "0 4px 14px rgba(91,91,214,0.30)", fontFamily: "inherit",
          }}
        >
          <Plus size={16} /> New Script
        </button>
      </div>

      {/* Search */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        background: inputBg, border: `1px solid ${inputBord}`,
        borderRadius: 10, padding: "9px 14px", marginBottom: 20, maxWidth: 380,
      }}>
        <Search size={15} color={muted} />
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search scripts…"
          style={{ flex: 1, border: "none", background: "transparent", fontSize: 13, color: text, outline: "none", fontFamily: "inherit" }}
        />
      </div>

      {/* Table card */}
      <div style={{ background: card, border: `1px solid ${cardBord}`, borderRadius: 16, overflow: "hidden", boxShadow: isDark ? "0 4px 24px rgba(0,0,0,0.28)" : "0 4px 24px rgba(0,0,0,0.07)" }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: muted, fontSize: 13 }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 60, textAlign: "center" }}>
            <FileText size={36} color={muted} style={{ marginBottom: 12 }} />
            <p style={{ margin: 0, color: muted, fontSize: 13 }}>
              {search ? "No matching scripts" : "No scripts yet — create your first one!"}
            </p>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: isDark ? "rgba(255,255,255,0.03)" : "#F9FAFB" }}>
                {["Script", "Assigned Agents", "Status", "Created", "Actions"].map(h => (
                  <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: muted, textTransform: "uppercase", letterSpacing: "0.07em", borderBottom: `1px solid ${cardBord}` }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, i) => (
                <tr key={s.id} style={{ borderBottom: i < filtered.length - 1 ? `1px solid ${cardBord}` : "none", transition: "background 0.12s" }}
                  onMouseEnter={e => e.currentTarget.style.background = rowHov}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  <td style={{ padding: "14px 16px" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: text }}>{s.title}</div>
                    {s.description && <div style={{ fontSize: 11.5, color: muted, marginTop: 2 }}>{s.description}</div>}
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <Users size={13} color={muted} />
                      <span style={{ fontSize: 12, color: muted, fontWeight: 600 }}>
                        {s._count?.assignments ?? s.assignments?.length ?? 0} agents
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    <button
                      onClick={() => toggleActive(s)}
                      style={{
                        display: "flex", alignItems: "center", gap: 6,
                        padding: "4px 10px", borderRadius: 20, border: "none", cursor: "pointer",
                        background: s.isActive ? (isDark ? "rgba(34,197,94,0.15)" : "#DCFCE7") : (isDark ? "rgba(100,100,120,0.15)" : "#F3F4F6"),
                        color: s.isActive ? (isDark ? "#4ADE80" : "#15803D") : muted,
                        fontSize: 11, fontWeight: 700, fontFamily: "inherit",
                      }}
                    >
                      {s.isActive ? <ToggleRight size={13} /> : <ToggleLeft size={13} />}
                      {s.isActive ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td style={{ padding: "14px 16px", fontSize: 12, color: muted }}>
                    {new Date(s.createdAt).toLocaleDateString()}
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={() => navigate(`/admin/scripts/${s.id}`)}
                        style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${isDark ? "rgba(124,124,240,0.30)" : "rgba(91,91,214,0.25)"}`, background: accentBg, color: accent, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => handleDelete(s.id)}
                        disabled={deleting === s.id}
                        style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${isDark ? "rgba(239,68,68,0.28)" : "rgba(239,68,68,0.20)"}`, background: isDark ? "rgba(239,68,68,0.12)" : "#FEF2F2", color: "#EF4444", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
