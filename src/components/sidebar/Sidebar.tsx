//@ts-nocheck

import { motion, AnimatePresence } from "framer-motion";
import { useSidebar } from "./SidebarContext";
import SidebarItem from "./SidebarItem";
import logo from "@/assets/logo.png";
import { navItems } from "./navItems";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./sidebar.css";
import { useCall } from "../../context/CallContext";
import { useTeamChatUnread } from "../../hooks/useTeamChatUnread";
import api from "../../api";

export default function Sidebar() {
  const { collapsed, setCollapsed, isMobile, hoverEnabled } = useSidebar();
  const [dispositions, setDispositions] = useState([]);
  const { user, logout } = useAuth();
  const { missedCount, messageCount } = useCall();
  const teamChatUnread = useTeamChatUnread();
  const navigate = useNavigate();
  const [showLogout, setShowLogout] = useState(false);

  const width = collapsed ? 72 : 260;

  const canShow = (item) => {
    // Dynamic data-driven check (e.g. Team Dashboard needs an actual
    // supervised team) — takes priority over privilege, since no
    // privilege should be able to show a page the user can't use anyway.
    if (item.visibleIf) return !!item.visibleIf(user);

    if (user.role === "ADMIN") return item.roles?.includes("ADMIN");
    if (user.role === "AGENT") {
      if (item.roles?.includes("ADMIN") && !item.roles?.includes("AGENT")) {
        if (!item.privilege) return false;
      }
      if (item.privilege) return !!user.additionalRole?.[item.privilege];
      if (item.children)   return item.children.some(canShow);
      return true;
    }
    return false;
  };

  useEffect(() => {
    const fetchDispositions = async () => {
      try {
        const res = await api.get("/voice/dispositions/all");
        setDispositions(res.data || []);
      } catch { console.error("Failed to load dispositions"); }
    };
    fetchDispositions();
  }, []);

  const createSlug = (text: string) =>
    text.toLowerCase().trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");

  const sidebar = (
    <motion.aside
      className="myaio-sidebar"
      animate={{ width }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      onMouseEnter={() => hoverEnabled && !isMobile && setCollapsed(false)}
      onMouseLeave={() => hoverEnabled && !isMobile && setCollapsed(true)}
    >
      <div className="sidebar-logo">
        <img src={logo} width={36} />
        {!collapsed && <span className="logo-text">Ringnex (Beta)</span>}
      </div>

      <nav className="sidebar-nav scrollable">
        {navItems
          .map(item => {
            if (item.label === "Leads Management" && user.role === "AGENT" && user?.additionalRole?.viewLeads) {
              const sorted = [...dispositions].sort((a, b) => a.sequence - b.sequence);
              return {
                ...item,
                children: [
                  { to: "/leads", label: "All Leads" },
                  ...sorted.map(d => ({
                    to: `/lead/${createSlug(d.name)}`,
                    label: d.name,
                    color: d.color,
                    slug: createSlug(d.name),
                  })),
                ],
              };
            }
            return item;
          })
          .filter(canShow)
          .map(item => (
            <SidebarItem
              key={item.label}
              item={item}
              collapsed={collapsed}
              missedCount={missedCount}
              messageCount={messageCount}
              teamChatUnread={teamChatUnread}
            />
          ))}
      </nav>

      <div className="sidebar-footer">
        <button className="sidebar-link logout" onClick={() => setShowLogout(true)}>
          <LogOut className="icon" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </motion.aside>
  );

  if (isMobile) {
    return (
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            className="sidebar-backdrop"
            onClick={() => setCollapsed(true)}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            {sidebar}
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  return (
    <>
      {sidebar}
      <LogoutModal
        open={showLogout}
        user={user}
        onCancel={() => setShowLogout(false)}
        onConfirm={async () => {
          await logout(navigate);
          setShowLogout(false);
        }}
      />
    </>
  );
}

/* ══════════════════════════════════════════════════════
   SpinnerIcon — lightweight, no extra deps
   ══════════════════════════════════════════════════════ */
function SpinnerIcon() {
  return (
    <>
      <style>{`@keyframes _aio_spin { to { transform: rotate(360deg) } }`}</style>
      <svg
        width={14}
        height={14}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.8}
        strokeLinecap="round"
        style={{ animation: "_aio_spin 0.7s linear infinite", flexShrink: 0 }}
      >
        <path d="M12 2a10 10 0 0 1 10 10" />
      </svg>
    </>
  );
}

/* ══════════════════════════════════════════════════════
   LogoutModal — dark mode aware + logout loading state
   ══════════════════════════════════════════════════════ */
function LogoutModal({ open, user, onCancel, onConfirm }: {
  open: boolean; user: any; onCancel: () => void; onConfirm: () => Promise<void>;
}) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [hovCancel, setHovCancel]   = useState(false);
  const [hovConfirm, setHovConfirm] = useState(false);
  const [loading, setLoading]       = useState(false);

  // Reset loading state whenever modal closes
  useEffect(() => {
    if (!open) setLoading(false);
  }, [open]);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
    } catch {
      // If logout throws for some reason, unblock the UI
      setLoading(false);
    }
  };

  // Escape key — disabled while logging out
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) onCancel();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onCancel, loading]);

  // ── Design tokens ──
  const overlayBg    = isDark ? "rgba(0,0,0,0.70)"              : "rgba(0,0,0,0.40)";
  const cardBg       = isDark ? "rgba(20,20,28,0.98)"           : "#fff";
  const cardShadow   = isDark
    ? "0 24px 64px rgba(0,0,0,0.70), 0 0 0 1px rgba(255,255,255,0.06)"
    : "0 24px 64px rgba(0,0,0,0.16), 0 0 0 1px rgba(0,0,0,0.05)";
  const titleColor   = isDark ? "#F0F0F5"                       : "#0D0D12";
  const subColor     = isDark ? "#A0A0B0"                       : "#9E9EAD";
  const iconRingBg   = isDark ? "rgba(239,68,68,0.15)"          : "rgba(239,68,68,0.08)";
  const iconRingBord = isDark ? "rgba(239,68,68,0.30)"          : "rgba(239,68,68,0.18)";
  const pillBg       = isDark ? "rgba(255,255,255,0.07)"        : "#F6F7F9";
  const pillBord     = isDark ? "rgba(255,255,255,0.10)"        : "rgba(0,0,0,0.07)";
  const pillNameClr  = isDark ? "#C0C0D0"                       : "#4B4B5A";
  const avatarBg     = isDark
    ? "linear-gradient(135deg,rgba(91,91,214,0.30),rgba(91,91,214,0.18))"
    : "linear-gradient(135deg,#EDEDFB,#D8D8F7)";
  const avatarBord   = isDark ? "rgba(124,124,240,0.35)"        : "rgba(91,91,214,0.20)";
  const avatarColor  = isDark ? "#A5B4FC"                       : "#5B5BD6";
  const cancelBg     = hovCancel
    ? (isDark ? "rgba(255,255,255,0.10)" : "#F0F1F3")
    : (isDark ? "rgba(255,255,255,0.06)" : "#F6F7F9");
  const cancelBord   = isDark ? "rgba(255,255,255,0.10)"        : "rgba(0,0,0,0.10)";
  const cancelColor  = isDark ? "#C0C0D0"                       : "#4B4B5A";
  const footerBg     = isDark ? "rgba(255,255,255,0.02)"        : "transparent";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="logout-backdrop"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={loading ? undefined : onCancel}
          style={{
            position: "fixed", inset: 0, background: overlayBg,
            backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 99999, padding: 16,
            cursor: loading ? "default" : "auto",
          }}
        >
          <motion.div
            key="logout-card"
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 16 }}
            transition={{ type: "spring", stiffness: 300, damping: 26 }}
            onClick={e => e.stopPropagation()}
            style={{
              background: cardBg,
              backdropFilter: isDark ? "blur(24px) saturate(180%)" : "none",
              WebkitBackdropFilter: isDark ? "blur(24px) saturate(180%)" : "none",
              borderRadius: 22, width: "100%", maxWidth: 380,
              boxShadow: cardShadow, overflow: "hidden",
              fontFamily: "'Inter', -apple-system, sans-serif",
              border: isDark ? "1px solid rgba(255,255,255,0.08)" : "none",
            }}
          >
            {/* Top gradient bar */}
            <div style={{ height: 4, background: "linear-gradient(90deg,#5B5BD6,#EF4444)" }} />

            {/* Body */}
            <div style={{ padding: "28px 28px 24px", textAlign: "center" }}>

              {/* Icon ring */}
              <div style={{
                width: 60, height: 60, borderRadius: "50%",
                background: iconRingBg, border: `1.5px solid ${iconRingBord}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 16px",
              }}>
                <LogOut size={24} color="#EF4444" />
              </div>

              {/* Title */}
              <div style={{ fontSize: 17, fontWeight: 700, color: titleColor, marginBottom: 8 }}>
                Log out?
              </div>

              {/* User pill */}
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                background: pillBg, border: `1px solid ${pillBord}`,
                borderRadius: 9999, padding: "5px 14px 5px 8px", marginBottom: 12,
              }}>
                <div style={{
                  width: 26, height: 26, borderRadius: "50%",
                  background: avatarBg, border: `1.5px solid ${avatarBord}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 700, color: avatarColor,
                }}>
                  {(user?.name?.[0] || user?.email?.[0] || "?").toUpperCase()}
                </div>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: pillNameClr }}>
                  {user?.name || user?.email || "Your account"}
                </span>
              </div>

              {/* Subtitle */}
              <p style={{ fontSize: 13, color: subColor, lineHeight: 1.55, margin: 0 }}>
                You'll be signed out of your current session.<br />You can log back in anytime.
              </p>
            </div>

            {/* Footer buttons */}
            <div style={{
              display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10,
              padding: "0 24px 24px", background: footerBg,
            }}>
              <button
                onClick={onCancel}
                onMouseEnter={() => setHovCancel(true)}
                onMouseLeave={() => setHovCancel(false)}
                disabled={loading}
                style={{
                  padding: "11px 0", borderRadius: 12,
                  border: `1px solid ${cancelBord}`,
                  background: cancelBg, color: cancelColor,
                  fontSize: 13.5, fontWeight: 600,
                  cursor: loading ? "not-allowed" : "pointer",
                  fontFamily: "inherit", transition: "all 0.12s",
                  opacity: loading ? 0.45 : 1,
                }}
              >
                Cancel
              </button>

              <motion.button
                whileTap={loading ? {} : { scale: 0.96 }}
                onClick={handleConfirm}
                onMouseEnter={() => setHovConfirm(true)}
                onMouseLeave={() => setHovConfirm(false)}
                disabled={loading}
                style={{
                  padding: "11px 0", borderRadius: 12, border: "none",
                  background: hovConfirm && !loading ? "#C8201A" : "#EF4444",
                  color: "#fff", fontSize: 13.5, fontWeight: 600,
                  cursor: loading ? "not-allowed" : "pointer",
                  fontFamily: "inherit",
                  boxShadow: hovConfirm && !loading
                    ? "0 6px 18px rgba(239,68,68,0.50)"
                    : "0 4px 14px rgba(239,68,68,0.35)",
                  transition: "all 0.12s",
                  display: "flex", alignItems: "center",
                  justifyContent: "center", gap: 7,
                  opacity: loading ? 0.85 : 1,
                }}
              >
                {loading ? (
                  <>
                    <SpinnerIcon />
                    Logging out…
                  </>
                ) : (
                  <>
                    <LogOut size={14} /> Log out
                  </>
                )}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}