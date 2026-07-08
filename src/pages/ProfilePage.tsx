// src/pages/ProfilePage.tsx
//@ts-nocheck
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Mail,
  Phone,
  Edit2,
  Save,
  Lock,
  Shield,
  ChevronDown,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import api from "../api";
import { useTheme } from "../context/ThemeContext";

type TabType = "personal" | "password" | "privileges";

const tabVariants = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
};

const sectionVariants = {
  hidden: { opacity: 0, scale: 0.98 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.28, ease: "easeOut" } },
};

const getInitials = (name: string) =>
  name
    ? name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "UN";

const AVATAR_COLORS = [
  { bg: "#EEF2FF", text: "#4F46E5" },
  { bg: "#F0FDF4", text: "#16A34A" },
  { bg: "#FFF7ED", text: "#EA580C" },
  { bg: "#FDF4FF", text: "#A21CAF" },
  { bg: "#EFF6FF", text: "#5B5BD6" },
  { bg: "#FFF1F2", text: "#E11D48" },
  { bg: "#F0FDFA", text: "#0D9488" },
];
const textSecondary = "#0D9488"

const getAvatarColor = (str: string) => {
  let hash = 0;
  for (let i = 0; i < (str || "").length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

export default function ProfilePage() {
  const { user, refetchUser } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // Theme Colors
  const textPrimary = isDark ? "#F0F0F5" : "#101828";
  const textMuted = isDark ? "#68687A" : "#667085";
  const cardBg = isDark ? "rgba(20,20,28,0.98)" : "#FFFFFF";
  const cardBorder = isDark ? "rgba(255,255,255,0.08)" : "#EAECF0";
  const bgPage = isDark ? "#0A0A0F" : "#F8F9FC";
  const accentMain = isDark ? "#7C7CF0" : "#5B5BD6";
  const successColor = isDark ? "#4ADE80" : "#16a34a";

  const [activeTab, setActiveTab] = useState<TabType>("personal");
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setEmail(user.email || "");
    }
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      await api.put(
        `/auth/update/${user.id}`,
        { name, email },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      toast.success("Profile updated!");
      setIsEditing(false);
      refetchUser?.();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Update failed");
    } finally {
      setSaving(false);
    }
  };

  const passwordsMatch = newPassword && confirmPassword && newPassword === confirmPassword;

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      toast.error("All fields are required");
      return;
    }
    if (!passwordsMatch) {
      toast.error("Passwords do not match");
      return;
    }

    setChangingPassword(true);
    try {
      await api.put(
        `/auth/change-password/${user?.id}`,
        { newPassword },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      toast.success("Password changed successfully!");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to change password");
    } finally {
      setChangingPassword(false);
    }
  };

  if (!user) return null;

  const initials = getInitials(name || user.name || "User");
  const avatar = getAvatarColor(name || user.name || "User");

  const isAdmin = user.role === "ADMIN";
  const canEditProfile = isAdmin || user.additionalRole?.editProfile === true;
  const canChangePassword = isAdmin || user.additionalRole?.changePassword === true;

  const safeTab = (activeTab === "password" && !canChangePassword) ? "personal" : activeTab;

  const tabs = [
    { key: "personal", label: "Personal", icon: User },
    ...(canChangePassword ? [{ key: "password", label: "Password", icon: Lock }] : []),
    { key: "privileges", label: "Privileges", icon: Shield },
  ];

  const privilegeEntries = user?.additionalRole
    ? Object.entries(user.additionalRole).filter(([, value]) => typeof value === "boolean" && value === true)
    : [];

  return (
    <div style={{ minHeight: "100vh", background: bgPage, fontFamily: "'Inter', -apple-system, sans-serif", color: textPrimary }}>
      {/* Header */}
      <div style={{ background: cardBg, borderBottom: `1px solid ${cardBorder}`, padding: "20px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: textPrimary, margin: 0, letterSpacing: "-0.02em" }}>My Profile</h1>
          <p style={{ color: textMuted, fontSize: 13, margin: "2px 0 0" }}>Manage your personal info, password and privileges</p>
        </div>

        {safeTab === "personal" && canEditProfile && (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {!isEditing ? (
              <button onClick={() => setIsEditing(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 8, cursor: "pointer", fontSize: 13, color: textSecondary, fontWeight: 500 }}>
                <Edit2 size={14} /> Edit Profile
              </button>
            ) : (
              <>
                <button onClick={() => { setIsEditing(false); setName(user.name || ""); setEmail(user.email || ""); }} style={{ padding: "8px 14px", background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 8, cursor: "pointer", fontSize: 13, color: textSecondary, fontWeight: 500 }}>
                  Cancel
                </button>
                <button onClick={handleSaveProfile} disabled={saving} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: saving ? "#94A3B8" : accentMain, border: "none", borderRadius: 8, cursor: saving ? "not-allowed" : "pointer", fontSize: 13, color: "#fff", fontWeight: 600 }}>
                  <Save size={14} /> {saving ? "Saving..." : "Save Changes"}
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ background: cardBg, borderBottom: `1px solid ${cardBorder}`, padding: "0 28px", display: "flex", gap: 0 }}>
        {tabs.map(({ key, label, icon: Icon }) => {
          const isActive = safeTab === key;
          return (
            <button
              key={key}
              onClick={() => setActiveTab(key as TabType)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                padding: "13px 16px",
                border: "none",
                background: "none",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: isActive ? 600 : 400,
                color: isActive ? accentMain : textMuted,
                borderBottom: isActive ? `2px solid ${accentMain}` : "2px solid transparent",
                transition: "all 0.15s",
                marginBottom: -1,
              }}
            >
              <Icon size={14} />
              {label}
            </button>
          );
        })}
      </div>

      {/* Content Area */}
      <div style={{ padding: "24px 28px", maxWidth: 1100, margin: "0 auto" }}>
        <AnimatePresence mode="wait">
          {/* Personal Tab */}
          {safeTab === "personal" && (
            <motion.div key="personal" variants={sectionVariants} initial="hidden" animate="visible" exit="hidden">
              <motion.div variants={tabVariants} initial="initial" animate="animate" exit="exit" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {/* Hero Card */}
                <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 16, padding: 24, display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
                  <div style={{ width: 72, height: 72, borderRadius: "50%", background: avatar.bg, color: avatar.text, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 700, flexShrink: 0 }}>
                    {initials}
                  </div>

                  <div style={{ flex: 1, minWidth: 220 }}>
                    <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: textPrimary, letterSpacing: "-0.02em" }}>
                      {user.name || "Unnamed User"}
                    </h2>
                    <p style={{ margin: "4px 0 0", fontSize: 14, color: textMuted }}>{user.email || "No email available"}</p>
                  </div>

                  <div>
                    <span style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "7px 12px",
                      borderRadius: 999,
                      fontSize: 13,
                      fontWeight: 600,
                      background: user.status === "AVAILABLE" ? (isDark ? "rgba(22,163,74,0.15)" : "#ECFDF3") : user.status === "BUSY" ? (isDark ? "rgba(234,88,12,0.15)" : "#FFF7ED") : "#F3F4F6",
                      color: user.status === "AVAILABLE" ? "#4ADE80" : user.status === "BUSY" ? "#F97316" : textMuted,
                      border: user.status === "AVAILABLE" ? "1px solid #4ADE80" : user.status === "BUSY" ? "1px solid #F97316" : cardBorder,
                    }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: user.status === "AVAILABLE" ? "#4ADE80" : user.status === "BUSY" ? "#F97316" : "#9CA3AF" }} />
                      {user.status || "Offline"}
                    </span>
                  </div>
                </div>

                {/* Fields Grid */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <FieldCard label="Full Name" icon={User}>
                    {isEditing && canEditProfile ? (
                      <input type="text" value={name} onChange={(e) => setName(e.target.value)} style={{ width: "100%", padding: "10px 12px", fontSize: 14, color: textPrimary, border: `1px solid ${cardBorder}`, borderRadius: 8, background: cardBg }} placeholder="Full name" />
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
                        <User size={16} style={{ color: textMuted }} />
                        <span style={{ fontSize: 14, fontWeight: 500, color: textPrimary }}>{user.name || "—"}</span>
                      </div>
                    )}
                  </FieldCard>

                  <FieldCard label="Email Address" icon={Mail}>
                    {isEditing && canEditProfile ? (
                      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: "100%", padding: "10px 12px", fontSize: 14, color: textPrimary, border: `1px solid ${cardBorder}`, borderRadius: 8, background: cardBg }} placeholder="Email address" />
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
                        <Mail size={16} style={{ color: textMuted }} />
                        <span style={{ fontSize: 14, fontWeight: 500, color: textPrimary }}>{user.email || "—"}</span>
                      </div>
                    )}
                  </FieldCard>

                  <FieldCard label="Phone Number" icon={Phone} value={user.phoneNumber || "Not set"} />
                  <FieldCard label="Agent Status" value={user.status || "Offline"} status />
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* Password Tab */}
          {safeTab === "password" && canChangePassword && (
            <motion.div key="password" variants={sectionVariants} initial="hidden" animate="visible" exit="hidden">
              <motion.div variants={tabVariants} initial="initial" animate="animate" exit="exit" style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 16, padding: 24, maxWidth: 760, margin: "0 auto" }}>
                <div style={{ marginBottom: 20 }}>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: textPrimary, letterSpacing: "-0.02em" }}>Change Password</h3>
                  <p style={{ margin: "4px 0 0", fontSize: 13, color: textMuted }}>Update your login password securely</p>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div>
                    <Label>New Password</Label>
                    <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} style={{ width: "100%", padding: "10px 12px", fontSize: 14, color: textPrimary, border: `1px solid ${cardBorder}`, borderRadius: 8, background: cardBg }} placeholder="••••••••" />
                  </div>

                  <div>
                    <Label>Confirm New Password</Label>
                    <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} style={{ width: "100%", padding: "10px 12px", fontSize: 14, color: textPrimary, border: `1px solid ${cardBorder}`, borderRadius: 8, background: cardBg }} placeholder="••••••••" />
                  </div>

                  {confirmPassword && (
                    <div style={{ fontSize: 13, fontWeight: 600, color: passwordsMatch ? successColor : "#EF4444" }}>
                      {passwordsMatch ? "✔ Passwords match" : "✖ Passwords do not match"}
                    </div>
                  )}

<button
                    onClick={handleChangePassword}
                    disabled={changingPassword || !newPassword || !passwordsMatch}
                    style={{
                      marginTop: 6,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      width: "100%",
                      padding: "12px 16px",
                      borderRadius: 10,
                      border: "none",
                      background:
                        changingPassword || !newPassword || !passwordsMatch
                          ? "#D0D5DD"
                          : "#5B5BD6",
                      color: "#fff",
                      cursor:
                        changingPassword || !newPassword || !passwordsMatch
                          ? "not-allowed"
                          : "pointer",
                      fontSize: 14,
                      fontWeight: 600,
                    }}
                  >
                    <Lock size={16} />
                    {changingPassword ? "Updating..." : "Update Password"}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* Privileges Tab */}
          {safeTab === "privileges" && (
            <motion.div key="privileges" variants={sectionVariants} initial="hidden" animate="visible" exit="hidden">
              <motion.div variants={tabVariants} initial="initial" animate="animate" exit="exit" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 16, padding: 24 }}>
                  <div style={{ marginBottom: 16 }}>
                    <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: textPrimary, letterSpacing: "-0.02em" }}>Privileges</h3>
                    <p style={{ margin: "4px 0 0", fontSize: 13, color: textMuted }}>Active permissions assigned to your account</p>
                  </div>

                  {privilegeEntries.length > 0 ? (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                      {privilegeEntries.map(([key], index) => {
                        const label = key.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase()).trim();
                        return (
                          <motion.div key={key} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "14px 16px", background: isDark ? "rgba(255,255,255,0.05)" : "#F9FAFB", border: `1px solid ${cardBorder}`, borderRadius: 12 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                              <div style={{ width: 34, height: 34, borderRadius: 10, background: isDark ? "rgba(22,163,74,0.15)" : "#ECFDF3", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                <Shield size={16} style={{ color: successColor }} />
                              </div>
                              <span style={{ fontSize: 14, fontWeight: 500, color: textPrimary }}>{label}</span>
                            </div>
                            <span style={{ fontSize: 12, fontWeight: 700, color: successColor, background: isDark ? "rgba(22,163,74,0.15)" : "#ECFDF3", border: `1px solid ${successColor}`, padding: "5px 10px", borderRadius: 999, whiteSpace: "nowrap" }}>
                              Enabled
                            </span>
                          </motion.div>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ textAlign: "center", padding: "50px 0" }}>
                      <div style={{ width: 56, height: 56, borderRadius: "50%", background: isDark ? "rgba(255,255,255,0.05)" : "#F3F4F6", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
                        <Shield size={24} style={{ color: textMuted }} />
                      </div>
                      <p style={{ color: textPrimary, fontWeight: 600, fontSize: 15, margin: "0 0 6px" }}>No active privileges assigned yet</p>
                      <p style={{ color: textMuted, fontSize: 13, margin: 0 }}>Contact your admin to enable features</p>
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* <Toaster position="top-right" /> */}
    </div>
  );
}

function FieldCard({ label, icon: Icon, value, children, status = false }: any) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const textPrimary = isDark ? "#F0F0F5" : "#101828";
  const textMuted = isDark ? "#68687A" : "#667085";
  const cardBg = isDark ? "rgba(20,20,28,0.98)" : "#FFFFFF";
  const cardBorder = isDark ? "rgba(255,255,255,0.08)" : "#EAECF0";

  return (
    <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 12, padding: 18 }}>
      <label style={{ fontSize: 12, fontWeight: 500, color: textMuted, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6, display: "block" }}>
        {label}
      </label>
      {children ? children : status ? (
        <div style={{ marginTop: 2 }}>
          <span style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 12px",
            borderRadius: 999,
            fontSize: 13,
            fontWeight: 600,
            background: value === "AVAILABLE" ? (isDark ? "rgba(22,163,74,0.15)" : "#ECFDF3") : value === "BUSY" ? (isDark ? "rgba(234,88,12,0.15)" : "#FFF7ED") : (isDark ? "rgba(255,255,255,0.05)" : "#F3F4F6"),
            color: value === "AVAILABLE" ? "#4ADE80" : value === "BUSY" ? "#F97316" : textMuted,
            border: value === "AVAILABLE" ? "1px solid #4ADE80" : value === "BUSY" ? "1px solid #F97316" : cardBorder,
          }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: value === "AVAILABLE" ? "#4ADE80" : value === "BUSY" ? "#F97316" : "#9CA3AF" }} />
            {value}
          </span>
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
          {Icon && <Icon size={16} style={{ color: textMuted, flexShrink: 0 }} />}
          <span style={{ fontSize: 14, fontWeight: 500, color: textPrimary }}>{value || "—"}</span>
        </div>
      )}
    </div>
  );
}

function Label({ children }: any) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  return (
    <label style={{ fontSize: 12, fontWeight: 500, color: isDark ? "#68687A" : "#667085", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6, display: "block" }}>
      {children}
    </label>
  );
}