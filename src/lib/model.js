import { DEFAULT_ACCOUNTS, DEFAULT_CATEGORIES } from "./constants";
import { ensureAppData } from "./default-data";

export function createId(prefix) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function stamp() {
  return new Date().toISOString();
}

function applyTransaction(accounts, transaction, direction) {
  const next = accounts.map((item) => ({ ...item }));
  const amount = Number(transaction.amount || 0) * direction;

  if (transaction.type === "expense") {
    const account = next.find((item) => item.id === transaction.accountId);
    if (account) {
      account.balance = Number(account.balance || 0) - amount;
      account.updatedAt = stamp();
    }
  }

  if (transaction.type === "income") {
    const account = next.find((item) => item.id === transaction.accountId);
    if (account) {
      account.balance = Number(account.balance || 0) + amount;
      account.updatedAt = stamp();
    }
  }

  if (transaction.type === "transfer") {
    const fromAccount = next.find((item) => item.id === transaction.fromAccountId);
    const toAccount = next.find((item) => item.id === transaction.toAccountId);

    if (fromAccount) {
      fromAccount.balance = Number(fromAccount.balance || 0) - amount;
      fromAccount.updatedAt = stamp();
    }

    if (toAccount) {
      toAccount.balance = Number(toAccount.balance || 0) + amount;
      toAccount.updatedAt = stamp();
    }
  }

  return next;
}

export function upsertTransaction(data, draft) {
  const safeData = ensureAppData(data);
  const existing = safeData.transactions.find((item) => item.id === draft.id);
  const nextTransaction = {
    ...existing,
    ...draft,
    amount: Number(draft.amount || 0),
    updatedAt: stamp(),
    createdAt: existing?.createdAt || stamp()
  };

  let nextAccounts = safeData.accounts.map((item) => ({ ...item }));
  let nextTransactions = safeData.transactions.slice();

  if (existing) {
    nextAccounts = applyTransaction(nextAccounts, existing, -1);
    nextTransactions = nextTransactions.filter((item) => item.id !== existing.id);
  }

  nextAccounts = applyTransaction(nextAccounts, nextTransaction, 1);
  nextTransactions.unshift(nextTransaction);

  return {
    ...safeData,
    accounts: nextAccounts,
    transactions: nextTransactions.sort((a, b) => {
      if (a.date !== b.date) {
        return a.date < b.date ? 1 : -1;
      }

      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    })
  };
}

export function removeTransaction(data, transactionId) {
  const safeData = ensureAppData(data);
  const existing = safeData.transactions.find((item) => item.id === transactionId);

  if (!existing) {
    return safeData;
  }

  return {
    ...safeData,
    accounts: applyTransaction(safeData.accounts, existing, -1),
    transactions: safeData.transactions.filter((item) => item.id !== transactionId)
  };
}

export function upsertAccount(data, draft) {
  const safeData = ensureAppData(data);
  const existing = safeData.accounts.find((item) => item.id === draft.id);
  const now = stamp();
  const nextAccount = {
    id: existing?.id || createId("acc"),
    name: draft.name.trim(),
    symbol: draft.symbol.trim() || draft.name.trim().slice(0, 1),
    type: draft.type || "ewallet",
    balance: Number(draft.balance || 0),
    system: existing?.system || false,
    color: draft.color || existing?.color || "#f59ab6",
    createdAt: existing?.createdAt || now,
    updatedAt: now
  };

  const rest = safeData.accounts.filter((item) => item.id !== nextAccount.id);
  return {
    ...safeData,
    accounts: [...rest, nextAccount].sort((a, b) => Number(b.system) - Number(a.system))
  };
}

export function deleteAccount(data, accountId) {
  const safeData = ensureAppData(data);
  const target = safeData.accounts.find((item) => item.id === accountId);

  if (!target) {
    return safeData;
  }

  if (target.system) {
    throw new Error("系统默认账户不能删除。");
  }

  const used = safeData.transactions.some(
    (item) =>
      item.accountId === accountId ||
      item.fromAccountId === accountId ||
      item.toAccountId === accountId
  );

  if (used) {
    throw new Error("该账户已有交易记录，暂不能删除。");
  }

  return {
    ...safeData,
    accounts: safeData.accounts.filter((item) => item.id !== accountId)
  };
}

export function upsertCategory(data, draft) {
  const safeData = ensureAppData(data);
  const existing = safeData.categories.find((item) => item.id === draft.id);
  const nextCategory = {
    id: existing?.id || createId("cat"),
    name: draft.name.trim(),
    symbol: draft.symbol.trim() || draft.name.trim().slice(0, 1),
    type: draft.type,
    system: existing?.system || false,
    color: draft.color || existing?.color || "#f68eaf"
  };

  const rest = safeData.categories.filter((item) => item.id !== nextCategory.id);
  return {
    ...safeData,
    categories: [...rest, nextCategory].sort((a, b) => {
      if (a.type !== b.type) {
        return a.type > b.type ? 1 : -1;
      }

      return Number(b.system) - Number(a.system);
    })
  };
}

export function deleteCategory(data, categoryId) {
  const safeData = ensureAppData(data);
  const target = safeData.categories.find((item) => item.id === categoryId);

  if (!target) {
    return safeData;
  }

  if (target.system) {
    throw new Error("系统默认分类不能删除。");
  }

  const used = safeData.transactions.some((item) => item.categoryId === categoryId);
  if (used) {
    throw new Error("该分类已有交易记录，暂不能删除。");
  }

  return {
    ...safeData,
    categories: safeData.categories.filter((item) => item.id !== categoryId)
  };
}

export function updateSettings(data, patch) {
  const safeData = ensureAppData(data);
  return {
    ...safeData,
    settings: {
      ...safeData.settings,
      ...patch
    }
  };
}

export function calibrateAccount(data, accountId, nextBalance, reason) {
  const safeData = ensureAppData(data);
  const target = safeData.accounts.find((item) => item.id === accountId);

  if (!target) {
    throw new Error("未找到对应账户。");
  }

  const beforeBalance = Number(target.balance || 0);
  const afterBalance = Number(nextBalance || 0);
  const now = stamp();

  return {
    ...safeData,
    accounts: safeData.accounts.map((item) =>
      item.id === accountId
        ? { ...item, balance: afterBalance, updatedAt: now }
        : item
    ),
    adjustmentLogs: [
      {
        id: createId("adj"),
        accountId,
        beforeBalance,
        afterBalance,
        delta: afterBalance - beforeBalance,
        reason: reason?.trim() || "手动校准账户余额",
        createdAt: now
      },
      ...safeData.adjustmentLogs
    ]
  };
}

export function resetToDefault(data) {
  const safeData = ensureAppData(data);
  return {
    ...safeData,
    accounts: DEFAULT_ACCOUNTS.map((item) => ({
      ...item,
      createdAt: stamp(),
      updatedAt: stamp()
    })),
    categories: DEFAULT_CATEGORIES.map((item) => ({ ...item })),
    transactions: [],
    adjustmentLogs: []
  };
}
