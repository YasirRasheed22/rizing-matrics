// @ts-nocheck
// src/components/LoginForm.tsx
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import {
  Mail, Lock, LogIn, Loader2, Shield, ArrowLeft,
  Eye, EyeOff, Layers, Sun, Moon, Monitor, AlertTriangle, LogOut,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";
import api from "../api";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "../context/ThemeContext";
import UpdateButton from "./UpdateButton";

/* ══════════════════════════════════════════════════════
   ForceLogoutModal
   ══════════════════════════════════════════════════════ */
function ForceLogoutModal({
  open,
  onConfirm,
  onCancel,
  isDark,
}: {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isDark: boolean;
}) {
  if (!open) return null;

  const cardBg     = isDark ? "#17171F" : "#fff";
  const cardBorder = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.08)";
  const subC       = isDark ? "#A0A0B0" : "#6B7280";
  const titleC     = isDark ? "#F0F0F5" : "#0D0D12";
  const badgeBg    = isDark ? "rgba(255,255,255,0.04)" : "#F9FAFB";
  const badgeBord  = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)";
  const cancelBg   = isDark ? "rgba(255,255,255,0.06)" : "transparent";
  const cancelBord = isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)";
  const cancelC    = isDark ? "#A0A0B0" : "#6B7280";

  return (
    <div
      onClick={onCancel}
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "24px 16px",
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 12 }}
        animate={{ opacity: 1, scale: 1,    y: 0  }}
        exit={{    opacity: 0, scale: 0.94, y: 12 }}
        transition={{ type: "spring", stiffness: 300, damping: 26 }}
        onClick={e => e.stopPropagation()}
        style={{
          background: cardBg,
          border: `1px solid ${cardBorder}`,
          borderRadius: 22,
          width: "100%", maxWidth: 400,
          overflow: "hidden",
          boxShadow: isDark
            ? "0 24px 64px rgba(0,0,0,0.60)"
            : "0 24px 64px rgba(0,0,0,0.14)",
        }}
      >
        {/* red accent bar */}
        <div style={{
          height: 4,
          background: "linear-gradient(90deg,#E24B4A,#F09595,#E24B4A)",
          backgroundSize: "200% 100%",
          animation: "shimmer 3s linear infinite",
        }} />

        <div style={{ padding: 28 }}>
          {/* icon */}
          <div style={{
            width: 56, height: 56, borderRadius: "50%",
            background: isDark ? "rgba(226,75,74,0.15)" : "#FCEBEB",
            border: `1.5px solid ${isDark ? "rgba(226,75,74,0.25)" : "rgba(226,75,74,0.15)"}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 14px",
          }}>
            <Monitor size={26} color="#E24B4A" />
          </div>

          <h3 style={{
            margin: "0 0 8px", textAlign: "center",
            fontSize: 18, fontWeight: 700, color: titleC, letterSpacing: "-0.02em",
          }}>
            Already signed in elsewhere
          </h3>
          <p style={{
            margin: "0 0 18px", textAlign: "center",
            fontSize: 13.5, color: subC, lineHeight: 1.65,
          }}>
            This account is{" "}
            <strong style={{ color: titleC }}>currently active</strong>{" "}
            on another device or session.
          </p>

          {/* warning badge */}
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            background: badgeBg,
            border: `1px solid ${badgeBord}`,
            borderRadius: 12, padding: "10px 14px",
            marginBottom: 22,
            fontSize: 13, color: subC, lineHeight: 1.5,
          }}>
            <AlertTriangle size={16} color="#E24B4A" style={{ flexShrink: 0 }} />
            Signing in here will log out all other active sessions.
          </div>

          {/* confirm */}
          <button
            onClick={onConfirm}
            style={{
              width: "100%", padding: "13px 16px",
              background: "#E24B4A", color: "#fff",
              border: "none", borderRadius: 12,
              fontSize: 14, fontWeight: 700,
              cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              marginBottom: 10,
              boxShadow: "0 4px 16px rgba(226,75,74,0.30)",
              fontFamily: "inherit",
            }}
          >
            <LogOut size={15} /> Sign out all &amp; continue
          </button>

          {/* cancel */}
          <button
            onClick={onCancel}
            style={{
              width: "100%", padding: "12px 16px",
              background: cancelBg,
              border: `1px solid ${cancelBord}`,
              borderRadius: 12,
              fontSize: 14, color: cancelC,
              cursor: "pointer", fontFamily: "inherit",
            }}
          >
            Cancel
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   Main Component
   ══════════════════════════════════════════════════════ */
type AuthStep = "PASSWORD" | "SETUP_2FA" | "VERIFY_2FA";

const P  = "#5B5BD6";
const PD = "#7C7CF0";

export default function LoginForm() {
  const { logout, refetchUser } = useAuth();
  const { theme, toggleTheme }  = useTheme();
  const isDark = theme === "dark";

  const [authStep, setAuthStep]         = useState<AuthStep>("PASSWORD");
  const [qrCode, setQrCode]             = useState<string | null>(null);
  const [email, setEmail]               = useState("");
  const [password, setPassword]         = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp]                   = useState("");
  const [loading, setLoading]           = useState(false);
  const [tempToken, setTempToken]       = useState<string | null>(null);
  const [rememberMe, setRememberMe]     = useState(true);
  const [themeBtnHov, setThemeBtnHov]   = useState(false);
  const [showForceModal, setShowForceModal] = useState(false);

  const navigate = useNavigate();

  // ── design tokens ──
  const accent      = isDark ? PD : P;
  const pageBg      = isDark
    ? "linear-gradient(145deg,#08080E 0%,#0F0F18 40%,#0B0B14 100%)"
    : "linear-gradient(145deg,#f0f0ff 0%,#f8f8ff 40%,#eef2ff 100%)";
  const titleColor  = isDark ? "#F0F0F5" : "#0D0D12";
  const subColor    = isDark ? "#A0A0B0" : "#6B7280";
  const cardBg      = isDark ? "#17171F" : "#fff";
  const cardBorder  = isDark ? "rgba(255,255,255,0.07)" : "rgba(91,91,214,0.10)";
  const cardShadow  = isDark
    ? "0 8px 48px rgba(0,0,0,0.50), 0 2px 8px rgba(0,0,0,0.30)"
    : "0 8px 48px rgba(91,91,214,0.13), 0 2px 8px rgba(0,0,0,0.06)";
  const badgeBorder  = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)";
  const footerBg     = isDark ? "rgba(255,255,255,0.03)" : "#FAFAFA";
  const footerBorder = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)";
  const copyrightC   = isDark ? "#3A3A4A" : "#C4C4D0";
  const rememberC    = isDark ? "#C0C0D0" : "#4B4B5A";
  const backBtnC     = isDark ? "#68687A" : "#9E9EAD";
  const twoFaHeadBg  = isDark ? "rgba(22,163,74,0.10)" : "rgba(22,163,74,0.08)";
  const qrBg         = isDark ? "rgba(255,255,255,0.05)" : "#FAFAFA";
  const qrBorder     = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)";
  const otpLabelC    = isDark ? "#68687A" : "#9E9EAD";
  const twoFaTitleC  = isDark ? "#F0F0F5" : "#0D0D12";
  const twoFaSubC    = isDark ? "#A0A0B0" : "#6B7280";

  const themeBtnBg   = themeBtnHov
    ? (isDark ? "rgba(255,255,255,0.12)" : "rgba(91,91,214,0.12)")
    : (isDark ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.80)");
  const themeBtnBord = isDark ? "rgba(255,255,255,0.12)" : "rgba(91,91,214,0.15)";
  const themeBtnClr  = isDark ? "#FBBF24" : "#5B5BD6";
  const themeBtnShd  = isDark
    ? "0 2px 12px rgba(0,0,0,0.40)"
    : "0 2px 12px rgba(91,91,214,0.15)";

  useEffect(() => {
    const saved = localStorage.getItem("remember_login");
    if (saved) {
      const { email, password } = JSON.parse(saved);
      setEmail(email || "");
      setPassword(password || "");
      setRememberMe(true);
    }
  }, []);

  // ── helpers ──
  const getPublicIP = async (): Promise<string | null> => {
    try {
      const res = await fetch("https://api.ipify.org?format=json");
      return (await res.json()).ip;
    } catch {
      return null;
    }
  };

  const getOrCreateDeviceId = () => {
    let deviceId = localStorage.getItem("deviceId");
    if (!deviceId) {
      deviceId = crypto.randomUUID();
      localStorage.setItem("deviceId", deviceId);
    }
    return deviceId;
  };

  const getDeviceName = () => navigator.userAgent || "Unknown Device";

  const saveLoginData = async (token: string, user: any) => {
    const normalizedUser = { ...user, role: user?.role?.toUpperCase() };
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(normalizedUser));
    saveRemember();
    await refetchUser();
    navigate("/", { replace: true });
  };

  const handlePostLogin = async (user: any) => {
    const privileges = user?.additionalRole;
    if (privileges?.loginIp) {
      const currentIP = await getPublicIP();
      if (!currentIP) {
        toast.error("Unable to detect your IP. Please try again.");
        logout(navigate);
        return false;
      }
      if (currentIP !== privileges.loginIpAddress) {
        toast.error("Login restricted to a specific IP address.");
        localStorage.clear();
        setLoading(false);
        logout(navigate);
        return false;
      }
    }
    return true;
  };

  const saveRemember = () => {
    if (rememberMe) localStorage.setItem("remember_login", JSON.stringify({ email, password }));
    else localStorage.removeItem("remember_login");
  };

  // ── force-logout retry (called when user confirms modal) ──
  const handleForceLogout = async () => {
    setShowForceModal(false);
    setLoading(true);

    try {
      const retryRes = await api.post("/auth/login", {
        email,
        password,
        forceLogoutAll: true,
        deviceId: getOrCreateDeviceId(),
        deviceName: getDeviceName(),
      });

      const {
        token,
        user,
        requires2FA,
        requires2FASetup,
        qrCode,
      } = retryRes.data;

      if (requires2FASetup) {
        setTempToken(token);
        setQrCode(qrCode);
        setAuthStep("SETUP_2FA");
        setLoading(false);
        return;
      }

      if (requires2FA) {
        setTempToken(token);
        setAuthStep("VERIFY_2FA");
        setLoading(false);
        return;
      }

      const ok = await handlePostLogin(user);
      if (!ok) return;

      if (token && user) {
        await saveLoginData(token, user);
        toast.success("Logged out all devices and signed in!");
        return;
      }

      toast.error("Login failed. Please try again.");
    } catch (retryErr: any) {
      toast.error(retryErr.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  // ── main login submit ──
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        email,
        password,
        deviceId: getOrCreateDeviceId(),
        deviceName: getDeviceName(),
      };

      const res = await api.post("/auth/login", payload);

      const {
        token,
        user,
        requires2FA,
        requires2FASetup,
        qrCode,
      } = res.data;

      if (requires2FASetup) {
        setTempToken(token);
        setQrCode(qrCode);
        setAuthStep("SETUP_2FA");
        setLoading(false);
        return;
      }

      if (requires2FA) {
        setTempToken(token);
        setAuthStep("VERIFY_2FA");
        setLoading(false);
        return;
      }

      const ok = await handlePostLogin(user);
      if (!ok) return;

      if (token && user) {
        await saveLoginData(token, user);
        toast.success("Login successful!");
        return;
      }

      toast.error("Login failed. Please try again.");
    } catch (err: any) {
      // already logged in on another device → show modal instead of window.confirm
      if (err.response?.status === 409 && err.response?.data?.alreadyLoggedIn) {
        setLoading(false);
        setShowForceModal(true);
        return;
      }

      toast.error(err.response?.data?.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (otp.length !== 6) {
      toast.error("Enter a valid 6-digit code");
      return;
    }

    setLoading(true);

    try {
      const res = await api.post(
        "/auth/verify-google-otp",
        { code: otp },
        { headers: { Authorization: `Bearer ${tempToken}` } },
      );

      const { token, user } = res.data;

      if (!token || !user) {
        toast.error("Invalid OTP response");
        return;
      }

      await saveLoginData(token, user);
      toast.success("Login successful!");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Invalid or expired code");
    } finally {
      setLoading(false);
    }
  };

  const backToPassword = () => {
    setAuthStep("PASSWORD");
    setOtp("");
    setLoading(false);
  };

  // ── render ──
  return (
    <div style={{
      minHeight: "100vh", background: pageBg,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "24px 16px",
      fontFamily: "'Inter',-apple-system,BlinkMacSystemFont,sans-serif",
      position: "relative", overflow: "hidden",
    }}>
      <BgBlobs isDark={isDark} />

      {/* Force-logout modal */}
      <AnimatePresence>
        {showForceModal && (
          <ForceLogoutModal
            open={showForceModal}
            onConfirm={handleForceLogout}
            onCancel={() => setShowForceModal(false)}
            isDark={isDark}
          />
        )}
      </AnimatePresence>

      {/* Theme toggle */}
      <div style={{ position: "fixed", top: 18, right:66, zIndex: 100 ,
            width: 42, height: 42, borderRadius: 13,
            border: `1px solid ${themeBtnBord}`,
            background: themeBtnBg,
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", color: themeBtnClr,
            boxShadow: themeBtnShd,
            transition: "all 0.15s ease",
         }}>
        <UpdateButton/>
        </div>
      <div style={{ position: "fixed", top: 16, right: 16, zIndex: 100 }}>
        
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          onClick={toggleTheme}
          onMouseEnter={() => setThemeBtnHov(true)}
          onMouseLeave={() => setThemeBtnHov(false)}
          aria-label={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          style={{
            width: 42, height: 42, borderRadius: 13,
            border: `1px solid ${themeBtnBord}`,
            background: themeBtnBg,
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", color: themeBtnClr,
            boxShadow: themeBtnShd,
            transition: "all 0.15s ease",
          }}
        >
          <AnimatePresence mode="wait">
            {isDark ? (
              <motion.span key="sun"
                initial={{ opacity: 0, rotate: -90, scale: 0.7 }}
                animate={{ opacity: 1, rotate: 0,   scale: 1   }}
                exit={{    opacity: 0, rotate:  90, scale: 0.7 }}
                transition={{ duration: 0.18 }}
                style={{ display: "flex" }}
              >
                <Sun size={18} />
              </motion.span>
            ) : (
              <motion.span key="moon"
                initial={{ opacity: 0, rotate: 90,  scale: 0.7 }}
                animate={{ opacity: 1, rotate: 0,   scale: 1   }}
                exit={{    opacity: 0, rotate: -90, scale: 0.7 }}
                transition={{ duration: 0.18 }}
                style={{ display: "flex" }}
              >
                <Moon size={18} />
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </div>

      <div style={{ position: "relative", zIndex: 2, width: "100%", maxWidth: 460 }}>
        {/* logo + title */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <AppLogo />
          <h1 style={{ margin: "14px 0 0", fontSize: 30, fontWeight: 800, color: titleColor, letterSpacing: "-0.04em" }}>
            Welcome back
          </h1>
          <p style={{ margin: "8px 0 0", fontSize: 14, color: subColor, lineHeight: 1.6 }}>
            Sign in to your <strong style={{ color: accent }}>Ringnex</strong> workspace
          </p>
        </div>

        {/* card */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 24 }}
          style={{
            background: cardBg, borderRadius: 24,
            boxShadow: cardShadow, border: `1px solid ${cardBorder}`,
            overflow: "hidden",
          }}
        >
          {/* top accent bar */}
          <div style={{
            height: 4,
            background: `linear-gradient(90deg,${accent},#818CF8,${accent})`,
            backgroundSize: "200% 100%",
            animation: "shimmer 3s linear infinite",
          }} />

          {/* badge row */}
          <div style={{
            padding: "18px 24px 14px",
            borderBottom: `1px solid ${badgeBorder}`,
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 7,
              background: isDark ? "rgba(124,124,240,0.12)" : "rgba(91,91,214,0.10)",
              border: `1px solid ${isDark ? "rgba(124,124,240,0.25)" : "rgba(91,91,214,0.18)"}`,
              borderRadius: 9999, padding: "5px 12px",
              fontSize: 12, fontWeight: 700, color: accent,
            }}>
              <Shield size={13} /> Secure Sign In
            </div>
            <span style={{ fontSize: 11.5, color: isDark ? "#4A4A5A" : "#9E9EAD", fontWeight: 500 }}>
              Ringnex Platform
            </span>
          </div>

          <AnimatePresence mode="wait">
            {authStep === "PASSWORD" ? (
              <motion.form
                key="password"
                initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }}
                transition={{ duration: 0.18 }}
                onSubmit={handlePasswordSubmit}
                style={{ padding: "24px 24px 0" }}
              >
                <Field label="Email Address" isDark={isDark}>
                  <IconInput
                    icon={<Mail size={16} color={isDark ? "#4A4A5A" : "#9E9EAD"} />}
                    type="email" required autoFocus placeholder="you@company.com"
                    value={email} onChange={e => setEmail(e.target.value)} isDark={isDark}
                  />
                </Field>

                <Field label="Password" style={{ marginTop: 16 }} isDark={isDark}>
                  <IconInput
                    icon={<Lock size={16} color={isDark ? "#4A4A5A" : "#9E9EAD"} />}
                    type={showPassword ? "text" : "password"} required
                    placeholder="Enter your password"
                    value={password} onChange={e => setPassword(e.target.value)} isDark={isDark}
                    rightEl={
                      <button
                        type="button"
                        onClick={() => setShowPassword(v => !v)}
                        style={{ background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex", color: isDark ? "#4A4A5A" : "#9E9EAD" }}
                      >
                        {showPassword ? <Eye size={16} /> : <EyeOff size={16} />}
                      </button>
                    }
                  />
                </Field>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14, marginBottom: 20 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: rememberC, fontWeight: 500, userSelect: "none" }}>
                    <input
                      type="checkbox" checked={rememberMe}
                      onChange={e => setRememberMe(e.target.checked)}
                      style={{ accentColor: accent, width: 15, height: 15 }}
                    />
                    Remember me
                  </label>
                  <button
                    type="button"
                    onClick={() => navigate("/forgot-password")}
                    style={{ background: "none", border: "none", padding: 0, color: accent, fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}
                  >
                    Forgot password?
                  </button>
                </div>

                <PrimaryBtn
                  type="submit" loading={loading}
                  icon={<LogIn size={16} />}
                  label="Sign In" loadingLabel="Signing in…"
                  isDark={isDark}
                />
                <div style={{ height: 24 }} />
              </motion.form>
            ) : (
              <motion.div
                key="otp"
                initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.18 }}
                style={{ padding: "24px 24px 0" }}
              >
                <div style={{ textAlign: "center", marginBottom: 20 }}>
                  <div style={{
                    width: 60, height: 60, borderRadius: "50%",
                    background: twoFaHeadBg,
                    border: "1.5px solid rgba(22,163,74,0.20)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    margin: "0 auto 12px",
                  }}>
                    <Shield size={26} color="#16A34A" />
                  </div>
                  <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: twoFaTitleC, letterSpacing: "-0.02em" }}>
                    Two-Factor Auth
                  </h3>
                  <p style={{ margin: "8px 0 0", fontSize: 13.5, color: twoFaSubC, lineHeight: 1.6 }}>
                    {authStep === "SETUP_2FA"
                      ? "Scan the QR with Google Authenticator, then enter the 6-digit code"
                      : "Enter the 6-digit code from your Authenticator app"}
                  </p>
                </div>

                {authStep === "SETUP_2FA" && qrCode && (
                  <div style={{
                    textAlign: "center", marginBottom: 18, padding: 16,
                    background: qrBg, border: `1px solid ${qrBorder}`, borderRadius: 16,
                  }}>
                    <img
                      src={qrCode} alt="QR Code"
                      style={{ width: 180, height: 180, objectFit: "contain", margin: "0 auto", display: "block" }}
                    />
                  </div>
                )}

                <form onSubmit={handleOtpSubmit}>
                  <label style={{
                    display: "block", fontSize: 11.5, fontWeight: 700,
                    color: otpLabelC, textTransform: "uppercase",
                    letterSpacing: "0.06em", textAlign: "center", marginBottom: 10,
                  }}>
                    Verification Code
                  </label>
                  <OtpInput value={otp} onChange={setOtp} isDark={isDark} />
                  <div style={{ marginTop: 18 }}>
                    <PrimaryBtn
                      type="submit" loading={loading} disabled={otp.length !== 6}
                      label="Verify & Sign In" loadingLabel="Verifying…"
                      isDark={isDark}
                    />
                  </div>
                </form>

                <button
                  onClick={backToPassword}
                  style={{
                    width: "100%", background: "none", border: "none",
                    color: backBtnC, fontSize: 13, fontWeight: 500,
                    cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                    padding: "14px 0", fontFamily: "inherit",
                  }}
                >
                  <ArrowLeft size={14} /> Back to password login
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* footer */}
          <div style={{
            padding: "14px 24px",
            background: footerBg, borderTop: `1px solid ${footerBorder}`,
            textAlign: "center", fontSize: 12.5,
            color: isDark ? "#4A4A5A" : "#9E9EAD",
          }}>
            Don't have an account?{" "}
            <span style={{ color: accent, fontWeight: 600 }}>Contact your administrator</span>
          </div>
        </motion.div>

        <p style={{ textAlign: "center", marginTop: 20, color: copyrightC, fontSize: 12 }}>
          © {new Date().getFullYear()} Ringnex · All rights reserved
        </p>
      </div>

      

      <style>{`
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes spin    { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   Sub-components
   ══════════════════════════════════════════════════════ */

function AppLogo() {
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      width: 68, height: 68, borderRadius: 22,
      background: "linear-gradient(135deg,#5B5BD6,#818CF8)",
      boxShadow: "0 8px 28px rgba(91,91,214,0.32)",
    }}>
      <Layers size={30} color="#fff" strokeWidth={2} />
    </div>
  );
}

function BgBlobs({ isDark }: { isDark: boolean }) {
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
      <div style={{ position: "absolute", width: 380, height: 380, borderRadius: "50%", background: isDark ? "rgba(124,124,240,0.08)" : "rgba(91,91,214,0.10)", top: -100, left: -100, filter: "blur(60px)" }} />
      <div style={{ position: "absolute", width: 300, height: 300, borderRadius: "50%", background: isDark ? "rgba(129,140,248,0.07)" : "rgba(129,140,248,0.12)", bottom: -60, right: -60, filter: "blur(50px)" }} />
      <div style={{ position: "absolute", width: 180, height: 180, borderRadius: "50%", background: isDark ? "rgba(167,139,250,0.05)" : "rgba(167,139,250,0.08)", top: "40%", right: "20%", filter: "blur(40px)" }} />
    </div>
  );
}

function Field({ label, children, style = {}, isDark }: any) {
  return (
    <div style={style}>
      <label style={{
        display: "block", fontSize: 11.5, fontWeight: 700,
        color: isDark ? "#68687A" : "#9E9EAD",
        textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8,
      }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function IconInput({ icon, rightEl, isDark, ...props }: any) {
  const inputBg     = isDark ? "#1E1E28" : "#F8F9FB";
  const inputBorder = isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.10)";
  const inputColor  = isDark ? "#F0F0F5" : "#0D0D12";
  return (
    <div style={{ position: "relative" }}>
      <div style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", display: "flex" }}>
        {icon}
      </div>
      <input
        {...props}
        style={{
          width: "100%", boxSizing: "border-box",
          padding: rightEl ? "13px 44px 13px 40px" : "13px 14px 13px 40px",
          borderRadius: 12, border: `1px solid ${inputBorder}`,
          background: inputBg, outline: "none",
          fontSize: 14, color: inputColor,
          fontFamily: "'Inter',sans-serif",
          transition: "border 0.15s, box-shadow 0.15s, background 0.15s",
        }}
        onFocus={e => {
          e.target.style.borderColor  = isDark ? "rgba(124,124,240,0.60)" : "rgba(91,91,214,0.50)";
          e.target.style.boxShadow    = isDark ? "0 0 0 3px rgba(124,124,240,0.12)" : "0 0 0 3px rgba(91,91,214,0.10)";
          e.target.style.background   = isDark ? "#222230" : "#fff";
        }}
        onBlur={e => {
          e.target.style.borderColor  = inputBorder;
          e.target.style.boxShadow    = "none";
          e.target.style.background   = inputBg;
        }}
      />
      {rightEl && (
        <div style={{ position: "absolute", right: 13, top: "50%", transform: "translateY(-50%)" }}>
          {rightEl}
        </div>
      )}
    </div>
  );
}

function OtpInput({ value, onChange, isDark }: { value: string; onChange: (v: string) => void; isDark: boolean }) {
  const inputBg     = isDark ? "#1E1E28" : "#F8F9FB";
  const inputBorder = isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.10)";
  const inputColor  = isDark ? "#F0F0F5" : "#0D0D12";
  return (
    <input
      type="text" inputMode="numeric" maxLength={6} placeholder="● ● ● ● ● ●"
      value={value}
      onChange={e => onChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
      autoFocus
      style={{
        width: "100%", boxSizing: "border-box",
        padding: "16px", textAlign: "center",
        fontSize: 26, fontWeight: 700, letterSpacing: "0.5em",
        borderRadius: 14, border: `1px solid ${inputBorder}`,
        outline: "none", color: inputColor, background: inputBg,
        fontFamily: "ui-monospace,SFMono-Regular,Menlo,monospace",
        transition: "border 0.15s, box-shadow 0.15s",
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
  );
}

function PrimaryBtn({ label, loadingLabel, loading = false, disabled = false, icon = null, type = "button", onClick, isDark }: any) {
  const isDisabled = loading || disabled;
  return (
    <button
      type={type} onClick={onClick} disabled={isDisabled}
      style={{
        width: "100%", border: "none", borderRadius: 13, padding: "14px 16px",
        background: isDisabled
          ? (isDark ? "#2A2A3A" : "#C7C7E8")
          : "linear-gradient(135deg,#5B5BD6,#4747C2)",
        color: isDisabled ? (isDark ? "#4A4A5A" : "#fff") : "#fff",
        fontSize: 14.5, fontWeight: 700,
        cursor: isDisabled ? "not-allowed" : "pointer",
        display: "flex", alignItems: "center", justifyContent: "center", gap: 9,
        boxShadow: isDisabled ? "none" : "0 6px 20px rgba(91,91,214,0.32)",
        transition: "all 0.15s", fontFamily: "inherit",
      }}
    >
      {loading
        ? <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />{loadingLabel}</>
        : <>{icon}{label}</>
      }
    </button>
  );
}