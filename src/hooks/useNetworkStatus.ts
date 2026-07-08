//@ts-nocheck
import { useState, useEffect } from "react";

type NetworkStatus = {
  online: boolean;
  effectiveType: "slow-2g" | "2g" | "3g" | "4g" | "unknown" | "offline";
  downlink?: number;     // Mbps (approximate)
  rtt?: number;          // ms (round-trip time)
};

export function useNetworkStatus() {
  const [status, setStatus] = useState<NetworkStatus>({
    online: navigator.onLine,
    effectiveType: navigator.onLine ? "unknown" : "offline",
    downlink: undefined,
    rtt: undefined,
  });

  useEffect(() => {
    const updateNetworkStatus = () => {
      const connection =
        // @ts-expect-error
        navigator.connection || navigator.mozConnection || navigator.webkitConnection;

      const isOnline = navigator.onLine;

      let effectiveType: NetworkStatus["effectiveType"] = isOnline ? "unknown" : "offline";

      let downlink: number | undefined = undefined;
      let rtt: number | undefined = undefined;

      if (connection && isOnline) {
        effectiveType = connection.effectiveType || "unknown";
        downlink = connection.downlink;
        rtt = connection.rtt;
      }

      setStatus({
        online: isOnline,
        effectiveType,
        downlink,
        rtt,
      });
    };

    updateNetworkStatus();

    window.addEventListener("online", updateNetworkStatus);
    window.addEventListener("offline", updateNetworkStatus);

    const conn =
      // @ts-expect-error
      navigator.connection || navigator.mozConnection || navigator.webkitConnection;

    if (conn) {
      conn.addEventListener("change", updateNetworkStatus);
    }

    return () => {
      window.removeEventListener("online", updateNetworkStatus);
      window.removeEventListener("offline", updateNetworkStatus);
      if (conn) {
        conn.removeEventListener("change", updateNetworkStatus);
      }
    };
  }, []);

  return status;
}