//@ts-nocheck
import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  ping: () => "pong",

  notify: (title, body) =>
    ipcRenderer.send("show-notification", { title, body }),

  openCallWindow: () => ipcRenderer.send("open-call-window"),
  closeCallWindow: () => ipcRenderer.send("close-call-window"),

  updateCallState: (data) =>
    ipcRenderer.send("call-state-update", data),

  requestInitialCallState: () =>
    ipcRenderer.send("request-call-state"),

  // 🔽 CALL STATE (main → renderer)
  onCallState: (callback: (data: any) => void) => {
    const subscription = (_: any, data: any) => callback(data);
    ipcRenderer.on("call-state", subscription);

    // Return cleanup function
    return () => {
      ipcRenderer.removeListener("call-state", subscription);
    };
  },
  // 🔽 CALL ACTIONS (renderer → main → main renderer)
  sendCallAction: (action) =>
    ipcRenderer.send("call-action", action),

    onCallAction: (callback: (action: any) => void) => {
      const subscription = (_: any, action: any) => callback(action);
      ipcRenderer.on("call-action", subscription);
      return () => {
        ipcRenderer.removeListener("call-action", subscription);
      };
    },
    sendCallAction: (action) =>
    ipcRenderer.send("call-action", action),

  // Optional: agar direct remove chahiye to (but better avoid)
  removeAllCallStateListeners: () =>
    ipcRenderer.removeAllListeners("call-state"),

    

  removeCallAction: (cb) =>
    ipcRenderer.removeListener("call-action", cb),
    
});
