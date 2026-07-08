// @ts-nocheck
// src/components/ResetPassword.tsx
import { useEffect, useState } from "react";
import { Lock, Loader2, ArrowLeft, Eye, EyeOff, Layers, CheckCircle2, XCircle } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";
import api from "../api";
import { motion } from "framer-motion";
import { useTheme } from "../context/ThemeContext";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [loading, setLoading]                 = useState(true);
  const [saving, setSaving]                   = useState(false);
  const [tokenValid, setTokenValid]           = useState(false);
  const [email, setEmail]                     = useState("");
  const [password, setPassword]               = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass]               = useState(false);
  const [showConfirm, setShowConfirm]         = useState(false);
  const [done, setDone]                       = useState(false);

  /* ── design tokens ── */
  const accent           = isDark ? "#7C7CF0" : "#5B5BD6";
  const accentT          = isDark ? "rgba(124,124,240,0.12)" : "rgba(91,91,214,0.10)";
  const pageBg           = isDark
    ? "linear-gradient(145deg,#08080E 0%,#0F0F18 40%,#0B0B14 100%)"
    : "linear-gradient(145deg,#f0f0ff 0%,#f8f8ff 40%,#eef2ff 100%)";
  const cardBg           = isDark ? "#17171F" : "#fff";
  const cardBorder       = isDark ? "rgba(124,124,240,0.15)" : "rgba(91,91,214,0.10)";
  const cardShadow       = isDark
    ? "0 8px 48px rgba(0,0,0,0.50), 0 2px 8px rgba(0,0,0,0.30)"
    : "0 8px 48px rgba(91,91,214,0.13), 0 2px 8px rgba(0,0,0,0.06)";
  const textPrimary      = isDark ? "#F0F0F5" : "#0D0D12";
  const textMuted        = isDark ? "#9E9EAD" : "#6B7280";
  const inputBg          = isDark ? "#1E1E28" : "#F8F9FB";
  const inputBorder      = isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.10)";
  const badgeBorder      = isDark ? "rgba(124,124,240,0.25)" : "rgba(91,91,214,0.18)";
  const headerBorder     = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)";
  const footerBg         = isDark ? "#1A1A24" : "#FAFAFA";
  const footerBorder     = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)";
  const btnDisabledBg    = isDark ? "#2A2A3A" : "#C7C7E8";
  const btnDisabledColor = isDark ? "#4A4A5A" : "#fff";
  const copyrightColor   = isDark ? "#3A3A4A" : "#C4C4D0";
  const strengthTrack    = isDark ? "#2A2A38" : "#E5E7EB";

  useEffect(() => {
    const verify = async () => {
      if (!token) { setTokenValid(false); setLoading(false); return; }
      try {
        const res = await api.get(`/auth/verify-reset-token/${token}`);
        setTokenValid(res.data.valid);
        setEmail(res.data.email || "");
      } catch (err: any) {
        setTokenValid(false);
        toast.error(err.response?.data?.message || "Invalid or expired reset link");
      } finally {
        setLoading(false);
      }
    };
    verify();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6)         { toast.error("Password must be at least 6 characters"); return; }
    if (password !== confirmPassword) { toast.error("Passwords do not match"); return; }
    setSaving(true);
    try {
      const res = await api.post("/auth/reset-password", { token, password, confirmPassword });
      toast.success(res.data.message || "Password reset successful");
      setDone(true);
      setTimeout(() => navigate("/login"), 2000);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to reset password");
    } finally {
      setSaving(false);
    }
  };

  /* ── password strength ── */
  const strength = (() => {
    if (!password) return 0;
    let s = 0;
    if (password.length >= 6)  s++;
    if (password.length >= 10) s++;
    if (/[A-Z]/.test(password)) s++;
    if (/[0-9]/.test(password)) s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    return s;
  })();
  const strengthLabel = ["", "Weak", "Fair", "Good", "Strong", "Very Strong"][strength] || "";
  const strengthColor = ["", "#EF4444", "#F59E0B", "#3B82F6", "#10B981", "#10B981"][strength] || strengthTrack;

  const toasterStyle = {
    fontFamily: "'Inter',sans-serif", borderRadius: 12, fontSize: 13.5,
    background: isDark ? "#1E1E2C" : "#fff",
    color: isDark ? "#F0F0F5" : "#0D0D12",
    boxShadow: isDark ? "0 4px 20px rgba(0,0,0,0.40)" : "0 4px 20px rgba(0,0,0,0.10)",
  };

  /* ── loading screen ── */
  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: pageBg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter',sans-serif" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
          <AppLogo />
          <Loader2 size={24} color={accent} style={{ animation: "spin 1s linear infinite", marginTop: 8 }} />
          <span style={{ fontSize: 13.5, color: "#9E9EAD" }}>Verifying reset link…</span>
        </div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  /* ── invalid token screen ── */
  if (!tokenValid) {
    return (
      <div style={{ minHeight: "100vh", background: pageBg, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 16px", fontFamily: "'Inter',sans-serif", position: "relative", overflow: "hidden" }}>
        <BgBlobs isDark={isDark} />
        <motion.div
          initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 24 }}
          style={{ position: "relative", zIndex: 2, background: cardBg, borderRadius: 24, width: "100%", maxWidth: 420, boxShadow: cardShadow, border: `1px solid ${cardBorder}`, overflow: "hidden" }}
        >
          <div style={{ height: 4, background: "linear-gradient(90deg,#EF4444,#F87171)" }} />
          <div style={{ padding: "36px 28px", textAlign: "center" }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(239,68,68,0.08)", border: "1.5px solid rgba(239,68,68,0.20)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <XCircle size={30} color="#EF4444" />
            </div>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: textPrimary, letterSpacing: "-0.02em" }}>Link Expired</h2>
            <p style={{ margin: "10px 0 24px", fontSize: 13.5, color: textMuted, lineHeight: 1.65 }}>
              This password reset link is invalid, expired, or has already been used.
            </p>
            <button
              onClick={() => navigate("/forgot-password")}
              style={{ display: "inline-flex", alignItems: "center", gap: 8, background: `linear-gradient(135deg,${accent},#4747C2)`, color: "#fff", border: "none", borderRadius: 12, padding: "12px 24px", fontSize: 14, fontWeight: 600, cursor: "pointer", boxShadow: "0 6px 20px rgba(91,91,214,0.30)", fontFamily: "inherit" }}
            >
              Request New Link
            </button>
          </div>
        </motion.div>
        {/* <Toaster position="top-center" toastOptions={{ style: toasterStyle }} /> */}
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: pageBg, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 16px", fontFamily: "'Inter',-apple-system,BlinkMacSystemFont,sans-serif", position: "relative", overflow: "hidden" }}>
      <BgBlobs isDark={isDark} />

      <div style={{ position: "relative", zIndex: 2, width: "100%", maxWidth: 460 }}>
        {/* logo + title */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <AppLogo />
          <h1 style={{ margin: "14px 0 0", fontSize: 28, fontWeight: 800, color: textPrimary, letterSpacing: "-0.04em" }}>
            {done ? "Password Updated!" : "Set new password"}
          </h1>
          <p style={{ margin: "8px 0 0", fontSize: 14, color: textMuted, lineHeight: 1.6 }}>
            {done
              ? "Redirecting you to sign in…"
              : <>Resetting for <strong style={{ color: accent }}>{email}</strong></>
            }
          </p>
        </div>

        {/* card */}
        <motion.div
          initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 24 }}
          style={{ background: cardBg, borderRadius: 24, boxShadow: cardShadow, border: `1px solid ${cardBorder}`, overflow: "hidden" }}
        >
          {/* top accent */}
          <div style={{ height: 4, background: done ? "linear-gradient(90deg,#10B981,#34D399)" : `linear-gradient(90deg,${accent},#818CF8,${accent})`, backgroundSize: "200% 100%", animation: done ? "none" : "shimmer 3s linear infinite" }} />

          {/* badge */}
          <div style={{ padding: "18px 24px 14px", borderBottom: `1px solid ${headerBorder}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 7, background: accentT, border: `1px solid ${badgeBorder}`, borderRadius: 9999, padding: "5px 12px", fontSize: 12, fontWeight: 700, color: accent }}>
              <Lock size={13} />
              Reset Password
            </div>
            <span style={{ fontSize: 11.5, color: "#9E9EAD", fontWeight: 500 }}>Ringnex Platform</span>
          </div>

          {done ? (
            /* ── success state ── */
            <div style={{ padding: "36px 28px", textAlign: "center" }}>
              <div style={{ width: 66, height: 66, borderRadius: "50%", background: "rgba(16,185,129,0.08)", border: "1.5px solid rgba(16,185,129,0.22)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                <CheckCircle2 size={30} color="#10B981" />
              </div>
              <p style={{ margin: 0, fontSize: 13.5, color: textMuted }}>
                Your password has been updated successfully.<br />Taking you to sign in…
              </p>
              <Loader2 size={20} color={accent} style={{ animation: "spin 1s linear infinite", marginTop: 20 }} />
            </div>
          ) : (
            /* ── form ── */
            <form onSubmit={handleSubmit} style={{ padding: "24px 24px 0" }}>
              {/* new password */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "#9E9EAD", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>New Password</label>
                <PasswordInput
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  show={showPass}
                  onToggle={() => setShowPass(v => !v)}
                  isDark={isDark}
                  inputBg={inputBg}
                  inputBorder={inputBorder}
                  textPrimary={textPrimary}
                />
                {/* strength bar */}
                {password && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
                      {[1,2,3,4,5].map(i => (
                        <div key={i} style={{ flex: 1, height: 3, borderRadius: 9999, background: i <= strength ? strengthColor : strengthTrack, transition: "background 0.2s" }} />
                      ))}
                    </div>
                    <span style={{ fontSize: 11.5, fontWeight: 600, color: strengthColor }}>{strengthLabel}</span>
                  </div>
                )}
              </div>

              {/* confirm password */}
              <div style={{ marginBottom: 22 }}>
                <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "#9E9EAD", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Confirm Password</label>
                <PasswordInput
                  placeholder="Repeat your new password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  show={showConfirm}
                  onToggle={() => setShowConfirm(v => !v)}
                  isDark={isDark}
                  inputBg={inputBg}
                  inputBorder={inputBorder}
                  textPrimary={textPrimary}
                />
                {confirmPassword && confirmPassword !== password && (
                  <p style={{ margin: "6px 0 0", fontSize: 12, color: "#EF4444", fontWeight: 500 }}>Passwords do not match</p>
                )}
                {confirmPassword && confirmPassword === password && (
                  <p style={{ margin: "6px 0 0", fontSize: 12, color: "#10B981", fontWeight: 500 }}>✓ Passwords match</p>
                )}
              </div>

              <button
                type="submit" disabled={saving}
                style={{ width: "100%", border: "none", borderRadius: 13, padding: "14px 16px", background: saving ? btnDisabledBg : `linear-gradient(135deg,${accent},#4747C2)`, color: saving ? btnDisabledColor : "#fff", fontSize: 14.5, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 9, boxShadow: saving ? "none" : "0 6px 20px rgba(91,91,214,0.32)", fontFamily: "inherit", transition: "all 0.15s" }}
              >
                {saving
                  ? <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />Saving…</>
                  : "Save New Password"
                }
              </button>

              <div style={{ height: 20 }} />
            </form>
          )}

          {/* footer */}
          <div style={{ padding: "14px 24px", background: footerBg, borderTop: `1px solid ${footerBorder}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <button onClick={() => navigate("/login")}
              style={{ background: "none", border: "none", color: "#9E9EAD", fontSize: 13, fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 7, fontFamily: "inherit" }}>
              <ArrowLeft size={14} /> Back to sign in
            </button>
          </div>
        </motion.div>

        <p style={{ textAlign: "center", marginTop: 20, color: copyrightColor, fontSize: 12 }}>
          © {new Date().getFullYear()} Ringnex · All rights reserved
        </p>
      </div>

      {/* <Toaster position="top-center" toastOptions={{ style: toasterStyle }} /> */}
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}} @keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

/* ── Password input with toggle ── */
function PasswordInput({ value, onChange, placeholder, show, onToggle, isDark, inputBg, inputBorder, textPrimary }: any) {
  return (
    <div style={{ position: "relative" }}>
      <div style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", display: "flex" }}>
        <Lock size={16} color="#9E9EAD" />
      </div>
      <input
        type={show ? "text" : "password"} required
        placeholder={placeholder}
        value={value} onChange={onChange}
        style={{ width: "100%", boxSizing: "border-box", padding: "13px 44px 13px 40px", borderRadius: 12, border: `1px solid ${inputBorder}`, background: inputBg, outline: "none", fontSize: 14, color: textPrimary, fontFamily: "'Inter',sans-serif", transition: "border 0.15s, box-shadow 0.15s, background 0.15s" }}
        onFocus={e => {
          e.target.style.borderColor = isDark ? "rgba(124,124,240,0.60)" : "rgba(91,91,214,0.50)";
          e.target.style.boxShadow   = isDark ? "0 0 0 3px rgba(124,124,240,0.12)" : "0 0 0 3px rgba(91,91,214,0.10)";
          e.target.style.background  = isDark ? "#222230" : "#fff";
        }}
        onBlur={e => {
          e.target.style.borderColor = inputBorder;
          e.target.style.boxShadow   = "none";
          e.target.style.background  = inputBg;
        }}
      />
      <button type="button" onClick={onToggle}
        style={{ position: "absolute", right: 13, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex", color: "#9E9EAD" }}>
        {show ? <Eye size={16} /> : <EyeOff size={16} />}
      </button>
    </div>
  );
}

function AppLogo() {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 68, height: 68, borderRadius: 22, background: "linear-gradient(135deg,#5B5BD6,#818CF8)", boxShadow: "0 8px 28px rgba(91,91,214,0.32)" }}>
      <Layers size={30} color="#fff" strokeWidth={2} />
    </div>
  );
}

function BgBlobs({ isDark }: { isDark: boolean }) {
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
      <div style={{ position: "absolute", width: 380, height: 380, borderRadius: "50%", background: isDark ? "rgba(124,124,240,0.06)" : "rgba(91,91,214,0.10)", top: -100, left: -100, filter: "blur(60px)" }} />
      <div style={{ position: "absolute", width: 300, height: 300, borderRadius: "50%", background: isDark ? "rgba(129,140,248,0.05)" : "rgba(129,140,248,0.12)", bottom: -60, right: -60, filter: "blur(50px)" }} />
    </div>
  );
}
