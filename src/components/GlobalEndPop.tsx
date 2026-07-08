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

  return (
    <EndCallPopup
      leadId={1}
      callData={{
        contactName:            single?.contactName || "Unknown",
        contactNumber:          single?.number,
        contactNumberFormatted: single?.formatted || single?.number,
        startTime:              formatDateNice(single?.startTime),
        endTime:                formatDateNice(single?.endTime),
        durationSeconds:        single?.duration || 0,
        direction:              single?.outbound,
      }}
      onClose={call.onEndPopClose}
      onCallEnded={call.onAfterSaveEndPopClose}
    />
  );
}
