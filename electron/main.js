const { app, BrowserWindow, dialog, ipcMain, shell } = require("electron");
const fs = require("node:fs/promises");
const path = require("node:path");

const isDev = !app.isPackaged;
let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1480,
    height: 980,
    minWidth: 1120,
    minHeight: 780,
    backgroundColor: "#fff7fb",
    title: "PocketLedger",
    trafficLightPosition: { x: 18, y: 20 },
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
  } else {
    mainWindow.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }
}

function getDataFilePath() {
  return path.join(app.getPath("userData"), "pocket-ledger-data.json");
}

async function readJsonFile(filePath) {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === "ENOENT") {
      return null;
    }

    throw error;
  }
}

async function writeJsonFile(filePath, data) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
}

function toCsv(data) {
  const accountMap = new Map((data.accounts || []).map((item) => [item.id, item.name]));
  const categoryMap = new Map((data.categories || []).map((item) => [item.id, item.name]));
  const header = [
    "id",
    "type",
    "amount",
    "account",
    "fromAccount",
    "toAccount",
    "category",
    "date",
    "note",
    "createdAt",
    "updatedAt"
  ];

  const rows = (data.transactions || []).map((item) => [
    item.id,
    item.type,
    item.amount,
    accountMap.get(item.accountId) || "",
    accountMap.get(item.fromAccountId) || "",
    accountMap.get(item.toAccountId) || "",
    categoryMap.get(item.categoryId) || "",
    item.date,
    item.note || "",
    item.createdAt,
    item.updatedAt
  ]);

  return [header, ...rows]
    .map((row) =>
      row
        .map((field) => `"${String(field ?? "").replaceAll("\"", "\"\"")}"`)
        .join(",")
    )
    .join("\n");
}

ipcMain.handle("app:data:load", async () => {
  return readJsonFile(getDataFilePath());
});

ipcMain.handle("app:data:save", async (_event, payload) => {
  await writeJsonFile(getDataFilePath(), payload);
  return { ok: true };
});

ipcMain.handle("app:data:location", async () => {
  return {
    filePath: getDataFilePath(),
    directory: app.getPath("userData")
  };
});

ipcMain.handle("app:data:export-json", async (_event, payload) => {
  const { canceled, filePath } = await dialog.showSaveDialog({
    defaultPath: `PocketLedger-backup-${new Date().toISOString().slice(0, 10)}.json`,
    filters: [{ name: "JSON", extensions: ["json"] }]
  });

  if (canceled || !filePath) {
    return { canceled: true };
  }

  await writeJsonFile(filePath, payload);
  return { canceled: false, filePath };
});

ipcMain.handle("app:data:export-csv", async (_event, payload) => {
  const { canceled, filePath } = await dialog.showSaveDialog({
    defaultPath: `PocketLedger-transactions-${new Date().toISOString().slice(0, 10)}.csv`,
    filters: [{ name: "CSV", extensions: ["csv"] }]
  });

  if (canceled || !filePath) {
    return { canceled: true };
  }

  await fs.writeFile(filePath, toCsv(payload), "utf-8");
  return { canceled: false, filePath };
});

ipcMain.handle("app:data:import-json", async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ["openFile"],
    filters: [{ name: "JSON", extensions: ["json"] }]
  });

  if (canceled || !filePaths.length) {
    return { canceled: true };
  }

  const imported = await readJsonFile(filePaths[0]);
  return {
    canceled: false,
    filePath: filePaths[0],
    data: imported
  };
});

ipcMain.handle("app:data:open-directory", async () => {
  return shell.openPath(app.getPath("userData"));
});

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
