//@ts-nocheck
import { app, BrowserWindow, Notification, ipcMain, Menu, systemPreferences } from "electron";

import path from "path";


app.commandLine.appendSwitch("disable-background-timer-throttling");
app.commandLine.appendSwitch("disable-renderer-backgrounding");
app.commandLine.appendSwitch("enable-gpu-rasterization");
app.commandLine.appendSwitch("enable-zero-copy");
app.setName("Ringnex");
app.setAppUserModelId("com.myaio.voice");

const isDev = !app.isPackaged;
let mainWindow: BrowserWindow | null = null;
let splashWindow: BrowserWindow | null = null;
let permissionWindow: BrowserWindow | null = null;
let callWindow: BrowserWindow | null = null;
let latestCallState: any = null;

function createPermissionWindow() {
  permissionWindow = new BrowserWindow({
    width: 520,
    height: 620,
    resizable: false,
    minimizable: false,
    maximizable: false,
    show: true,
    title: "Ringnex – Permissions",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
    },
  });

  permissionWindow.loadFile(
    path.join(__dirname, "../public/permissions.html")
  );
}

function createSplash() {
  splashWindow = new BrowserWindow({
    width: 520,
    height: 380,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    movable: false,
    skipTaskbar: true,
  });

  splashWindow.loadFile(
    path.join(__dirname, "../public/splash.html")
  );
}
function createWindow() {

  mainWindow = new BrowserWindow({
    width: 1300,
    height: 800,
    show: false,
    title: "Ringnex",
    backgroundColor: "#ffffff", // removes white flash
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      
      sandbox: false,
      devTools: isDev,
      backgroundThrottling: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL("http://localhost:3001");
    mainWindow.webContents.openDevTools({ mode: "detach" });


   
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }
  mainWindow.webContents.setWindowOpenHandler(() => {
    return { action: "deny" };
  });
  mainWindow.once("ready-to-show", () => {
    splashWindow?.destroy();
    splashWindow = null;
    mainWindow?.show();
  });
  
}
function createAppMenu() {
  if (process.platform !== "darwin") return;

  const menu = Menu.buildFromTemplate([
    {
      label: "Ringnex",
      submenu: [
        { role: "about" },
        { type: "separator" },
        { role: "services" },
        { type: "separator" },
        { role: "hide" },
        { role: "hideOthers" },
        { role: "unhide" },
        { type: "separator" },
        { role: "quit" },
      ],
    },
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
      ],
    },
    {
      label: "Window",
      submenu: [
        { role: "minimize" },
        { role: "zoom" },
        { role: "close" },
      ],
    },
  ]);

  Menu.setApplicationMenu(menu);
}


function createCallWindow() {
  if (callWindow) {
    callWindow.focus();
    return;
  }

  callWindow = new BrowserWindow({
    width: 420,
    height: 640,
    frame: false,          // ❌ no close/minimize buttons
    alwaysOnTop: true,
    movable:true,
    backgroundColor: "#f8fafc",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
    },
  });

  if (isDev) {
    callWindow.loadURL("http://localhost:3001/#/call");   // ← hash add kardo
    callWindow.webContents.openDevTools();
  } else {
    callWindow.loadFile(
      path.join(__dirname, "../dist/index.html"),{
        hash:'/call'
      }
    );
  }

  callWindow.webContents.once("did-finish-load", () => {
    // 👇 window open hote hi last call state bhejo
    if (latestCallState) {
      callWindow?.webContents.send("call-state", latestCallState);
    }
  });

  callWindow.on("closed", () => {
    callWindow = null;
  });
}




app.whenReady().then(() => {
  createAppMenu();   
  createSplash();
  createWindow()
});

ipcMain.on("show-notification", (_, { title, body }) => {
  new Notification({ title, body }).show();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});


app.on("browser-window-created", (_, window) => {
  window.on("unresponsive", () => {
    console.warn("Renderer unresponsive");
  });
});
ipcMain.on("open-call-window", () => {
  createCallWindow();
});
ipcMain.on("close-call-window", () => {
  callWindow?.close();
});
ipcMain.on("call-state-update", (_, data) => {
  latestCallState = data;

  // Agar call window open hai to turant bhejo
  if (callWindow && !callWindow.isDestroyed()) {
    callWindow.webContents.send("call-state", data);
  }
});

ipcMain.on("call-action", (_, action) => {
  console.log(action);
  mainWindow?.webContents.send("call-action", action);
});

ipcMain.on("request-call-state", (event) => {
  if (latestCallState) {
    event.sender.send("call-state", latestCallState);
  }
});
ipcMain.on("request-permissions", async () => {

  // 🎤 Microphone
  await systemPreferences.askForMediaAccess("microphone");
  

  // 🔔 Notifications
  await Notification?.requestPermission();

  // Close permission window
  permissionWindow?.close();
  permissionWindow = null;

  // Open main app
  createWindow();
});

