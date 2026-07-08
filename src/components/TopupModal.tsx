// components/TopupModal.tsx
// @ts-nocheck

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CreditCard, AlertTriangle, CheckCircle, Zap } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import api from "../api";

// ── Stripe init ──────────────────────────────────────────────
const stripePromise = loadStripe(
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "pk_test_51JUvs3Ez6N9aRY9tQxKEHbBy48jruOvneLZ6tXv0X3kzXTNlLsm39Q4rYPv4anI7VGCkSRn39RXh5ehqvl2hzg2Q00plpWBesZ"
);

// ── Types ────────────────────────────────────────────────────
interface TopupModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (amount: number) => void;
}

// ── Inner Form (needs Stripe context) ───────────────────────
interface TopupFormProps {
  onSuccess: (amount: number) => void;
  onClose: () => void;
  isDark: boolean;
  // design tokens passed in so form shares same palette
  tokens: ReturnType<typeof buildTokens>;
}

function buildTokens(isDark: boolean) {
  return {
    textPrimary:   isDark ? "#F0F0F5"               : "#0D0D12",
    textSecondary: isDark ? "#A0A0B0"               : "#6B6B7B",
    textMuted:     isDark ? "#68687A"               : "#9E9EAD",
    textLabel:     isDark ? "#C0C0D0"               : "#374151",
    accentMain:    isDark ? "#7C7CF0"               : "#5B5BD6",
    accentGrad:    isDark ? "#5B5BD6"               : "#7C7CF0",
    inputBg:       isDark ? "rgba(30,30,42,0.90)"   : "#F6F7F9",
    inputBorder:   isDark ? "rgba(255,255,255,0.10)": "#D0D5DD",
    inputColor:    isDark ? "#F0F0F5"               : "#344054",
    modalBg:       isDark ? "#17171F"               : "#fff",
    headerBorder:  isDark ? "rgba(255,255,255,0.07)": "#EAECF0",
    divider:       isDark ? "rgba(255,255,255,0.06)": "rgba(0,0,0,0.06)",
    sectionColor:  isDark ? "#68687A"               : "#6B7280",
    sectionBorder: isDark ? "rgba(255,255,255,0.06)": "#F2F4F7",
    cancelBg:      isDark ? "#1E1E28"               : "#fff",
    cancelBorder:  isDark ? "rgba(255,255,255,0.10)": "#D0D5DD",
    cancelColor:   isDark ? "#C0C0D0"               : "#344054",
    presetActiveBg:isDark ? "rgba(124,124,240,0.15)": "rgba(91,91,214,0.10)",
    overlayBg:     isDark ? "rgba(0,0,0,0.55)"      : "rgba(0,0,0,0.35)",
    errorBg:       isDark ? "rgba(208,40,26,0.12)"  : "#FEE2E2",
  };
}

const PRESETS = ["10", "25", "50", "100", "200","500","1000","5000"];

function TopupForm({ onSuccess, onClose, isDark, tokens: t }: TopupFormProps) {
  const stripe   = useStripe();
  const elements = useElements();
  const [amount, setAmount]   = useState("50");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const inputStyle: React.CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    padding: "10px 13px",
    border: `1px solid ${t.inputBorder}`,
    borderRadius: 9,
    fontSize: 13,
    color: t.inputColor,
    background: t.inputBg,
    outline: "none",
    transition: "border-color 0.15s, box-shadow 0.15s",
    fontFamily: "inherit",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 12,
    fontWeight: 600,
    color: t.textLabel,
    marginBottom: 5,
    letterSpacing: "0.01em",
  };

  const sectionTitle: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 700,
    color: t.sectionColor,
    textTransform: "uppercase" as const,
    letterSpacing: "0.07em",
    marginBottom: 14,
    paddingBottom: 10,
    borderBottom: `1px solid ${t.sectionBorder}`,
  };

  const cardElementOptions = {
    style: {
      base: {
        fontSize: "13px",
        color: t.inputColor,
        fontFamily: "'Inter', -apple-system, sans-serif",
        "::placeholder": { color: isDark ? "#3A3A4A" : "#B0B0C8" },
        backgroundColor: "transparent",
      },
      invalid: { color: "#D0281A" },
    },
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = isDark ? "rgba(124,124,240,0.6)" : "#5B5BD6";
    e.target.style.boxShadow   = isDark
      ? "0 0 0 3px rgba(124,124,240,0.12)"
      : "0 0 0 3px rgba(37,99,235,0.10)";
  };
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = t.inputBorder;
    e.target.style.boxShadow   = "none";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    const amtNum = parseFloat(amount);
    if (!amtNum || amtNum < 5) {
      setError("Minimum top-up is $5.00");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.post("/auth/topup/create-intent", { amount: amtNum });
      const { clientSecret } = data.data;
      const cardElement = elements.getElement(CardElement);
      const { error: stripeErr, paymentIntent } = await stripe.confirmCardPayment(
        clientSecret,
        { payment_method: { card: cardElement! } }
      );
      if (stripeErr) {
        setError(stripeErr.message || "Payment failed");
        return;
      }
      if (paymentIntent?.status === "succeeded") {
        onSuccess(amtNum);
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || "Payment failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* ── Amount Section ── */}
      <div style={sectionTitle}>Select Amount (USD)</div>
      <div style={{ marginBottom: 24 }}>
        {/* Preset buttons */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          {PRESETS.map((p) => (
            <motion.button
              type="button"
              key={p}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => setAmount(p)}
              style={{
                padding: "8px 18px",
                borderRadius: 9,
                border: `1px solid ${amount === p ? t.accentMain : t.inputBorder}`,
                background: amount === p ? t.presetActiveBg : t.inputBg,
                color: amount === p ? t.accentMain : t.textPrimary,
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "all 0.12s",
              }}
            >
              ${p}
            </motion.button>
          ))}
        </div>

        {/* Custom amount */}
        <div>
          <label style={labelStyle}>Custom Amount</label>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: t.inputBg,
              borderRadius: 9,
              border: `1px solid ${t.inputBorder}`,
              padding: "0 13px",
              transition: "border-color 0.15s, box-shadow 0.15s",
            }}
            onFocus={() => {}}
          >
            <span style={{ fontSize: 14, fontWeight: 700, color: t.textMuted }}>$</span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="5"
              step="1"
              placeholder="Enter amount"
              onFocus={handleFocus}
              onBlur={handleBlur}
              style={{
                flex: 1,
                border: "none",
                background: "transparent",
                fontSize: 13,
                fontWeight: 700,
                color: t.textPrimary,
                outline: "none",
                fontFamily: "inherit",
                padding: "10px 0",
              }}
            />
            <span style={{ fontSize: 11, color: t.textMuted, fontWeight: 600 }}>USD</span>
          </div>
        </div>
      </div>

      {/* ── Card Details Section ── */}
      <div style={sectionTitle}>Card Details</div>
      <div style={{ marginBottom: 24 }}>
        <div
          style={{
            background: t.inputBg,
            borderRadius: 9,
            border: `1px solid ${t.inputBorder}`,
            padding: "12px 13px",
          }}
        >
          <CardElement options={cardElementOptions} />
        </div>
        <p
          style={{
            margin: "8px 0 0",
            fontSize: 11,
            color: t.textMuted,
            display: "flex",
            alignItems: "center",
            gap: 5,
          }}
        >
          <span>🔒</span> Secured by Stripe. Your card details are never stored.
        </p>
      </div>

      {/* ── Error ── */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{
              marginBottom: 16,
              padding: "10px 14px",
              borderRadius: 9,
              background: t.errorBg,
              border: "1px solid rgba(208,40,26,0.25)",
              color: "#D0281A",
              fontSize: 13,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <AlertTriangle size={14} style={{ flexShrink: 0 }} />
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Footer Buttons ── */}
      <div
        style={{
          borderTop: `1px solid ${t.headerBorder}`,
          paddingTop: 16,
          display: "flex",
          gap: 10,
        }}
      >
        <motion.button
          type="button"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={onClose}
          style={{
            flex: 1,
            padding: "10px",
            borderRadius: 9,
            border: `1px solid ${t.cancelBorder}`,
            background: t.cancelBg,
            fontSize: 13,
            fontWeight: 600,
            color: t.cancelColor,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          Cancel
        </motion.button>

        <motion.button
          type="submit"
          disabled={loading || !stripe}
          whileHover={
            !loading
              ? {
                  scale: 1.02,
                  boxShadow: isDark
                    ? "0 4px 16px rgba(124,124,240,0.35)"
                    : "0 4px 16px rgba(37,99,235,0.30)",
                }
              : {}
          }
          whileTap={!loading ? { scale: 0.97 } : {}}
          style={{
            flex: 2,
            padding: "10px",
            borderRadius: 9,
            border: "none",
            background: loading
              ? isDark
                ? "rgba(124,124,240,0.30)"
                : "rgba(91,91,214,0.40)"
              : t.accentMain,
            color: "#fff",
            fontSize: 13,
            fontWeight: 600,
            cursor: loading ? "wait" : "pointer",
            fontFamily: "inherit",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 7,
            boxShadow: loading
              ? "none"
              : isDark
              ? "0 1px 3px rgba(124,124,240,0.40)"
              : "0 1px 3px rgba(37,99,235,0.35)",
          }}
        >
          {loading ? (
            <>
              <span
                style={{
                  width: 14,
                  height: 14,
                  border: "2px solid rgba(255,255,255,0.4)",
                  borderTopColor: "#fff",
                  borderRadius: "50%",
                  display: "inline-block",
                  animation: "spin 0.8s linear infinite",
                }}
              />
              Processing…
            </>
          ) : (
            <>
              <CreditCard size={14} />
              Pay ${parseFloat(amount || "0").toFixed(2)}
            </>
          )}
        </motion.button>
      </div>
    </form>
  );
}

// ── Main Export ──────────────────────────────────────────────
export const TopupModal: React.FC<TopupModalProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const t = buildTokens(isDark);

  const handleSuccess = (amount: number) => {
    onClose();
    onSuccess?.(amount);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* ── Backdrop ── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: "fixed",
              inset: 0,
              background: t.overlayBg,
              zIndex: 1040,
              backdropFilter: "blur(3px)",
            }}
          />

          {/* ── Centering wrapper ── */}
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 1050,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "20px",
              pointerEvents: "none",
            }}
          >
            {/* ── Modal ── */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 20 }}
              transition={{ type: "spring", damping: 26, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: "min(480px, 100%)",
                maxHeight: "90vh",
                background: t.modalBg,
                borderRadius: 16,
                display: "flex",
                flexDirection: "column",
                fontFamily: "'Inter', -apple-system, sans-serif",
                boxShadow: isDark
                  ? "0 24px 64px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.06)"
                  : "0 24px 64px rgba(0,0,0,0.18)",
                overflow: "hidden",
                pointerEvents: "all",
              }}
            >
              {/* ── Modal Header ── */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "20px 24px",
                  borderBottom: `1px solid ${t.headerBorder}`,
                  flexShrink: 0,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 11,
                      background: isDark
                        ? "rgba(124,124,240,0.15)"
                        : "rgba(91,91,214,0.10)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <CreditCard size={18} color={t.accentMain} />
                  </div>
                  <div>
                    <h2
                      style={{
                        fontSize: 17,
                        fontWeight: 700,
                        color: t.textPrimary,
                        margin: 0,
                        letterSpacing: "-0.02em",
                      }}
                    >
                      Top Up Wallet
                    </h2>
                    <p
                      style={{
                        fontSize: 12,
                        color: t.textMuted,
                        margin: "2px 0 0",
                      }}
                    >
                      Add funds via Stripe
                    </p>
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.92 }}
                  onClick={onClose}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    border: `1px solid ${t.headerBorder}`,
                    background: isDark ? "rgba(255,255,255,0.05)" : "#F9FAFB",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                  }}
                >
                  <X size={15} style={{ color: isDark ? "#A0A0B0" : "#667085" }} />
                </motion.button>
              </div>

              {/* ── Scrollable Body ── */}
              <div
                style={{
                  flex: 1,
                  overflowY: "auto",
                  padding: "24px",
                  background: t.modalBg,
                }}
              >
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                <Elements stripe={stripePromise}>
                  <TopupForm
                    onSuccess={handleSuccess}
                    onClose={onClose}
                    isDark={isDark}
                    tokens={t}
                  />
                </Elements>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

export default TopupModal;