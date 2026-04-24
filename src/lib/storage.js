const BROWSER_STORAGE_KEY = "pocket-ledger-browser-data";

function downloadText(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
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
    "note"
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
    item.note || ""
  ]);

  return [header, ...rows]
    .map((row) => row.map((field) => `"${String(field ?? "").replaceAll("\"", "\"\"")}"`).join(","))
    .join("\n");
}

export function hasNativeBridge() {
  return Boolean(window.pocketLedger);
}

export async function loadAppData() {
  if (window.pocketLedger?.loadData) {
    return window.pocketLedger.loadData();
  }

  const raw = localStorage.getItem(BROWSER_STORAGE_KEY);
  return raw ? JSON.parse(raw) : null;
}

export async function saveAppData(data) {
  if (window.pocketLedger?.saveData) {
    return window.pocketLedger.saveData(data);
  }

  localStorage.setItem(BROWSER_STORAGE_KEY, JSON.stringify(data));
  return { ok: true };
}

export async function exportJson(data) {
  if (window.pocketLedger?.exportJson) {
    return window.pocketLedger.exportJson(data);
  }

  downloadText("PocketLedger-backup.json", JSON.stringify(data, null, 2), "application/json");
  return { canceled: false };
}

export async function exportCsv(data) {
  if (window.pocketLedger?.exportCsv) {
    return window.pocketLedger.exportCsv(data);
  }

  downloadText("PocketLedger-transactions.csv", toCsv(data), "text/csv;charset=utf-8");
  return { canceled: false };
}

export async function importJson() {
  if (window.pocketLedger?.importJson) {
    return window.pocketLedger.importJson();
  }

  return { canceled: true };
}

export async function getDataLocation() {
  if (window.pocketLedger?.getDataLocation) {
    return window.pocketLedger.getDataLocation();
  }

  return {
    filePath: "浏览器 localStorage",
    directory: "浏览器 localStorage"
  };
}

export async function openDataDirectory() {
  if (window.pocketLedger?.openDataDirectory) {
    return window.pocketLedger.openDataDirectory();
  }

  return null;
}
