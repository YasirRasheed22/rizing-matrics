// @ts-nocheck
// src/components/ForgotPassword.tsx
import { useState } from "react";
import { Mail, ArrowLeft, Loader2, Layers, SendHorizonal, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";
import api from "../api";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "../context/ThemeContext";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [email, setEmail]     = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);

  /* ── design tokens ── */
  const accent      = isDark ? "#7C7CF0" : "#5B5BD6";
  const accentT     = isDark ? "rgba(124,124,240,0.12)" : "rgba(91,91,214,0.10)";
  const pageBg      = isDark
    ? "linear-gradient(145deg,#08080E 0%,#0F0F18 40%,#0B0B14 100%)"
    : "linear-gradient(145deg,#f0f0ff 0%,#f8f8ff 40%,#eef2ff 100%)";
  const cardBg      = isDark ? "#17171F" : "#fff";
  const cardBorder  = isDark ? "rgba(124,124,240,0.15)" : "rgba(91,91,214,0.10)";
  const cardShadow  = isDark
    ? "0 8px 48px rgba(0,0,0,0.50), 0 2px 8px rgba(0,0,0,0.30)"
    : "0 8px 48px rgba(91,91,214,0.13), 0 2px 8px rgba(0,0,0,0.06)";
  const textPrimary = isDark ? "#F0F0F5" : "#0D0D12";
  const textMuted   = isDark ? "#9E9EAD" : "#6B7280";
  const inputBg     = isDark ? "#1E1E28" : "#F8F9FB";
  const inputBorder = isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.10)";
  const badgeBorder = isDark ? "rgba(124,124,240,0.25)" : "rgba(91,91,214,0.18)";
  const headerBorder = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)";
  const footerBg    = isDark ? "#1A1A24" : "#FAFAFA";
  const footerBorder = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)";
  const successBoxBg = isDark ? "rgba(255,255,255,0.04)" : "#F8F9FB";
  const successBoxBorder = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)";
  const btnDisabledBg = isDark ? "#2A2A3A" : "#C7C7E8";
  const btnDisabledColor = isDark ? "#4A4A5A" : "#fff";
  const copyrightColor = isDark ? "#3A3A4A" : "#C4C4D0";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post("/auth/forgot-password", { email });
      toast.success(res.data.message || "Reset link sent!");
      setSent(true);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to send reset email");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: pageBg,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "24px 16px",
      fontFamily: "'Inter',-apple-system,BlinkMacSystemFont,sans-serif",
      position: "relative", overflow: "hidden",
    }}>
      <BgBlobs isDark={isDark} />

      <div style={{ position: "relative", zIndex: 2, width: "100%", maxWidth: 460 }}>
        {/* logo + title */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <AppLogo />
          <h1 style={{ margin: "14px 0 0", fontSize: 28, fontWeight: 800, color: textPrimary, letterSpacing: "-0.04em" }}>
            Forgot your password?
          </h1>
          <p style={{ margin: "8px 0 0", fontSize: 14, color: textMuted, lineHeight: 1.6 }}>
            We'll send a reset link to your <strong style={{ color: accent }}>Ringnex</strong> email
          </p>
        </div>

        {/* card */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 24 }}
          style={{
            background: cardBg,
            borderRadius: 24,
            boxShadow: cardShadow,
            border: `1px solid ${cardBorder}`,
            overflow: "hidden",
          }}
        >
          {/* top accent */}
          <div style={{ height: 4, background: `linear-gradient(90deg,${accent},#818CF8,${accent})`, backgroundSize: "200% 100%", animation: "shimmer 3s linear infinite" }} />

          {/* badge */}
          <div style={{ padding: "18px 24px 14px", borderBottom: `1px solid ${headerBorder}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 7, background: accentT, border: `1px solid ${badgeBorder}`, borderRadius: 9999, padding: "5px 12px", fontSize: 12, fontWeight: 700, color: accent }}>
              <Mail size={13} />
              Password Recovery
            </div>
            <span style={{ fontSize: 11.5, color: "#9E9EAD", fontWeight: 500 }}>Ringnex Platform</span>
          </div>

          <AnimatePresence mode="wait">
            {sent ? (
              /* ── success state ── */
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 280, damping: 22 }}
                style={{ padding: "36px 24px", textAlign: "center" }}
              >
                <div style={{ width: 66, height: 66, borderRadius: "50%", background: "rgba(22,163,74,0.08)", border: "1.5px solid rgba(22,163,74,0.22)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                  <CheckCircle2 size={30} color="#16A34A" />
                </div>
                <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: textPrimary, letterSpacing: "-0.02em" }}>Check your inbox</h3>
                <p style={{ margin: "10px 0 0", fontSize: 13.5, color: textMuted, lineHeight: 1.65 }}>
                  We've sent a password reset link to<br />
                  <strong style={{ color: textPrimary }}>{email}</strong>.<br />
                  The link expires in 30 minutes.
                </p>
                <div style={{ marginTop: 24, padding: "12px 16px", background: successBoxBg, border: `1px solid ${successBoxBorder}`, borderRadius: 12, fontSize: 12.5, color: "#9E9EAD" }}>
                  Didn't receive it? Check spam or{" "}
                  <button onClick={() => setSent(false)} style={{ background: "none", border: "none", padding: 0, color: accent, fontWeight: 600, cursor: "pointer", fontSize: 12.5, fontFamily: "inherit" }}>
                    try again
                  </button>
                </div>
              </motion.div>
            ) : (
              /* ── form state ── */
              <motion.form
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onSubmit={handleSubmit}
                style={{ padding: "24px 24px 0" }}
              >
                <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "#9E9EAD", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                  Email Address
                </label>

                <div style={{ position: "relative", marginBottom: 20 }}>
                  <div style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", display: "flex" }}>
                    <Mail size={16} color="#9E9EAD" />
                  </div>
                  <input
                    type="email" required autoFocus
                    placeholder="you@company.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    style={{
                      width: "100%", boxSizing: "border-box",
                      padding: "13px 14px 13px 40px",
                      borderRadius: 12, border: `1px solid ${inputBorder}`,
                      background: inputBg, outline: "none",
                      fontSize: 14, color: textPrimary,
                      fontFamily: "'Inter',sans-serif",
                      transition: "border 0.15s, box-shadow 0.15s, background 0.15s",
                    }}
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
                </div>

                <button
                  type="submit" disabled={loading}
                  style={{
                    width: "100%", border: "none", borderRadius: 13,
                    padding: "14px 16px",
                    background: loading ? btnDisabledBg : `linear-gradient(135deg,${accent},#4747C2)`,
                    color: loading ? btnDisabledColor : "#fff",
                    fontSize: 14.5, fontWeight: 700,
                    cursor: loading ? "not-allowed" : "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 9,
                    boxShadow: loading ? "none" : "0 6px 20px rgba(91,91,214,0.32)",
                    fontFamily: "inherit",
                    transition: "all 0.15s",
                  }}
                >
                  {loading
                    ? <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Sending…</>
                    : <><SendHorizonal size={16} /> Send Reset Link</>
                  }
                </button>

                <div style={{ height: 20 }} />
              </motion.form>
            )}
          </AnimatePresence>

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

      {/* <Toaster
        position="top-center"
        toastOptions={{
          style: {
            fontFamily: "'Inter',sans-serif", borderRadius: 12, fontSize: 13.5,
            background: isDark ? "#1E1E2C" : "#fff",
            color: isDark ? "#F0F0F5" : "#0D0D12",
            boxShadow: isDark ? "0 4px 20px rgba(0,0,0,0.40)" : "0 4px 20px rgba(0,0,0,0.10)",
          },
        }}
      /> */}
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}} @keyframes spin{to{transform:rotate(360deg)}}`}</style>
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
