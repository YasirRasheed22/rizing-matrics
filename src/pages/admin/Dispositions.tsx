// pages/admin/Dispositions.tsx
// @ts-nocheck
import React, { useEffect, useState, useMemo } from "react";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { Plus, Search, Tag, X, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import api from "../../api";
import toast, { Toaster } from "react-hot-toast";

/* ─── add modal ──────────────────────────────────────── */
function AddModal({ open, onClose, onSubmit, isDark }: any) {
  const [name, setName]   = useState("");
  const [color, setColor] = useState("#5B5BD6");

  /* tokens passed via props */
  const cardBg       = isDark ? "rgba(23,23,31,0.95)"        : "rgba(255,255,255,0.92)";
  const cardBorder   = isDark ? "rgba(255,255,255,0.07)"     : "rgba(255,255,255,0.60)";
  const cardShadow   = isDark ? "0 4px 24px rgba(0,0,0,0.30), 0 0 0 1px rgba(255,255,255,0.04)"
                              : "0 4px 24px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.04)";
  const textPrimary  = isDark ? "#F0F0F5"                    : "#0D0D12";
  const textSecondary= isDark ? "#A0A0B0"                    : "#6B6B7B";
  const textMuted    = isDark ? "#68687A"                    : "#9E9EAD";
  const accentMain   = isDark ? "#7C7CF0"                    : "#5B5BD6";
  const accentBg     = isDark ? "rgba(124,124,240,0.12)"     : "rgba(91,91,214,0.12)";
  const inputBg      = isDark ? "rgba(30,30,40,0.90)"        : "#F6F7F9";
  const inputBorder  = isDark ? "rgba(255,255,255,0.09)"     : "rgba(0,0,0,0.10)";
  const inputFocus   = isDark ? "rgba(124,124,240,0.45)"     : "rgba(91,91,214,0.40)";
  const closeBtnBg   = isDark ? "rgba(255,255,255,0.08)"     : "rgba(0,0,0,0.06)";
  const cancelBg     = isDark ? "rgba(30,30,40,0.90)"        : "#F6F7F9";
  const modalBackdrop= isDark ? "rgba(0,0,0,0.65)"           : "rgba(0,0,0,0.40)";

  const inputStyle: React.CSSProperties = {
    width: "100%", boxSizing: "border-box",
    padding: "9px 13px", borderRadius: 10,
    border: `1px solid ${inputBorder}`,
    background: inputBg, fontSize: 13,
    color: textPrimary, outline: "none", fontFamily: "inherit",
  };

  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: 11.5, fontWeight: 700,
    color: textMuted, marginBottom: 6, letterSpacing: "0.04em",
    textTransform: "uppercase",
  };

  const reset = () => { setName(""); setColor("#5B5BD6"); };

  const handleSubmit = (e: any) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({ name: name.trim(), color });
    reset();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          style={{ position: "fixed", inset: 0, zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <div
            onClick={() => { onClose(); reset(); }}
            style={{ position: "absolute", inset: 0, background: modalBackdrop, backdropFilter: "blur(4px)" }}
          />
          <motion.div
            initial={{ scale: 0.93, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.93, opacity: 0 }} transition={{ type: "spring", damping: 22, stiffness: 340 }}
            style={{
              background: cardBg,
              backdropFilter: "blur(24px) saturate(180%)",
              WebkitBackdropFilter: "blur(24px) saturate(180%)",
              borderRadius: 18,
              border: `1px solid ${cardBorder}`,
              boxShadow: cardShadow,
              position: "relative", zIndex: 1,
              width: "90%", maxWidth: 400, padding: 24,
            }}
          >
            {/* header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 9, background: accentBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Tag size={15} color={accentMain} />
                </div>
                <span style={{ fontSize: 15, fontWeight: 800, color: textPrimary }}>Add Disposition</span>
              </div>
              <button
                onClick={() => { onClose(); reset(); }}
                style={{ width: 28, height: 28, borderRadius: 8, border: "none", background: closeBtnBg, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <X size={13} color={textSecondary} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Name</label>
                <input
                  type="text" value={name} required
                  placeholder="e.g. Interested, Callback, DNC..."
                  onChange={(e) => setName(e.target.value)}
                  style={inputStyle}
                  onFocus={(e) => (e.target.style.borderColor = inputFocus)}
                  onBlur={(e)  => (e.target.style.borderColor = inputBorder)}
                />
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={labelStyle}>Color</label>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <input
                    type="color" value={color}
                    onChange={(e) => setColor(e.target.value)}
                    style={{ width: 48, height: 40, borderRadius: 8, border: `1px solid ${inputBorder}`, cursor: "pointer", padding: 3, background: inputBg }}
                  />
                  <div style={{ flex: 1, height: 40, borderRadius: 10, background: color, opacity: 0.85, border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}` }} />
                  <span style={{ fontSize: 12, fontFamily: "monospace", color: textSecondary, minWidth: 72 }}>{color}</span>
                </div>
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button type="button" onClick={() => { onClose(); reset(); }}
                  style={{ flex: 1, padding: "9px 0", borderRadius: 10, border: `1px solid ${inputBorder}`, background: cancelBg, color: textSecondary, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
                  Cancel
                </button>
                <motion.button type="submit" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  style={{ flex: 1, padding: "9px 0", borderRadius: 10, border: "none", background: accentMain, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontFamily: "inherit" }}>
                  <Check size={13} /> Add
                </motion.button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ─── toggle switch ──────────────────────────────────── */
function Toggle({ checked, onChange, accentMain }: { checked: boolean; onChange: () => void; accentMain: string }) {
  return (
    <div
      onClick={onChange}
      style={{
        width: 38, height: 22, borderRadius: 99, cursor: "pointer",
        background: checked ? accentMain : "rgba(0,0,0,0.12)",
        position: "relative", transition: "background 0.2s", flexShrink: 0,
      }}
    >
      <div style={{
        position: "absolute", top: 3,
        left: checked ? 19 : 3,
        width: 16, height: 16, borderRadius: "50%",
        background: "#fff", transition: "left 0.2s",
        boxShadow: "0 1px 4px rgba(0,0,0,0.18)",
      }} />
    </div>
  );
}

/* ─── main component ─────────────────────────────────── */
export default function Dispositions() {
  const { token, user } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  /* ── Design tokens ── */
  const pageBg        = isDark ? "#0F0F14"                        : "#F6F7F9";
  const cardBg        = isDark ? "rgba(23,23,31,0.95)"            : "rgba(255,255,255,0.92)";
  const cardBorder    = isDark ? "rgba(255,255,255,0.07)"         : "rgba(255,255,255,0.60)";
  const cardShadow    = isDark ? "0 4px 24px rgba(0,0,0,0.30), 0 0 0 1px rgba(255,255,255,0.04)"
                               : "0 4px 24px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.04)";
  const cardHoverShadow = isDark ? "0 8px 28px rgba(0,0,0,0.40)" : "0 8px 28px rgba(0,0,0,0.10)";
  const textPrimary   = isDark ? "#F0F0F5"                        : "#0D0D12";
  const textSecondary = isDark ? "#A0A0B0"                        : "#6B6B7B";
  const textMuted     = isDark ? "#68687A"                        : "#9E9EAD";
  const accentMain    = isDark ? "#7C7CF0"                        : "#5B5BD6";
  const accentBg      = isDark ? "rgba(124,124,240,0.12)"         : "rgba(91,91,214,0.12)";
  const accentBgSoft  = isDark ? "rgba(124,124,240,0.08)"         : "rgba(91,91,214,0.08)";
  const inputBg       = isDark ? "rgba(23,23,31,0.90)"            : "rgba(255,255,255,0.90)";
  const inputBorder   = isDark ? "rgba(255,255,255,0.09)"         : "rgba(0,0,0,0.09)";
  const inputFocus    = isDark ? "rgba(124,124,240,0.45)"         : "rgba(91,91,214,0.40)";
  const activeColor   = isDark ? "#34D399"                        : "#17A363";
  const swatchBorder  = isDark ? "rgba(255,255,255,0.08)"         : "rgba(0,0,0,0.08)";
  const monoColor     = isDark ? "#68687A"                        : "#9E9EAD";

  const card: React.CSSProperties = {
    background: cardBg,
    backdropFilter: "blur(24px) saturate(180%)",
    WebkitBackdropFilter: "blur(24px) saturate(180%)",
    borderRadius: 18,
    border: `1px solid ${cardBorder}`,
    boxShadow: cardShadow,
  };

  const [dispositions, setDispositions] = useState<any[]>([]);
  const [search, setSearch]     = useState("");
  const [openModal, setOpenModal] = useState(false);
  const [loading, setLoading]   = useState(true);

  const fetchDispositions = async () => {
    try {
      const res = await api.get("/dispositions", { headers: { Authorization: `Bearer ${token}` } });
      setDispositions(res.data);
    } catch (err: any) {
      console.error("Failed to fetch dispositions:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token && user?.role === "ADMIN") fetchDispositions();
  }, [token, user]);

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return dispositions.filter((d) => d.name?.toLowerCase().includes(s));
  }, [dispositions, search]);

  const handleAdd = async (data: any) => {
    try {
      await api.post("/dispositions", data, { headers: { Authorization: `Bearer ${token}` } });
      toast.success("Disposition added");
      fetchDispositions();
      setOpenModal(false);
    } catch {
      toast.error("Failed to add disposition");
    }
  };

  const handleToggle = async (id: string, currentActive: boolean) => {
    try {
      await api.patch(`/dispositions/${id}`, { active: !currentActive }, { headers: { Authorization: `Bearer ${token}` } });
      setDispositions((prev) => prev.map((d) => (d.id === id ? { ...d, active: !currentActive } : d)));
    } catch {
      toast.error("Failed to update status");
    }
  };

  if (!user.additionalRole?.accessDisposition) {
    return (
      <div style={{ padding: 40, textAlign: "center", fontFamily: "Inter, sans-serif" }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "#D0281A" }}>Access Denied</h2>
      </div>
    );
  }

  return (
    <>
      {/* <Toaster position="top-right" /> */}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      <div style={{ fontFamily: "'Inter', -apple-system, sans-serif", minHeight: "100vh", background: pageBg, transition: "background 0.2s" }}>

        {/* ── Page header ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: accentBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Tag size={20} color={accentMain} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: textPrimary, letterSpacing: "-0.4px" }}>
                Dispositions
              </h1>
              <p style={{ margin: 0, fontSize: 12.5, color: textMuted }}>
                {dispositions.length} disposition{dispositions.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={() => setOpenModal(true)}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "9px 18px", borderRadius: 10, border: "none",
              background: accentMain, color: "#fff", fontWeight: 700,
              fontSize: 13, cursor: "pointer", fontFamily: "inherit",
              boxShadow: isDark ? "0 1px 6px rgba(124,124,240,0.40)" : "0 1px 6px rgba(91,91,214,0.35)",
            }}
          >
            <Plus size={15} /> Add Disposition
          </motion.button>
        </div>

        {/* ── Search ── */}
        <div style={{ position: "relative", marginBottom: 20, maxWidth: 380 }}>
          <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: textMuted, pointerEvents: "none" }} />
          <input
            type="text" placeholder="Search dispositions..." value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%", boxSizing: "border-box",
              padding: "9px 13px 9px 34px", borderRadius: 10,
              border: `1px solid ${inputBorder}`,
              background: inputBg, fontSize: 13,
              color: textPrimary, outline: "none", fontFamily: "inherit",
            }}
            onFocus={(e) => (e.target.style.borderColor = inputFocus)}
            onBlur={(e)  => (e.target.style.borderColor = inputBorder)}
          />
        </div>

        {/* ── Content ── */}
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "80px 0", gap: 14 }}>
            <div style={{
              width: 36, height: 36, borderRadius: "50%",
              border: `3px solid ${isDark ? "rgba(124,124,240,0.15)" : "rgba(91,91,214,0.15)"}`,
              borderTopColor: accentMain,
              animation: "spin 0.7s linear infinite",
            }} />
          </div>

        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: accentBgSoft, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <Tag size={24} color={accentMain} />
            </div>
            <p style={{ fontSize: 15, fontWeight: 700, color: textPrimary, margin: "0 0 6px" }}>
              No dispositions found
            </p>
            <p style={{ fontSize: 13, color: textMuted, margin: 0 }}>
              {search ? "Try a different search" : "Add your first disposition to get started"}
            </p>
          </div>

        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
            <AnimatePresence>
              {filtered.map((disp: any, idx: number) => (
                <motion.div
                  key={disp.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  whileHover={{ y: -2, boxShadow: cardHoverShadow }}
                  style={{ ...card, padding: "14px 16px" }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      {/* Color swatch */}
                      <div style={{
                        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                        background: disp.color || accentMain,
                        opacity: 0.9,
                        boxShadow: `0 3px 8px ${disp.color || accentMain}44`,
                        border: `1px solid ${swatchBorder}`,
                      }} />
                      <div>
                        <div style={{ fontSize: 13.5, fontWeight: 700, color: textPrimary }}>{disp.name}</div>
                        <div style={{ fontSize: 11, fontFamily: "monospace", color: monoColor, marginTop: 1 }}>{disp.color}</div>
                      </div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                      <Toggle checked={!!disp.active} onChange={() => handleToggle(disp.id, disp.active)} accentMain={accentMain} />
                      <span style={{
                        fontSize: 9.5, fontWeight: 700,
                        color: disp.active ? activeColor : textMuted,
                        textTransform: "uppercase", letterSpacing: "0.04em",
                      }}>
                        {disp.active ? "Active" : "Off"}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <AddModal open={openModal} onClose={() => setOpenModal(false)} onSubmit={handleAdd} isDark={isDark} />
    </>
  );
}