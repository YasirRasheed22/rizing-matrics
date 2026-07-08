// components/IncomingCallModal.tsx
// @ts-nocheck

import { Phone, PhoneOff } from "lucide-react";

interface Props {
  show: boolean;
  from: string;
  customerName?: string;
  isTransfer?: boolean;
  transferFrom?: string;
  onAccept: () => void;
  onReject: () => void;
}

export default function IncomingCallModal({
  show,
  from,
  customerName = "Unknown Caller",
  isTransfer = false,
  transferFrom,
  onAccept,
  onReject,
}: Props) {
  if (!show) return null;

  const formatPhone = (num: string) => {
    if (!num) return "";
    return num.replace(/(\d{3})(\d{3})(\d{4})/, "($1) $2-$3");
  };

  const displayName = customerName || "Unknown";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      {/* MEDIUM SIZE CARD - Perfect RingCentral style */}
      <div className="w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl">
        {/* Top Colored Section - Slightly smaller */}
        <div className={`h-48 ${isTransfer ? "bg-amber-600" : "bg-amber-700"} relative flex items-center justify-center`}>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 rounded-full bg-white shadow-xl flex items-center justify-center">
            <span className="text-4xl font-bold text-amber-700">
              {initials || "U"}
            </span>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="pt-16 pb-8 px-6 text-center bg-white">
          <h2 className="text-2xl font-bold text-gray-900 mb-1 text-black">
            {displayName}
          </h2>

          <p className="text-lg text-gray-600 font-medium mb-3">
            {formatPhone(from)}
          </p>

          {isTransfer && transferFrom && (
            <p className="text-sm text-amber-700 font-medium mb-6">
              Transferred from Agent {transferFrom}
            </p>
          )}

          {/* Small Action Buttons */}
          <div className="flex justify-center gap-5 mb-10">
            {["Listen", "Block", "Ignore", "More"].map((label) => (
              <button
                key={label}
                className="flex flex-col items-center text-gray-500 hover:text-gray-700 transition"
              >
                {/* <div className="w-11 h-11 rounded-full bg-gray-100 flex items-center justify-center mb-1">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="3" />
                    <circle cx="12" cy="5" r="2" opacity="0.5" />
                    <circle cx="12" cy="19" r="2" opacity="0.5" />
                  </svg>
                </div> */}
                {/* <span className="text-xs">{label}</span> */}
              </button>
            ))}
          </div>

          {/* Accept & Decline Buttons */}
          <div className="flex justify-center gap-16">
            <button
              onClick={onReject}
              className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 active:scale-95 transition-all shadow-xl flex items-center justify-center"
            >
              <PhoneOff className="w-9 h-9 text-white rotate-135" />
            </button>

            <button
              onClick={onAccept}
              className="w-16 h-16 rounded-full bg-green-600 hover:bg-green-700 active:scale-95 transition-all shadow-xl flex items-center justify-center"
            >
              <Phone className="w-9 h-9 text-white" />
            </button>
          </div>

          <div className="flex justify-center gap-24 mt-3">
            <span className="text-sm text-gray-600 font-medium">Decline</span>
            <span className="text-sm text-gray-600 font-medium">Answer</span>
          </div>
        </div>
      </div>
    </div>
  );
}