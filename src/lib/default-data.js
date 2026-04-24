import { DEFAULT_ACCOUNTS, DEFAULT_CATEGORIES, STORAGE_VERSION } from "./constants";

function nowIso() {
  return new Date().toISOString();
}

export function createDefaultData() {
  const now = nowIso();

  return {
    version: STORAGE_VERSION,
    accounts: DEFAULT_ACCOUNTS.map((item) => ({
      ...item,
      createdAt: now,
      updatedAt: now
    })),
    categories: DEFAULT_CATEGORIES.map((item) => ({ ...item })),
    transactions: [],
    adjustmentLogs: [],
    settings: {
      theme: "light",
      currency: "CNY",
      monthlyAllowance: 2000,
      allowancePeriod: "calendar-month",
      enableOverspendAlert: true,
      onboardingCompleted: false
    }
  };
}

export function ensureAppData(raw) {
  const fallback = createDefaultData();

  if (!raw) {
    return fallback;
  }

  return {
    version: raw.version || STORAGE_VERSION,
    accounts: Array.isArray(raw.accounts) && raw.accounts.length ? raw.accounts : fallback.accounts,
    categories: Array.isArray(raw.categories) && raw.categories.length ? raw.categories : fallback.categories,
    transactions: Array.isArray(raw.transactions) ? raw.transactions : [],
    adjustmentLogs: Array.isArray(raw.adjustmentLogs) ? raw.adjustmentLogs : [],
    settings: {
      ...fallback.settings,
      ...(raw.settings || {})
    }
  };
}
