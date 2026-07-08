//@ts-nocheck

import { useEffect, useState } from "react";

type UpdateState = {
  status: "idle" | "checking" | "available" | "not-available" | "downloading" | "downloaded" | "error";
  version?: string;
  percent?: number;
  message?: string;
};

export default function AppUpdateModal() {
  const [update, setUpdate] = useState<UpdateState>({ status: "idle" });
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!window.electronAPI?.onAppUpdateStatus) return;

    const unsubscribe = window.electronAPI.onAppUpdateStatus((payload) => {
      setUpdate(payload as UpdateState);

      if (
        payload.status === "available" ||
        payload.status === "downloading" ||
        payload.status === "downloaded" ||
        payload.status === "error"
      ) {
        setOpen(true);
      }
    });

    return unsubscribe;
  }, []);

  if (!open) return null;

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.4)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 99999
    }}>
      <div style={{
        width: 420,
        background: "#fff",
        borderRadius: 12,
        padding: 20,
        boxShadow: "0 10px 40px rgba(0,0,0,0.2)"
      }}>
        <h3>App Update</h3>

        {update.status === "available" && (
          <p>New version {update.version} is available.</p>
        )}

        {update.status === "downloading" && (
          <>
            <p>Downloading update... {update.percent || 0}%</p>
            <div className="progress">
              <div
                className="progress-bar"
                style={{ width: `${update.percent || 0}%` }}
              />
            </div>
          </>
        )}

        {update.status === "downloaded" && (
          <>
            <p>Update downloaded. Restart to install.</p>
            <button
              className="btn btn-primary"
              onClick={() => window.electronAPI?.installAppUpdate?.()}
            >
              Restart & Install
            </button>
          </>
        )}

        {update.status === "error" && (
          <p style={{ color: "red" }}>{update.message || "Update failed"}</p>
        )}

        {(update.status === "available" ||
          update.status === "error" ||
          update.status === "downloaded") && (
          <button
            className="btn btn-secondary mt-3"
            onClick={() => setOpen(false)}
          >
            Close
          </button>
        )}
      </div>
    </div>
  );
}