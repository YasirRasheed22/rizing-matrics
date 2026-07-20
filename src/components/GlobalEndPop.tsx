// src/components/GlobalEndPop.tsx
// @ts-nocheck

import { useAuth } from "../context/AuthContext";
import { useCall } from "../context/CallContext";
import EndCallPopup from "./EndCallPopup";

function formatDateNice(isoString) {
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return "Invalid date";

  const day    = String(date.getDate()).padStart(2, "0");
  const month  = date.toLocaleString("en-US", { month: "short" });
  const year   = date.getFullYear();

  let hours    = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const ampm   = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;

  return `${day} ${month} ${year} ${String(hours).padStart(2, "0")}:${minutes} ${ampm}`;
}

export default function GlobalEndPop() {
  const call = useCall();

  const single = call?.callLogs?.[0] ?? {};

  if (!call?.endWindowScreen) return null;

  // Call-log socket event backend ke background work se 1-3s baad aata hai —
  // jab tak nahi aaya, "Loading…" dikhao (previous call ka data na dikhe).
  const logReady = !!(single?.sessionId && single?.number);

  return (
    <EndCallPopup
      leadId={1}
      callData={{
        contactName:            logReady ? (single?.contactName || "Unknown") : "Loading…",
        contactNumber:          logReady ? single?.number : "",
        contactNumberFormatted: logReady ? (single?.formatted || single?.number) : "…",
        startTime:              logReady ? formatDateNice(single?.startTime) : "…",
        endTime:                logReady ? formatDateNice(single?.endTime) : "…",
        durationSeconds:        logReady ? (single?.duration || 0) : 0,
        // BUG FIX: field ka naam `direction` hai — pehle `outbound` parh
        // raha tha jo kabhi exist nahi karta (popup mein direction gayab)
        direction:              logReady ? single?.direction : undefined,
      }}
      onClose={call.onEndPopClose}
      onCallEnded={call.onAfterSaveEndPopClose}
    />
  );
}
