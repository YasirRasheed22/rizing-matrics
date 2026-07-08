// src/pages/CallWindow.tsx
//@ts-nocheck
import { useEffect, useState } from "react";
import CallUI from "../components/CallUI";

export default function CallWindow() {
  const [call, setCall] = useState(null);

  useEffect(() => {
    // Request initial state
    window.electronAPI.requestInitialCallState();

    // Subscribe aur cleanup function le lo
    const unsubscribe = window.electronAPI.onCallState((data) => {
     // src/pages/CallWindow.tsx

        setCall((prev) => {
          if (!prev) return data;

          const merged = { ...prev, ...data };

          // Force cleanup: agar new status "ON_CALL" hai to incoming ko null kar do
          if (merged.status === "ON_CALL") {
            merged.incoming = null;
            merged.isTransfer = null;
            merged.transferFrom = null;
          }

          // Status priority
          merged.status = data.status || prev.status || "OFFLINE";

          console.log("Merged call in CallWindow:", merged);

          return merged;
});
    });

    // Cleanup on unmount
    return () => {
      unsubscribe();   // ← yeh sahi kaam karega ab
    };
  }, []);

  const handleAction = (type: string, payload = {}) => {
    window.electronAPI.sendCallAction({ type, payload });
  };
  console.log(window.location);
  if (!call) {
    return (
      <div className="h-screen flex items-center justify-center text-gray-400 bg-gray-900 text-black">
        Waiting for call data…
      </div>
    );
  }

  return (
    <div className="h-screen  bg-gradient-to-r from-blue-50 to-purple-50">
      <CallUI
        call={call}
        user={call.user}
        onAction={handleAction}
      />
    </div>
);
}