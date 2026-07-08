// src/components/IncomingModalAllOver.tsx
import { Phone, PhoneOff, ArrowRightLeft } from "lucide-react";

interface Props {
  show: boolean;
  from?: string;
  customerName?: string;
  isTransfer?: boolean;
  transferFrom?: string;
  onAccept: () => void;
  onReject: () => void;
}

const formatPhone = (num: string) => {
  if (!num) return "Unknown Number";
  const cleaned = num.replace(/\D/g, "");
  if (cleaned.length === 10)
    return cleaned.replace(/(\d{3})(\d{3})(\d{4})/, "($1) $2-$3");
  if (cleaned.length === 11 && cleaned.startsWith("1"))
    return cleaned.replace(/(\d{1})(\d{3})(\d{3})(\d{4})/, "+$1 ($2) $3-$4");
  return num;
};

const getInitials = (name: string) =>
  (name || "?")
    .trim()
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

export default function IncomingModalAllOver({
  show,
  from = "",
  customerName = "Unknown Caller",
  isTransfer = false,
  transferFrom,
  onAccept,
  onReject,
}: Props) {
  if (!show) return null;

  const displayName = customerName || "Unknown Caller";
  const initials    = getInitials(displayName);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.38)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        animation: "fade-in 180ms ease both",
      }}
    >
      {/* Card */}
      <div
        style={{
          width: "100%",
          maxWidth: 340,
          background: "rgba(255,255,255,0.92)",
          backdropFilter: "blur(24px) saturate(180%)",
          WebkitBackdropFilter: "blur(24px) saturate(180%)",
          border: "1px solid rgba(255,255,255,0.60)",
          borderRadius: 28,
          boxShadow: "0 24px 80px rgba(0,0,0,0.18), 0 0 0 1px rgba(255,255,255,0.55)",
          overflow: "hidden",
          animation: "scale-in 220ms cubic-bezier(0.16,1,0.3,1) both",
        }}
      >
        {/* Avatar section */}
        <div
          style={{
            padding: "36px 28px 24px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 4,
            background: isTransfer
              ? "linear-gradient(160deg, #FFFBEB 0%, #FEF3C7 100%)"
              : "linear-gradient(160deg, #EDEDFB 0%, #E2E2FA 100%)",
          }}
        >
          {/* Pulse rings */}
          <div style={{ position: "relative", width: 88, height: 88, marginBottom: 16 }}>
            {/* Outer ring */}
            <div
              style={{
                position: "absolute",
                inset: -12,
                borderRadius: "50%",
                background: isTransfer
                  ? "rgba(217,119,6,0.14)"
                  : "rgba(91,91,214,0.14)",
                animation: "pulse-ring 2s ease-out infinite",
              }}
            />
            {/* Inner ring */}
            <div
              style={{
                position: "absolute",
                inset: -4,
                borderRadius: "50%",
                background: isTransfer
                  ? "rgba(217,119,6,0.10)"
                  : "rgba(91,91,214,0.10)",
                animation: "pulse-ring 2s ease-out 0.5s infinite",
              }}
            />
            {/* Avatar */}
            <div
              style={{
                width: 88,
                height: 88,
                borderRadius: "50%",
                background: isTransfer ? "#FEF3C7" : "#EDEDFB",
                border: `2px solid ${isTransfer ? "rgba(217,119,6,0.25)" : "rgba(91,91,214,0.20)"}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 30,
                fontWeight: 700,
                color: isTransfer ? "#92400E" : "#5B5BD6",
                boxShadow: isTransfer
                  ? "0 4px 20px rgba(217,119,6,0.18)"
                  : "0 4px 20px rgba(91,91,214,0.18)",
              }}
            >
              {initials}
            </div>
          </div>

          {/* Label pill */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              background: isTransfer ? "rgba(217,119,6,0.10)" : "rgba(91,91,214,0.10)",
              color: isTransfer ? "#92400E" : "#5B5BD6",
              borderRadius: 9999,
              padding: "3px 12px",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.5px",
              textTransform: "uppercase",
            }}
          >
            {isTransfer ? (
              <><ArrowRightLeft size={11} /> Transfer</>
            ) : (
              <>
                {/* tiny pulsing dot */}
                <span
                  style={{
                    width: 6, height: 6,
                    borderRadius: "50%",
                    background: "#5B5BD6",
                    display: "inline-block",
                    animation: "pulse-ring 1.4s ease-out infinite",
                  }}
                />
                Incoming Call
              </>
            )}
          </div>
        </div>

        {/* Info */}
        <div style={{ padding: "20px 28px 8px", textAlign: "center" }}>
          <div
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: "#0D0D12",
              letterSpacing: "-0.4px",
              marginBottom: 4,
              lineHeight: 1.25,
            }}
          >
            {displayName}
          </div>
          <div
            style={{
              fontSize: 13.5,
              color: "#6B6B7B",
              fontFamily: "monospace",
              letterSpacing: "0.5px",
            }}
          >
            {formatPhone(from)}
          </div>

          {isTransfer && transferFrom && (
            <div
              style={{
                marginTop: 12,
                background: "#FFFBEB",
                border: "1px solid rgba(217,119,6,0.18)",
                borderRadius: 10,
                padding: "8px 14px",
                fontSize: 12,
                color: "#92400E",
                fontWeight: 500,
              }}
            >
              Transferred from <strong>{transferFrom}</strong>
            </div>
          )}
        </div>

        {/* Actions */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 40,
            padding: "20px 28px 28px",
          }}
        >
          {/* Decline */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 7 }}>
            <button
              onClick={onReject}
              style={{
                width: 60, height: 60,
                borderRadius: "50%",
                background: "#FEE2E2",
                border: "1.5px solid rgba(208,40,26,0.18)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "all 140ms ease",
                boxShadow: "0 4px 16px rgba(208,40,26,0.18)",
                color: "#D0281A",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "#D0281A";
                (e.currentTarget as HTMLButtonElement).style.color = "#fff";
                (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.08)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "#FEE2E2";
                (e.currentTarget as HTMLButtonElement).style.color = "#D0281A";
                (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
              }}
            >
              <PhoneOff size={22} />
            </button>
            <span style={{ fontSize: 11, color: "#9E9EAD", fontWeight: 500 }}>Decline</span>
          </div>

          {/* Accept */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 7 }}>
            <button
              onClick={onAccept}
              style={{
                width: 60, height: 60,
                borderRadius: "50%",
                background: "#DCFCE7",
                border: "1.5px solid rgba(23,163,99,0.20)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "all 140ms ease",
                boxShadow: "0 4px 16px rgba(23,163,99,0.20)",
                color: "#17A363",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "#17A363";
                (e.currentTarget as HTMLButtonElement).style.color = "#fff";
                (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.08)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "#DCFCE7";
                (e.currentTarget as HTMLButtonElement).style.color = "#17A363";
                (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
              }}
            >
              <Phone size={22} />
            </button>
            <span style={{ fontSize: 11, color: "#9E9EAD", fontWeight: 500 }}>Answer</span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fade-in   { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scale-in  { from { opacity: 0; transform: scale(0.92); } to { opacity: 1; transform: scale(1); } }
        @keyframes pulse-ring {
          0%  { transform: scale(0.85); opacity: 0.6; }
          70% { transform: scale(1.5);  opacity: 0;   }
          100%{ transform: scale(0.85); opacity: 0;   }
        }
      `}</style>
    </div>
  );
}
