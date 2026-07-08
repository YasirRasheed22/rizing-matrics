// components/IncomingCallModal.tsx
import { Phone, PhoneOff } from "lucide-react";

interface Props {
  show: boolean;
  from?: string;
  customerName?: string;
  isTransfer?: boolean;
  transferFrom?: string;
  onAccept: () => void;
  onReject: () => void;
}

export default function IncomingCallWindow({
  show,
  from = "",
  customerName = "Unknown Caller",
  isTransfer = false,
  transferFrom,
  onAccept,
  onReject,
}: Props) {
  if (!show) return null;

  const formatPhone = (num: string) => {
    if (!num) return "Unknown Number";
    const cleaned = num.replace(/\D/g, "");
    if (cleaned.length === 10) {
      return cleaned.replace(/(\d{3})(\d{3})(\d{4})/, "($1) $2-$3");
    }
    if (cleaned.length === 11 && cleaned.startsWith("1")) {
      return cleaned.replace(/(\d{1})(\d{3})(\d{3})(\d{4})/, "+$1 ($2) $3-$4");
    }
    return num;
  };

  const displayName = customerName || "Unknown Caller";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col  p-2">
    <div className="w-full max-w-md  rounded-2xl  overflow-hidden">

      {/* Top colored section with avatar */}
      <div
        className={`h-64 flex flex-col items-center justify-center relative ${
          isTransfer ? "bg-amber-600" : "bg-ringnex"
        }`}
      >
        <div className="w-32 h-32 rounded-full bg-white flex items-center justify-center shadow-lg ring-8 ring-white/40">
          <span className="text-5xl font-bold text-black">
            {initials}
          </span>
        </div>
      </div>

      {/* Main content */}
      <div className="px-8 py-10 text-center ">
        <p className="text-sm font-semibold uppercase tracking-wide text-black-600 mb-3 mt-2">
          Incoming Call
        </p>

        <h1 className="text-black text-3xl font-bold text-gray-900 mb-2">
          {displayName}
        </h1>

        <p className="text-xl text-gray-600 mb-8">
          {formatPhone(from)}
        </p>

        {isTransfer && transferFrom && (
          <div className="mb-8 bg-amber-50 rounded-lg px-4 py-3">
            <p className="text-sm font-medium text-amber-800">
              Transferred from Agent {transferFrom}
            </p>
          </div>
        )}

        {/* Buttons */}
        <div className="flex justify-center gap-16 mt-4">
          {/* Reject */}
          <button
            onClick={onReject}
            className="flex flex-col items-center gap-2"
          >
            <div className="w-20 h-20 rounded-full bg-red-600 flex items-center justify-center shadow-md hover:bg-red-700 transition-colors active:scale-95">
              <PhoneOff className="h-10 w-10 text-white rotate-135" />
            </div>
            <span className="text-sm font-medium text-gray-700">Decline</span>
          </button>

          {/* Accept */}
          <button
            onClick={onAccept}
            className="flex flex-col items-center gap-2"
          >
            <div className="w-20 h-20 rounded-full bg-green-600 flex items-center justify-center shadow-md hover:bg-green-700 transition-colors active:scale-95">
              <Phone className="h-10 w-10 text-white" />
            </div>
            <span className="text-sm font-medium text-gray-700">Answer</span>
          </button>
        </div>
      </div>
    </div>
  </div>
  );
}