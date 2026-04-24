import { clampText, getMonthKey } from "./format";

export function getLookup(data) {
  return {
    accountMap: new Map((data.accounts || []).map((item) => [item.id, item])),
    categoryMap: new Map((data.categories || []).map((item) => [item.id, item]))
  };
}

export function getMonthTransactions(transactions, monthKey) {
  return (transactions || []).filter((item) => getMonthKey(item.date) === monthKey);
}

export function getRecentTransactions(transactions, count = 6) {
  return (transactions || []).slice(0, count);
}

export function getDashboardSummary(data, monthKey) {
  const monthTransactions = getMonthTransactions(data.transactions, monthKey);
  const expenseTransactions = monthTransactions.filter((item) => item.type === "expense");
  const incomeTransactions = monthTransactions.filter((item) => item.type === "income");
  const transferTransactions = monthTransactions.filter((item) => item.type === "transfer");

  const totalExpense = expenseTransactions.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const totalIncome = incomeTransactions.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const totalTransfer = transferTransactions.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const balance = totalIncome - totalExpense;
  const allowance = Number(data.settings?.monthlyAllowance || 0);
  const remaining = allowance - totalExpense;
  const recordDays = new Set(monthTransactions.map((item) => item.date)).size;
  const usageRate = allowance > 0 ? Math.min(totalExpense / allowance, 1.2) : 0;

  const categoryMap = new Map();
  expenseTransactions.forEach((item) => {
    categoryMap.set(item.categoryId, (categoryMap.get(item.categoryId) || 0) + Number(item.amount || 0));
  });

  const accountMap = new Map();
  expenseTransactions.forEach((item) => {
    accountMap.set(item.accountId, (accountMap.get(item.accountId) || 0) + Number(item.amount || 0));
  });

  return {
    monthTransactions,
    recentTransactions: getRecentTransactions(data.transactions, 6),
    totalExpense,
    totalIncome,
    totalTransfer,
    balance,
    allowance,
    remaining,
    recordDays,
    usageRate,
    alertLevel:
      allowance <= 0 || !data.settings?.enableOverspendAlert
        ? "normal"
        : totalExpense >= allowance
          ? "danger"
          : totalExpense >= allowance * 0.8
            ? "warning"
            : "normal",
    categoryBreakdown: Array.from(categoryMap.entries())
      .map(([categoryId, amount]) => ({ categoryId, amount }))
      .sort((a, b) => b.amount - a.amount),
    accountBreakdown: Array.from(accountMap.entries())
      .map(([accountId, amount]) => ({ accountId, amount }))
      .sort((a, b) => b.amount - a.amount)
  };
}

export function getGroupedTransactions(transactions, filters, lookup) {
  const list = (transactions || []).filter((item) => {
    if (filters.monthKey && getMonthKey(item.date) !== filters.monthKey) {
      return false;
    }

    if (filters.type && filters.type !== "all" && item.type !== filters.type) {
      return false;
    }

    if (filters.accountId) {
      const matched =
        item.accountId === filters.accountId ||
        item.fromAccountId === filters.accountId ||
        item.toAccountId === filters.accountId;
      if (!matched) {
        return false;
      }
    }

    if (filters.categoryId && item.categoryId !== filters.categoryId) {
      return false;
    }

    if (filters.keyword) {
      const note = item.note || "";
      const categoryName = lookup.categoryMap.get(item.categoryId)?.name || "";
      const accountName =
        lookup.accountMap.get(item.accountId)?.name ||
        lookup.accountMap.get(item.fromAccountId)?.name ||
        "";

      const haystack = `${note} ${categoryName} ${accountName}`.toLowerCase();
      if (!haystack.includes(filters.keyword.toLowerCase())) {
        return false;
      }
    }

    return true;
  });

  const groups = new Map();
  list.forEach((item) => {
    if (!groups.has(item.date)) {
      groups.set(item.date, []);
    }
    groups.get(item.date).push(item);
  });

  return Array.from(groups.entries()).map(([date, items]) => ({
    date,
    items,
    total: items.reduce((sum, item) => {
      if (item.type === "income") {
        return sum + Number(item.amount || 0);
      }

      if (item.type === "expense") {
        return sum - Number(item.amount || 0);
      }

      return sum;
    }, 0)
  }));
}

export function getMonthTrend(transactions, monthKey) {
  const months = [];
  const [year, month] = monthKey.split("-").map(Number);

  for (let offset = -5; offset <= 0; offset += 1) {
    const current = new Date(year, month - 1 + offset, 1);
    const currentKey = `${current.getFullYear()}-${`${current.getMonth() + 1}`.padStart(2, "0")}`;
    const total = (transactions || [])
      .filter((item) => item.type === "expense" && getMonthKey(item.date) === currentKey)
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    months.push({
      monthKey: currentKey,
      label: `${current.getMonth() + 1}月`,
      amount: total
    });
  }

  return months;
}

export function getCalendarMatrix(monthKey, transactions) {
  const [year, month] = monthKey.split("-").map(Number);
  const firstDay = new Date(year, month - 1, 1);
  const firstWeekday = firstDay.getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const previousMonthDays = new Date(year, month - 1, 0).getDate();

  const totalMap = new Map();
  const countMap = new Map();
  (transactions || [])
    .filter((item) => item.type === "expense" && getMonthKey(item.date) === monthKey)
    .forEach((item) => {
      const day = Number(item.date.slice(-2));
      totalMap.set(day, (totalMap.get(day) || 0) + Number(item.amount || 0));
      countMap.set(day, (countMap.get(day) || 0) + 1);
    });

  const cells = [];

  for (let index = 0; index < 42; index += 1) {
    const dayNumber = index - firstWeekday + 1;
    if (dayNumber <= 0) {
      cells.push({
        day: previousMonthDays + dayNumber,
        muted: true,
        amount: 0,
        count: 0
      });
      continue;
    }

    if (dayNumber > daysInMonth) {
      cells.push({
        day: dayNumber - daysInMonth,
        muted: true,
        amount: 0,
        count: 0
      });
      continue;
    }

    cells.push({
      day: dayNumber,
      muted: false,
      amount: totalMap.get(dayNumber) || 0,
      count: countMap.get(dayNumber) || 0
    });
  }

  return cells;
}

export function getTransactionDisplay(item, lookup) {
  if (item.type === "transfer") {
    return {
      title: "账户转账",
      subtitle: `${lookup.accountMap.get(item.fromAccountId)?.name || "未知账户"} → ${lookup.accountMap.get(item.toAccountId)?.name || "未知账户"}`,
      note: clampText(item.note || "转账记录", 22),
      symbol: "转",
      color: "#8f96ff"
    };
  }

  const category = lookup.categoryMap.get(item.categoryId);
  const account = lookup.accountMap.get(item.accountId);

  return {
    title: category?.name || "未分类",
    subtitle: account?.name || "未知账户",
    note: clampText(item.note || "未填写备注", 22),
    symbol: category?.symbol || "记",
    color: category?.color || "#ff8fb0"
  };
}
