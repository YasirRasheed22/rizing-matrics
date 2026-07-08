// src/components/WalletLowModal.tsx
// @ts-nocheck
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { API_URL } from "../main";
import io from "socket.io-client";

// ── Types ──────────────────────────────────────────────────────
interface WalletLowPayload {
  balance: number;
  isFrozen: boolean;
  message: string;
}

// ── Main Component ─────────────────────────────────────────────
export default function WalletLowModal() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [visible, setVisible]     = useState(false);
  const [payload, setPayload]     = useState<WalletLowPayload | null>(null);
  const [exiting, setExiting]     = useState(false);
  const [particles, setParticles] = useState<{ x: number; y: number; delay: number }[]>([]);

  // Only show to ADMIN
  const isAdmin = user?.role === "ADMIN";

  // Generate random particles once
  useEffect(() => {
    setParticles(
      Array.from({ length: 12 }, (_, i) => ({
        x: Math.random() * 100,
        y: Math.random() * 100,
        delay: i * 0.15,
      }))
    );
  }, []);

  // Socket listener
  useEffect(() => {
    if (!isAdmin) return;

    const socket = io(API_URL, { transports: ["websocket"], autoConnect: true });

    // ✅ FIX #1: Changed from "wallet_low" to "company:wallet_low"
    socket.on("company:wallet_low", (data: WalletLowPayload) => {
      setPayload(data);
      setExiting(false);
      setVisible(true);
    });

    return () => { socket.disconnect(); };
  }, [isAdmin]);

  const handleClose = useCallback(() => {
    setExiting(true);
    setTimeout(() => {
      setVisible(false);
      setExiting(false);
    }, 380);
  }, []);

  const handleTopup = useCallback(() => {
    handleClose();
    setTimeout(() => navigate("/admin/settings/billing"), 400);
  }, [handleClose, navigate]);

  // ESC key
  useEffect(() => {
    if (!visible) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") handleClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [visible, handleClose]);

  if (!isAdmin || !visible) return null;

  const isFrozen = payload?.isFrozen ?? false;
  const balance  = payload?.balance ?? 0;

  // ── Color scheme based on state ──
  const accent    = isFrozen ? "#EF4444" : "#F59E0B";
  const accentDim = isFrozen ? "rgba(239,68,68,0.15)" : "rgba(245,158,11,0.15)";
  const accentBorder = isFrozen ? "rgba(239,68,68,0.35)" : "rgba(245,158,11,0.35)";
  const glowColor = isFrozen ? "rgba(239,68,68,0.20)" : "rgba(245,158,11,0.18)";

  return (
    <>
      <style>{`
        @keyframes wl-backdrop-in {
          from { opacity: 0; backdrop-filter: blur(0px); }
          to   { opacity: 1; backdrop-filter: blur(12px); }
        }
        @keyframes wl-backdrop-out {
          from { opacity: 1; backdrop-filter: blur(12px); }
          to   { opacity: 0; backdrop-filter: blur(0px); }
        }
        @keyframes wl-modal-in {
          from { opacity: 0; transform: translate(-50%, -46%) scale(0.88); }
          to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
        @keyframes wl-modal-out {
          from { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          to   { opacity: 0; transform: translate(-50%, -54%) scale(0.88); }
        }
        @keyframes wl-icon-pulse {
          0%,100% { transform: scale(1);   box-shadow: 0 0 0 0 ${glowColor}; }
          50%     { transform: scale(1.07); box-shadow: 0 0 0 14px transparent; }
        }
        @keyframes wl-shake {
          0%,100% { transform: translateX(0); }
          15%     { transform: translateX(-5px); }
          30%     { transform: translateX(5px); }
          45%     { transform: translateX(-4px); }
          60%     { transform: translateX(4px); }
          75%     { transform: translateX(-2px); }
          90%     { transform: translateX(2px); }
        }
        @keyframes wl-particle {
          0%   { opacity: 0; transform: scale(0) translateY(0); }
          20%  { opacity: 1; }
          100% { opacity: 0; transform: scale(1) translateY(-40px); }
        }
        @keyframes wl-bar-fill {
          from { width: 0%; }
          to   { width: var(--bar-width); }
        }
        @keyframes wl-number-count {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes wl-badge-pop {
          0%   { transform: scale(0) rotate(-12deg); opacity: 0; }
          60%  { transform: scale(1.15) rotate(3deg); opacity: 1; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        .wl-close-btn:hover { background: rgba(255,255,255,0.12) !important; }
        .wl-topup-btn:hover { filter: brightness(1.10); transform: translateY(-1px); box-shadow: 0 8px 24px ${glowColor} !important; }
        .wl-dismiss-btn:hover { background: rgba(255,255,255,0.08) !important; }
      `}</style>

      {/* ── Backdrop ── */}
      <div
        onClick={handleClose}
        style={{
          position: "fixed", inset: 0, zIndex: 99997,
          background: "rgba(0,0,0,0.55)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          animation: `${exiting ? "wl-backdrop-out" : "wl-backdrop-in"} 0.38s ease forwards`,
        }}
      />

      {/* ── Modal ── */}
      <div
        style={{
          position: "fixed", top: "50%", left: "50%",
          zIndex: 99998,
          width: "min(460px, calc(100vw - 32px))",
          animation: `${exiting ? "wl-modal-out" : "wl-modal-in"} 0.38s cubic-bezier(0.34,1.56,0.64,1) forwards`,
          fontFamily: "'DM Sans', 'Inter', -apple-system, sans-serif",
        }}
      >
        {/* Glass card */}
        <div style={{
          background: "linear-gradient(145deg, rgba(18,18,24,0.98) 0%, rgba(10,10,16,0.99) 100%)",
          borderRadius: 24,
          border: `1px solid ${accentBorder}`,
          boxShadow: `0 32px 80px rgba(0,0,0,0.70), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.06)`,
          overflow: "hidden",
          position: "relative",
        }}>

          {/* ── Glow top bar ── */}
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, height: 3,
            background: `linear-gradient(90deg, transparent 0%, ${accent} 40%, ${accent} 60%, transparent 100%)`,
            opacity: 0.9,
          }} />

          {/* ── Ambient glow ── */}
          <div style={{
            position: "absolute", top: -60, left: "50%", transform: "translateX(-50%)",
            width: 300, height: 300, borderRadius: "50%",
            background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`,
            pointerEvents: "none",
          }} />

          {/* ── Particles ── */}
          {isFrozen && particles.map((p, i) => (
            <div key={i} style={{
              position: "absolute",
              left: `${p.x}%`, top: `${p.y}%`,
              width: 4, height: 4, borderRadius: "50%",
              background: accent, opacity: 0,
              animation: `wl-particle 2.5s ease ${p.delay}s infinite`,
              pointerEvents: "none",
            }} />
          ))}

          {/* ── Close button ── */}
          <button
            onClick={handleClose}
            className="wl-close-btn"
            style={{
              position: "absolute", top: 16, right: 16,
              width: 32, height: 32, borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.09)",
              background: "rgba(255,255,255,0.05)",
              color: "rgba(255,255,255,0.45)",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", fontSize: 16, lineHeight: 1,
              transition: "background 0.15s",
              zIndex: 10,
            }}
          >
            ×
          </button>

          {/* ── Content ── */}
          <div style={{ padding: "32px 28px 28px" }}>

            {/* Icon + badge */}
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
              <div style={{ position: "relative" }}>
                <div style={{
                  width: 72, height: 72, borderRadius: 20,
                  background: accentDim,
                  border: `1.5px solid ${accentBorder}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 32,
                  animation: "wl-icon-pulse 2s ease-in-out infinite",
                  boxShadow: `0 0 0 0 ${glowColor}`,
                }}>
                  {isFrozen ? "❄️" : "⚠️"}
                </div>
                {/* Badge */}
                <div style={{
                  position: "absolute", top: -8, right: -10,
                  background: accent, color: "#000",
                  fontSize: 9, fontWeight: 800, letterSpacing: "0.05em",
                  padding: "3px 7px", borderRadius: 99,
                  textTransform: "uppercase",
                  animation: "wl-badge-pop 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.2s both",
                  boxShadow: `0 2px 8px ${glowColor}`,
                }}>
                  {isFrozen ? "FROZEN" : "LOW"}
                </div>
              </div>
            </div>

            {/* Title */}
            <h2 style={{
              margin: "0 0 8px",
              fontSize: 22, fontWeight: 800, letterSpacing: "-0.03em",
              color: "#F5F5F7", textAlign: "center",
              animation: "wl-shake 0.6s ease 0.3s both",
            }}>
              {isFrozen ? "Wallet Frozen" : "Balance Running Low"}
            </h2>

            {/* Subtitle */}
            <p style={{
              margin: "0 0 24px",
              fontSize: 14, color: "rgba(255,255,255,0.50)",
              textAlign: "center", lineHeight: 1.6,
            }}>
              {isFrozen
                ? "Outbound calls and messages have been disabled. Top up to resume service."
                : "Your wallet balance is critically low. Top up to avoid service interruption."}
            </p>

            {/* Balance display */}
            <div style={{
              margin: "0 0 20px",
              padding: "16px 20px",
              borderRadius: 14,
              background: "rgba(255,255,255,0.04)",
              border: `1px solid rgba(255,255,255,0.07)`,
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
                  Current Balance
                </div>
                <div style={{
                  fontSize: 28, fontWeight: 800, letterSpacing: "-0.04em",
                  color: balance < 0 ? "#EF4444" : "#F5F5F7",
                  fontVariantNumeric: "tabular-nums",
                  animation: "wl-number-count 0.4s ease 0.1s both",
                }}>
                  {balance < 0 ? "-" : ""}${Math.abs(balance).toFixed(4)}
                  <span style={{ fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.35)", marginLeft: 4 }}>USD</span>
                </div>
              </div>

              {/* Status pill */}
              <div style={{
                padding: "6px 14px", borderRadius: 99,
                background: accentDim,
                border: `1px solid ${accentBorder}`,
                fontSize: 11, fontWeight: 800,
                color: accent, letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}>
                {isFrozen ? "● Frozen" : "● Low"}
              </div>
            </div>

            {/* Balance bar */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.30)", fontWeight: 500 }}>
                  Limit: -$5.00
                </span>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.30)", fontWeight: 500 }}>
                  Free: $10.00
                </span>
              </div>
              <div style={{
                height: 6, borderRadius: 99,
                background: "rgba(255,255,255,0.06)",
                overflow: "hidden",
              }}>
                <div style={{
                  height: "100%", borderRadius: 99,
                  background: isFrozen
                    ? "linear-gradient(90deg, #EF4444, #F87171)"
                    : "linear-gradient(90deg, #F59E0B, #FCD34D)",
                  // clamp between 0 and 100
                  width: `${Math.max(0, Math.min(100, ((balance + 5) / 15) * 100))}%`,
                  transition: "width 1s cubic-bezier(0.4,0,0.2,1)",
                  boxShadow: `0 0 8px ${accent}80`,
                }} />
              </div>
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: "rgba(255,255,255,0.06)", marginBottom: 20 }} />

            {/* Buttons */}
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={handleClose}
                className="wl-dismiss-btn"
                style={{
                  flex: 1, padding: "12px 0", borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.09)",
                  background: "rgba(255,255,255,0.05)",
                  color: "rgba(255,255,255,0.55)",
                  fontSize: 13, fontWeight: 600, cursor: "pointer",
                  fontFamily: "inherit", transition: "background 0.15s",
                }}
              >
                Dismiss
              </button>
              <button
                onClick={handleTopup}
                className="wl-topup-btn"
                style={{
                  flex: 2, padding: "12px 0", borderRadius: 12,
                  border: "none",
                  background: isFrozen
                    ? "linear-gradient(135deg, #EF4444 0%, #DC2626 100%)"
                    : "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)",
                  color: "#000",
                  fontSize: 13, fontWeight: 800, cursor: "pointer",
                  fontFamily: "inherit",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  transition: "filter 0.15s, transform 0.15s, box-shadow 0.15s",
                  boxShadow: `0 4px 16px ${glowColor}`,
                  letterSpacing: "-0.01em",
                }}
              >
                <span style={{ fontSize: 16 }}>💳</span>
                Top Up Wallet
                <span style={{ fontSize: 13, opacity: 0.7 }}>→</span>
              </button>
            </div>

            {/* Footer note */}
            <p style={{
              margin: "14px 0 0",
              fontSize: 11, color: "rgba(255,255,255,0.22)",
              textAlign: "center", lineHeight: 1.5,
            }}>
              Press <kbd style={{ background: "rgba(255,255,255,0.08)", padding: "1px 5px", borderRadius: 4, fontSize: 10 }}>ESC</kbd> to dismiss · Calls resume automatically after top-up
            </p>
          </div>
        </div>
      </div>
    </>
  );
}