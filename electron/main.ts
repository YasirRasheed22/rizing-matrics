//@ts-nocheck
import {
  app,
  BrowserWindow,
  ipcMain,
  Notification,
  Menu,
  shell,
  type MenuItemConstructorOptions,
} from "electron";
import path from "path";
import { autoUpdater } from "electron-updater";

app.setName("Ringnex (Beta)");
app.setAppUserModelId("com.myaio.voice");

const isDev = !app.isPackaged;

let mainWindow: BrowserWindow | null = null;
let callWindow: BrowserWindow | null = null;

type IncomingState = null | {
  from: string;
  customerName: string;
  isTransfer?: boolean;
  transferFrom?: string;
};

type CallSyncState = {
  status: "READY" | "INCOMING" | "DIALING" | "ON_CALL" | "OFFLINE";
  customerName: string;
  customerNumber: string;
  duration: number;
  isMuted: boolean;
  isOnHold: boolean;
  conferenceName: string | null;
  callSid: string | null;
  missedCount?: number;
  messageCount?: number;
  contactInfo?: { name?: string; address?: string } | null;
  incoming: IncomingState;
  agentList?: Array<{ id?: string; name?: string; phoneNumber?: string | null }>;
  contacts?: Array<{ id?: string; name?: string; phoneNumber?: string | null }>;
};

type CallAction =
  | { type: "ACCEPT" }
  | { type: "REJECT" }
  | { type: "MUTE" }
  | { type: "HOLD" }
  | { type: "HANGUP" }
  | { type: "TRANSFER"; payload?: unknown }
  | { type: "FETCH_CONTACT_INFO"; payload?: { number: string } }
  // ✅ FIX: renderer "DTMF" bhejta hai (src/types/call.ts), "SEND_DTMF" nahi —
  // whitelist mismatch ki wajah se DTMF actions silently drop ho rahe the
  | { type: "DTMF"; payload: { digit: string } }
  | { type: "SEND_DTMF"; payload: { digits: string } } // legacy compat
  | { type: "SPEAKER"; payload: { deviceId: string } }
  | { type: "REMOVE_PARTICIPANT"; payload: { participantCallSid: string } };

const DEFAULT_CALL_STATE: CallSyncState = {
  status: "READY",
  customerName: "",
  customerNumber: "",
  duration: 0,
  isMuted: false,
  isOnHold: false,
  conferenceName: null,
  callSid: null,
  missedCount: 0,
  messageCount: 0,
  contactInfo: null,
  incoming: null,
  agentList: [],
  contacts: [],
};

let latestCallState: CallSyncState = { ...DEFAULT_CALL_STATE };

function isValidAction(action: unknown): action is CallAction {
  if (!action || typeof action !== "object") return false;
  const type = (action as { type?: unknown }).type;
  return (
    type === "ACCEPT" ||
    type === "REJECT" ||
    type === "MUTE" ||
    type === "HOLD" ||
    type === "HANGUP" ||
    type === "TRANSFER" ||
    type === "FETCH_CONTACT_INFO" ||
    // ✅ FIX: "DTMF" (actual renderer action) whitelist mein nahi tha —
    // isValidAction false return karta tha aur keypad ke digits main
    // window tak kabhi pahunchte hi nahi the
    type === "DTMF" ||
    type === "SEND_DTMF" || // legacy compat
    type === "SPEAKER" ||
    type === "REMOVE_PARTICIPANT"
  );
}

function sanitizeNotificationPayload(payload: unknown): { title: string; body: string } | null {
  if (!payload || typeof payload !== "object") return null;
  const rawTitle = (payload as { title?: unknown }).title;
  const rawBody = (payload as { body?: unknown }).body;
  const title = typeof rawTitle === "string" ? rawTitle.slice(0, 120) : "";
  const body = typeof rawBody === "string" ? rawBody.slice(0, 500) : "";
  if (!title) return null;
  return { title, body };
}

function createMainWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.focus();
    return;
  }

  mainWindow = new BrowserWindow({
    width: 1320,
    height: 820,
    minWidth: 1100,
    minHeight: 720,
    show: false,
    title: "Ringnex",
    backgroundColor: "#ffffff",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      devTools: true, // CHANGED: pehle `isDev` tha. Ab prod mein bhi allowed, par auto-open nahi.
      spellcheck: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL("http://localhost:3001");
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  // REMOVED: `if (isDev) mainWindow.webContents.openDevTools({ mode: "detach" })`
  // DevTools ab sirf "Toggle Developer Tools" menu / shortcut se khulti hai.

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http://") || url.startsWith("https://")) {
      shell.openExternal(url);
    }
    return { action: "deny" };
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function createCallWindow() {
  if (callWindow && !callWindow.isDestroyed()) {
    callWindow.show();
    callWindow.focus();
    callWindow.webContents.send("call-state:sync", latestCallState);
    return;
  }

  callWindow = new BrowserWindow({
    width: 390,
    height: 660,
    minWidth: 360,
    minHeight: 620,
    maxWidth: 500,
    maxHeight: 900,
    show: false,
    frame: false,
    resizable: true,
    minimizable: true,
    maximizable: false,
    fullscreenable: false,
    alwaysOnTop: true,
    backgroundColor: "#f8fafc",
    title: "Call Window",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      devTools: true, // CHANGED: pehle `isDev` tha.
      spellcheck: false,
    },
  });

  if (isDev) {
    callWindow.loadURL("http://localhost:3001/call.html");
  } else {
    callWindow.loadFile(path.join(__dirname, "../dist/call.html"));
  }

  // REMOVED: `if (isDev) callWindow.webContents.openDevTools({ mode: "detach" })`
  // Frameless call window ki DevTools ke liye: is window ko focus karke shortcut dabao.

  callWindow.once("ready-to-show", () => {
    callWindow?.show();
    callWindow?.webContents.send("call-state:sync", latestCallState);
  });

  callWindow.on("closed", () => {
    callWindow = null;
  });
}

function createAppMenu() {
  const isMac = process.platform === "darwin";

  // ADDED: Toggle Developer Tools — hamesha detached (new window) mein.
  // `window` = focused BrowserWindow, is liye main + call window dono par chalta hai.
  const devToolsItem: MenuItemConstructorOptions = {
    label: "Toggle Developer Tools",
    accelerator: isMac ? "Cmd+Alt+I" : "Ctrl+Shift+I",
    click: (_item, window) => {
      const wc = window?.webContents;
      if (!wc) return;
      if (wc.isDevToolsOpened()) {
        wc.closeDevTools();
      } else {
        wc.openDevTools({ mode: "detach" });
      }
    },
  };

  const template: MenuItemConstructorOptions[] = [
    // macOS ka original app-menu jyun ka tyun rakha hai.
    ...(isMac
      ? [
          {
            label: "Ringnex",
            submenu: [
              { role: "about" },
              { type: "separator" },
              { role: "hide" },
              { role: "hideOthers" },
              { role: "unhide" },
              { type: "separator" },
              { role: "quit" },
            ],
          } as MenuItemConstructorOptions,
        ]
      : []),
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "togglefullscreen" },
        { type: "separator" },
        devToolsItem, // ADDED yahan
      ],
    },
    {
      label: "Window",
      submenu: [{ role: "minimize" }, { role: "close" }],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

const gotLock = app.requestSingleInstanceLock();

if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.focus();
    } else {
      createMainWindow();
    }
  });
}

app.whenReady().then(() => {
  createAppMenu();
  createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("browser-window-created", (_, window) => {
  window.on("unresponsive", () => {
    console.warn("Renderer unresponsive");
  });
});

/* notifications */
ipcMain.on("notification:show", (_, payload: unknown) => {
  const safePayload = sanitizeNotificationPayload(payload);
  if (!safePayload) return;
  new Notification({
    title: safePayload.title,
    body: safePayload.body,
  }).show();
});

/* call window open/close */
ipcMain.on("call-window:open", () => {
  createCallWindow();
});

ipcMain.on("call-window:close", () => {
  if (callWindow && !callWindow.isDestroyed()) {
    callWindow.close();
  }
});

/* state sync */
ipcMain.on("call-state:update", (_, patch: Partial<CallSyncState>) => {
  latestCallState = {
    ...latestCallState,
    ...patch,
  };
  if (callWindow && !callWindow.isDestroyed()) {
    callWindow.webContents.send("call-state:sync", latestCallState);
  }
});

ipcMain.on("call-state:replace", (_, fullState: CallSyncState) => {
  latestCallState = {
    ...DEFAULT_CALL_STATE,
    ...fullState,
  };
  if (callWindow && !callWindow.isDestroyed()) {
    callWindow.webContents.send("call-state:sync", latestCallState);
  }
});

ipcMain.on("call-state:request", (event) => {
  event.sender.send("call-state:sync", latestCallState);
});

/* actions from call window -> main renderer */
ipcMain.on("call-action:send", (_, action: unknown) => {
  if (!isValidAction(action)) return;
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("call-action", action);
  }
});

/* custom frame controls */
ipcMain.on("window:minimize-call", () => {
  if (callWindow && !callWindow.isDestroyed()) {
    callWindow.minimize();
  }
});

ipcMain.on("window:close-call", () => {
  if (callWindow && !callWindow.isDestroyed()) {
    callWindow.close();
  }
});

/* ============================================================================
 *  App auto-update (electron-updater)
 *  - Renderer (UpdateButton / AppUpdateModal) window.electronAPI.* ko call karta hai
 *  - Yahan GitHub release se check -> download -> install hota hai
 *  - Dev mode (unpackaged) mein updater disabled — sirf packaged app mein chalta hai
 * ========================================================================== */

type AppUpdateStatus =
  | "checking"
  | "available"
  | "not-available"
  | "downloading"
  | "downloaded"
  | "error";

// Kisi bhi khuli window (main + call) ko status bhej do — renderer subscribe karta hai
function broadcastUpdateStatus(payload: {
  status: AppUpdateStatus;
  version?: string;
  percent?: number;
  message?: string;
}) {
  for (const win of BrowserWindow.getAllWindows()) {
    if (win && !win.isDestroyed()) {
      win.webContents.send("app-update:status", payload);
    }
  }
}

let autoUpdaterWired = false;
function setupAutoUpdater() {
  if (autoUpdaterWired) return;
  autoUpdaterWired = true;

  // available hote hi khud download shuru; app quit par install bhi ready
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on("checking-for-update", () => {
    broadcastUpdateStatus({ status: "checking" });
  });
  autoUpdater.on("update-available", (info) => {
    broadcastUpdateStatus({ status: "available", version: info?.version });
  });
  autoUpdater.on("update-not-available", (info) => {
    broadcastUpdateStatus({ status: "not-available", version: info?.version });
  });
  autoUpdater.on("download-progress", (p) => {
    broadcastUpdateStatus({
      status: "downloading",
      percent: Math.round(p?.percent ?? 0),
    });
  });
  autoUpdater.on("update-downloaded", (info) => {
    broadcastUpdateStatus({ status: "downloaded", version: info?.version });
  });
  autoUpdater.on("error", (err) => {
    broadcastUpdateStatus({
      status: "error",
      message: (err && (err as Error).message) || String(err),
    });
  });
}

// Renderer: "Search for latest" button
ipcMain.handle("app-update:check", async () => {
  if (!app.isPackaged) {
    broadcastUpdateStatus({
      status: "not-available",
      message: "Dev mode — updates sirf installed app mein chalte hain.",
    });
    return { ok: false, message: "Updates only work in the installed app." };
  }
  try {
    setupAutoUpdater();
    await autoUpdater.checkForUpdates();
    return { ok: true };
  } catch (err) {
    const message = (err && (err as Error).message) || String(err);
    broadcastUpdateStatus({ status: "error", message });
    return { ok: false, message };
  }
});

// Renderer: "Restart & Install"
ipcMain.handle("app-update:install", async () => {
  try {
    // false, true = app ko silently restart karke naya version install karo
    autoUpdater.quitAndInstall(false, true);
    return { ok: true };
  } catch (err) {
    const message = (err && (err as Error).message) || String(err);
    broadcastUpdateStatus({ status: "error", message });
    return { ok: false, message };
  }
});

// App launch par ek dafa khud check kar lo (background, silent fail)
app.whenReady().then(() => {
  if (!app.isPackaged) return;
  setupAutoUpdater();
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch(() => {
      /* offline / no release — chup-chaap ignore, app normal chalti rahe */
    });
  }, 4000);
});