import { useEffect, useMemo, useState } from "react";
import BarChart from "./components/BarChart";
import DonutChart from "./components/DonutChart";
import QuickEntryDrawer from "./components/QuickEntryDrawer";
import { NAV_ITEMS, TRANSACTION_TABS } from "./lib/constants";
import { createDefaultData, ensureAppData } from "./lib/default-data";
import {
  clampText,
  formatAmountSigned,
  formatCurrency,
  formatDateLabel,
  formatMonthLabel,
  getMonthKey,
  shiftMonth
} from "./lib/format";
import {
  calibrateAccount,
  deleteAccount,
  deleteCategory,
  removeTransaction,
  resetToDefault,
  updateSettings,
  upsertAccount,
  upsertCategory,
  upsertTransaction
} from "./lib/model";
import {
  getCalendarMatrix,
  getDashboardSummary,
  getGroupedTransactions,
  getLookup,
  getMonthTrend,
  getTransactionDisplay
} from "./lib/selectors";
import {
  exportCsv,
  exportJson,
  getDataLocation,
  hasNativeBridge,
  importJson,
  loadAppData,
  openDataDirectory,
  saveAppData
} from "./lib/storage";

function SummaryCard({ label, value, tone = "default", meta }) {
  return (
    <div className={`summary-card tone-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {meta ? <em>{meta}</em> : null}
    </div>
  );
}

function SectionHeader({ title, action, subtitle }) {
  return (
    <div className="section-header">
      <div>
        <p>{title}</p>
        {subtitle ? <span>{subtitle}</span> : null}
      </div>
      {action}
    </div>
  );
}

function Modal({ open, title, children, onClose }) {
  if (!open) {
    return null;
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <strong>{title}</strong>
          <button className="ghost-button" type="button" onClick={onClose}>
            关闭
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function App() {
  const [loaded, setLoaded] = useState(false);
  const [data, setData] = useState(createDefaultData());
  const [monthKey, setMonthKey] = useState(getMonthKey(new Date()));
  const [activeTab, setActiveTab] = useState("dashboard");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [toast, setToast] = useState("");
  const [dataLocation, setDataLocation] = useState(null);
  const [filters, setFilters] = useState({
    type: "all",
    accountId: "",
    categoryId: "",
    keyword: ""
  });
  const [accountDraft, setAccountDraft] = useState(null);
  const [categoryDraft, setCategoryDraft] = useState(null);
  const [calibrationDraft, setCalibrationDraft] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    let alive = true;

    async function bootstrap() {
      const raw = await loadAppData();
      const fileInfo = await getDataLocation();
      const nextData = ensureAppData(raw);

      if (!alive) {
        return;
      }

      setData(nextData);
      setDataLocation(fileInfo);
      setShowOnboarding(!nextData.settings.onboardingCompleted);
      setLoaded(true);
    }

    bootstrap();

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!toast) {
      return undefined;
    }

    const timer = window.setTimeout(() => setToast(""), 2400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const lookup = useMemo(() => getLookup(data), [data]);
  const summary = useMemo(() => getDashboardSummary(data, monthKey), [data, monthKey]);
  const calendarCells = useMemo(() => getCalendarMatrix(monthKey, data.transactions), [monthKey, data.transactions]);
  const groupedTransactions = useMemo(
    () => getGroupedTransactions(data.transactions, { ...filters, monthKey }, lookup),
    [data.transactions, filters, monthKey, lookup]
  );
  const monthTrend = useMemo(
    () =>
      getMonthTrend(data.transactions, monthKey).map((item) => ({
        ...item,
        isCurrent: item.monthKey === monthKey
      })),
    [data.transactions, monthKey]
  );

  const expenseBreakdown = summary.categoryBreakdown.map((item) => {
    const category = lookup.categoryMap.get(item.categoryId);
    return {
      id: item.categoryId,
      name: category?.name || "未分类",
      symbol: category?.symbol || "记",
      color: category?.color || "#f7a0bd",
      amount: item.amount
    };
  });

  const accountBreakdown = summary.accountBreakdown.map((item) => {
    const account = lookup.accountMap.get(item.accountId);
    return {
      id: item.accountId,
      name: account?.name || "未知账户",
      symbol: account?.symbol || "户",
      color: account?.color || "#8acdf5",
      amount: item.amount
    };
  });

  function notify(message) {
    setToast(message);
  }

  function commit(recipe, successMessage) {
    try {
      const next = ensureAppData(recipe(data));
      setData(next);
      void saveAppData(next);
      if (successMessage) {
        notify(successMessage);
      }
      return true;
    } catch (error) {
      notify(error.message || "操作失败");
      return false;
    }
  }

  function handleOpenNewTransaction() {
    setEditingTransaction(null);
    setDrawerOpen(true);
  }

  function handleSaveTransaction(draft) {
    commit((current) => upsertTransaction(current, draft), draft.id ? "交易已更新" : "记账成功");
    setDrawerOpen(false);
    setEditingTransaction(null);
  }

  function handleDeleteTransaction(id) {
    commit((current) => removeTransaction(current, id), "交易已删除");
  }

  function handleImportJson() {
    void (async () => {
      const result = await importJson();
      if (result.canceled || !result.data) {
        return;
      }

      const next = ensureAppData(result.data);
      setData(next);
      await saveAppData(next);
      notify("已导入 JSON 数据");
    })();
  }

  function handleExportJson() {
    void exportJson(data).then((result) => {
      if (!result?.canceled) {
        notify("JSON 已导出");
      }
    });
  }

  function handleExportCsv() {
    void exportCsv(data).then((result) => {
      if (!result?.canceled) {
        notify("CSV 已导出");
      }
    });
  }

  function handleSaveAccount(event) {
    event.preventDefault();
    const success = commit(
      (current) => upsertAccount(current, accountDraft),
      accountDraft.id ? "账户已更新" : "账户已新增"
    );
    if (success) {
      setAccountDraft(null);
    }
  }

  function handleSaveCategory(event) {
    event.preventDefault();
    const success = commit(
      (current) => upsertCategory(current, categoryDraft),
      categoryDraft.id ? "分类已更新" : "分类已新增"
    );
    if (success) {
      setCategoryDraft(null);
    }
  }

  function handleCalibrateAccount(event) {
    event.preventDefault();
    const success = commit(
      (current) =>
        calibrateAccount(current, calibrationDraft.accountId, calibrationDraft.balance, calibrationDraft.reason),
      "账户余额已校准"
    );
    if (success) {
      setCalibrationDraft(null);
    }
  }

  function handleFinishOnboarding(event) {
    event.preventDefault();
    const success = commit(
      (current) =>
        updateSettings(current, {
          onboardingCompleted: true
        }),
      "初始化已保存"
    );
    if (success) {
      setShowOnboarding(false);
    }
  }

  if (!loaded) {
    return <div className="loading-screen">正在加载 PocketLedger…</div>;
  }

  return (
    <div className="app-shell">
      <div className="ambient ambient-a" />
      <div className="ambient ambient-b" />
      <div className="ambient ambient-c" />

      <main className="app-frame">
        <header className="hero-bar">
          <div className="brand-badge">
            <div className="brand-icon">账</div>
            <div>
              <h1>随心记账本</h1>
              <p>免费 · 开源 · 本地保存的大学生记账工具</p>
            </div>
          </div>

          <div className="hero-actions">
            <button className="month-switch" type="button" onClick={() => setMonthKey(shiftMonth(monthKey, -1))}>
              ←
            </button>
            <strong className="month-pill">{formatMonthLabel(monthKey)}</strong>
            <button className="month-switch" type="button" onClick={() => setMonthKey(shiftMonth(monthKey, 1))}>
              →
            </button>
            <button className="primary-button" type="button" onClick={handleOpenNewTransaction}>
              快速记一笔
            </button>
          </div>
        </header>

        {summary.alertLevel !== "normal" ? (
          <section className={`alert-card level-${summary.alertLevel}`}>
            <strong>{summary.alertLevel === "danger" ? "本月生活费已超支" : "本月生活费已使用超过 80%"}</strong>
            <span>
              当前支出 {formatCurrency(summary.totalExpense)}，剩余 {formatCurrency(summary.remaining)}。
            </span>
          </section>
        ) : null}

        <div className="workspace">
          <section className="content-panel">
            {activeTab === "dashboard" ? (
              <div className="dashboard-grid">
                <section className="calendar-card">
                  <SectionHeader
                    title="月历总览"
                    subtitle="把高频消费和本月节奏放在一起看"
                    action={
                      <button className="subtle-link" type="button" onClick={handleOpenNewTransaction}>
                        记一笔
                      </button>
                    }
                  />
                  <div className="calendar-head">
                    {["日", "一", "二", "三", "四", "五", "六"].map((item) => (
                      <span key={item}>{item}</span>
                    ))}
                  </div>
                  <div className="calendar-grid">
                    {calendarCells.map((cell, index) => (
                      <div key={`${cell.day}-${index}`} className={`calendar-cell ${cell.muted ? "is-muted" : ""} ${cell.amount > 0 ? "has-data" : ""}`}>
                        <strong>{cell.day}</strong>
                        <span>{cell.count ? Math.round(cell.amount) : "—"}</span>
                      </div>
                    ))}
                  </div>
                  <p className="calendar-footer">这个月已经认真记录了 {summary.recordDays} 天。</p>
                </section>

                <section className="allowance-card">
                  <SectionHeader title="本月生活费" subtitle="围绕剩余可支配金额设计，而不是只看流水" />
                  <div className="allowance-main">
                    <div>
                      <span>预算</span>
                      <strong>{formatCurrency(summary.allowance)}</strong>
                    </div>
                    <div>
                      <span>已花</span>
                      <strong>{formatCurrency(summary.totalExpense)}</strong>
                    </div>
                    <div>
                      <span>剩余</span>
                      <strong>{formatCurrency(summary.remaining)}</strong>
                    </div>
                  </div>
                  <div className="progress-track">
                    <div className={`progress-fill level-${summary.alertLevel}`} style={{ width: `${Math.min(summary.usageRate * 100, 100)}%` }} />
                  </div>
                  <div className="summary-row">
                    <SummaryCard label="本月收入" value={formatCurrency(summary.totalIncome)} tone="income" />
                    <SummaryCard label="本月支出" value={formatCurrency(summary.totalExpense)} tone="expense" />
                    <SummaryCard label="本月结余" value={formatCurrency(summary.balance)} tone={summary.balance >= 0 ? "default" : "expense"} />
                  </div>
                </section>

                <section className="accounts-card">
                  <SectionHeader title="我的账户" subtitle={`总资产 ${formatCurrency(data.accounts.reduce((sum, item) => sum + Number(item.balance || 0), 0))}`} />
                  <div className="account-grid">
                    {data.accounts.map((item) => (
                      <div className="account-chip" key={item.id}>
                        <span style={{ background: item.color }}>{item.symbol}</span>
                        <div>
                          <strong>{item.name}</strong>
                          <p>{formatCurrency(item.balance)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="recent-card">
                  <SectionHeader title="最近交易" subtitle="最近 6 条记录，方便核对和继续补记" />
                  <div className="transaction-stack">
                    {summary.recentTransactions.length ? (
                      summary.recentTransactions.map((item) => {
                        const display = getTransactionDisplay(item, lookup);
                        const isIncome = item.type === "income";
                        const isTransfer = item.type === "transfer";
                        return (
                          <button
                            key={item.id}
                            type="button"
                            className="transaction-row"
                            onClick={() => {
                              setEditingTransaction(item);
                              setDrawerOpen(true);
                            }}
                          >
                            <span className="txn-symbol" style={{ background: display.color }}>
                              {display.symbol}
                            </span>
                            <div className="txn-copy">
                              <strong>{display.title}</strong>
                              <p>{display.note}</p>
                              <em>{display.subtitle}</em>
                            </div>
                            <div className={`txn-amount ${isIncome ? "positive" : isTransfer ? "neutral" : "negative"}`}>
                              {isTransfer ? formatCurrency(item.amount) : formatAmountSigned(isIncome ? item.amount : -item.amount)}
                            </div>
                          </button>
                        );
                      })
                    ) : (
                      <div className="empty-state">
                        <strong>还没有交易</strong>
                        <p>先从一杯奶茶、一顿食堂，或者一笔生活费开始。</p>
                        <button className="primary-button" type="button" onClick={handleOpenNewTransaction}>
                          记第一笔
                        </button>
                      </div>
                    )}
                  </div>
                </section>
              </div>
            ) : null}

            {activeTab === "ledger" ? (
              <div className="ledger-layout">
                <SectionHeader
                  title="账单"
                  subtitle="支持按月份、类型、账户、分类和备注关键字筛选"
                  action={
                    <button className="primary-button small" type="button" onClick={handleOpenNewTransaction}>
                      新增交易
                    </button>
                  }
                />

                <section className="ledger-toolbar">
                  <div className="segmented-control compact">
                    {TRANSACTION_TABS.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className={filters.type === item.id ? "is-active" : ""}
                        onClick={() => setFilters((current) => ({ ...current, type: item.id }))}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>

                  <div className="filter-grid">
                    <select value={filters.accountId} onChange={(event) => setFilters((current) => ({ ...current, accountId: event.target.value }))}>
                      <option value="">全部账户</option>
                      {data.accounts.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                    <select value={filters.categoryId} onChange={(event) => setFilters((current) => ({ ...current, categoryId: event.target.value }))}>
                      <option value="">全部分类</option>
                      {data.categories
                        .filter((item) => filters.type === "all" || filters.type === "transfer" || item.type === filters.type)
                        .map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                          </option>
                        ))}
                    </select>
                    <input
                      value={filters.keyword}
                      onChange={(event) => setFilters((current) => ({ ...current, keyword: event.target.value }))}
                      placeholder="搜索备注、分类或账户"
                    />
                  </div>
                </section>

                <div className="ledger-list">
                  {groupedTransactions.length ? (
                    groupedTransactions.map((group) => (
                      <section className="ledger-group" key={group.date}>
                        <header>
                          <strong>{formatDateLabel(group.date)}</strong>
                          <span className={group.total >= 0 ? "positive" : "negative"}>
                            {formatAmountSigned(group.total)}
                          </span>
                        </header>
                        <div className="transaction-stack">
                          {group.items.map((item) => {
                            const display = getTransactionDisplay(item, lookup);
                            return (
                              <div className="transaction-row block" key={item.id}>
                                <button
                                  type="button"
                                  className="transaction-main"
                                  onClick={() => {
                                    setEditingTransaction(item);
                                    setDrawerOpen(true);
                                  }}
                                >
                                  <span className="txn-symbol" style={{ background: display.color }}>
                                    {display.symbol}
                                  </span>
                                  <div className="txn-copy">
                                    <strong>{display.title}</strong>
                                    <p>{display.note}</p>
                                    <em>{display.subtitle}</em>
                                  </div>
                                  <div className={`txn-amount ${item.type === "income" ? "positive" : item.type === "transfer" ? "neutral" : "negative"}`}>
                                    {item.type === "income"
                                      ? formatAmountSigned(item.amount)
                                      : item.type === "transfer"
                                        ? formatCurrency(item.amount)
                                        : formatAmountSigned(-item.amount)}
                                  </div>
                                </button>
                                <button className="ghost-danger" type="button" onClick={() => handleDeleteTransaction(item.id)}>
                                  删除
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </section>
                    ))
                  ) : (
                    <div className="empty-state">
                      <strong>当前筛选条件下没有记录</strong>
                      <p>可以清空筛选，或者直接新增一笔交易。</p>
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            {activeTab === "analytics" ? (
              <div className="analytics-grid">
                <section className="analytics-card analytics-hero">
                  <SectionHeader title="月度概览" subtitle={formatMonthLabel(monthKey)} />
                  <div className="analytics-summary">
                    <SummaryCard label="支出" value={formatCurrency(summary.totalExpense)} tone="expense" />
                    <SummaryCard label="收入" value={formatCurrency(summary.totalIncome)} tone="income" />
                    <SummaryCard label="结余" value={formatCurrency(summary.balance)} tone={summary.balance >= 0 ? "default" : "expense"} />
                    <SummaryCard label="记录天数" value={`${summary.recordDays} 天`} />
                  </div>
                </section>

                <section className="analytics-card">
                  <SectionHeader title="支出分类占比" subtitle="把主要花销看清楚，再决定怎么省" />
                  {expenseBreakdown.length ? (
                    <div className="donut-layout">
                      <DonutChart items={expenseBreakdown} total={summary.totalExpense} />
                      <div className="legend-list">
                        {expenseBreakdown.map((item) => (
                          <div className="legend-row" key={item.id}>
                            <div className="legend-copy">
                              <span className="legend-dot" style={{ background: item.color }} />
                              <strong>{item.name}</strong>
                            </div>
                            <span>{Math.round((item.amount / summary.totalExpense) * 100 || 0)}%</span>
                            <em>{formatCurrency(item.amount)}</em>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="empty-state compact">
                      <strong>本月还没有支出统计</strong>
                    </div>
                  )}
                </section>

                <section className="analytics-card">
                  <SectionHeader title="近 6 个月支出趋势" subtitle="帮助你看消费是否波动过大" />
                  <BarChart items={monthTrend} />
                </section>

                <section className="analytics-card">
                  <SectionHeader title="按账户查看支出" subtitle="看看钱更常从哪里流出去" />
                  <div className="legend-list">
                    {accountBreakdown.length ? (
                      accountBreakdown.map((item) => (
                        <div className="legend-row wide" key={item.id}>
                          <div className="legend-copy">
                            <span className="avatar-dot" style={{ background: item.color }}>
                              {item.symbol}
                            </span>
                            <strong>{item.name}</strong>
                          </div>
                          <div className="legend-bar">
                            <div style={{ width: `${(item.amount / summary.totalExpense) * 100 || 0}%`, background: item.color }} />
                          </div>
                          <em>{formatCurrency(item.amount)}</em>
                        </div>
                      ))
                    ) : (
                      <div className="empty-state compact">
                        <strong>本月还没有可分析的支出</strong>
                      </div>
                    )}
                  </div>
                </section>

                <section className="analytics-card">
                  <SectionHeader title="转账统计" subtitle="转账不会误算进收入或支出，但会单独记录" />
                  <div className="transfer-summary">
                    <SummaryCard label="本月转账总额" value={formatCurrency(summary.totalTransfer)} />
                    <SummaryCard label="转账笔数" value={`${summary.monthTransactions.filter((item) => item.type === "transfer").length} 笔`} />
                    <SummaryCard label="本地模式" value={hasNativeBridge() ? "Electron" : "浏览器"} />
                  </div>
                </section>
              </div>
            ) : null}

            {activeTab === "settings" ? (
              <div className="settings-layout">
                <section className="settings-hero">
                  <div className="brand-mini">
                    <div className="brand-icon">账</div>
                    <div>
                      <strong>随心记账本</strong>
                      <p>随心记录，清楚知道这个月还剩多少钱。</p>
                    </div>
                  </div>
                  <div className="settings-note">所有数据都保存在你的设备中，源码可开源维护。</div>
                </section>

                <section className="settings-card">
                  <SectionHeader
                    title="账户管理"
                    subtitle="支持新增、编辑、余额校准和删除自定义账户"
                    action={
                      <button
                        className="subtle-link"
                        type="button"
                        onClick={() => setAccountDraft({ name: "", symbol: "", type: "ewallet", balance: 0, color: "#f59ab6" })}
                      >
                        新增
                      </button>
                    }
                  />
                  <div className="settings-list">
                    {data.accounts.map((item) => (
                      <div className="settings-row" key={item.id}>
                        <div className="row-copy">
                          <span className="avatar-dot" style={{ background: item.color }}>
                            {item.symbol}
                          </span>
                          <div>
                            <strong>{item.name}</strong>
                            <p>{formatCurrency(item.balance)}</p>
                          </div>
                        </div>
                        <div className="row-actions">
                          <button className="subtle-link" type="button" onClick={() => setAccountDraft(item)}>
                            编辑
                          </button>
                          <button
                            className="subtle-link"
                            type="button"
                            onClick={() => setCalibrationDraft({ accountId: item.id, balance: item.balance, reason: "" })}
                          >
                            校准
                          </button>
                          {!item.system ? (
                            <button
                              className="ghost-danger"
                              type="button"
                              onClick={() => commit((current) => deleteAccount(current, item.id), "账户已删除")}
                            >
                              删除
                            </button>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="settings-card">
                  <SectionHeader
                    title="分类管理"
                    subtitle="区分收入与支出分类，可新增自定义分类"
                    action={
                      <button
                        className="subtle-link"
                        type="button"
                        onClick={() => setCategoryDraft({ name: "", symbol: "", type: "expense", color: "#f48db0" })}
                      >
                        新增
                      </button>
                    }
                  />
                  <div className="dual-column-list">
                    {["expense", "income"].map((type) => (
                      <div key={type}>
                        <h3>{type === "expense" ? "支出分类" : "收入分类"}</h3>
                        <div className="compact-list">
                          {data.categories
                            .filter((item) => item.type === type)
                            .map((item) => (
                              <div className="settings-row compact" key={item.id}>
                                <div className="row-copy">
                                  <span className="avatar-dot" style={{ background: item.color }}>
                                    {item.symbol}
                                  </span>
                                  <strong>{item.name}</strong>
                                </div>
                                <div className="row-actions">
                                  <button className="subtle-link" type="button" onClick={() => setCategoryDraft(item)}>
                                    编辑
                                  </button>
                                  {!item.system ? (
                                    <button
                                      className="ghost-danger"
                                      type="button"
                                      onClick={() => commit((current) => deleteCategory(current, item.id), "分类已删除")}
                                    >
                                      删除
                                    </button>
                                  ) : null}
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="settings-card">
                  <SectionHeader title="生活费设置" subtitle="首页核心指标，可手动调整预算与超支提醒" />
                  <div className="budget-form">
                    <label className="form-field">
                      <span>月生活费</span>
                      <input
                        value={data.settings.monthlyAllowance}
                        inputMode="decimal"
                        onChange={(event) =>
                          commit((current) => updateSettings(current, { monthlyAllowance: Number(event.target.value || 0) }))
                        }
                      />
                    </label>
                    <label className="toggle-field">
                      <span>启用超支提醒</span>
                      <input
                        type="checkbox"
                        checked={Boolean(data.settings.enableOverspendAlert)}
                        onChange={(event) =>
                          commit((current) => updateSettings(current, { enableOverspendAlert: event.target.checked }))
                        }
                      />
                    </label>
                    <button className="action-button" type="button" onClick={() => setShowOnboarding(true)}>
                      重新打开首启引导
                    </button>
                  </div>
                </section>

                <section className="settings-card">
                  <SectionHeader title="数据管理" subtitle="支持 JSON 导入、JSON/CSV 导出和本地目录查看" />
                  <div className="action-grid">
                    <button className="action-button" type="button" onClick={handleExportJson}>
                      导出 JSON
                    </button>
                    <button className="action-button" type="button" onClick={handleExportCsv}>
                      导出 CSV
                    </button>
                    <button className="action-button" type="button" onClick={handleImportJson}>
                      导入 JSON
                    </button>
                    <button className="action-button" type="button" onClick={() => void openDataDirectory()}>
                      打开数据目录
                    </button>
                    <button className="action-button warning" type="button" onClick={() => commit((current) => resetToDefault(current), "已重置为默认空账本")}>
                      清空交易数据
                    </button>
                  </div>
                  <div className="data-location">
                    <strong>数据位置</strong>
                    <p>{dataLocation?.filePath || "载入中..."}</p>
                  </div>
                </section>

                <section className="settings-card">
                  <SectionHeader title="校准日志" subtitle="保留账户余额手动调整记录，方便追溯" />
                  <div className="compact-list">
                    {data.adjustmentLogs.length ? (
                      data.adjustmentLogs.slice(0, 8).map((item) => {
                        const account = lookup.accountMap.get(item.accountId);
                        return (
                          <div className="settings-row compact" key={item.id}>
                            <div className="row-copy">
                              <span className="avatar-dot" style={{ background: account?.color || "#f1a1ba" }}>
                                {account?.symbol || "账"}
                              </span>
                              <div>
                                <strong>{account?.name || "未知账户"}</strong>
                                <p>{clampText(item.reason, 18)}</p>
                              </div>
                            </div>
                            <em>{formatAmountSigned(item.delta)}</em>
                          </div>
                        );
                      })
                    ) : (
                      <div className="empty-state compact">
                        <strong>还没有校准记录</strong>
                      </div>
                    )}
                  </div>
                </section>
              </div>
            ) : null}
          </section>
        </div>

        <nav className="bottom-nav">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`${item.id === "quick" ? "fab" : ""} ${activeTab === item.id ? "is-active" : ""}`}
              onClick={() => {
                if (item.id === "quick") {
                  handleOpenNewTransaction();
                  return;
                }

                setActiveTab(item.id);
              }}
            >
              <span>{item.icon}</span>
              <strong>{item.label}</strong>
            </button>
          ))}
        </nav>
      </main>

      <QuickEntryDrawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setEditingTransaction(null);
        }}
        onSubmit={handleSaveTransaction}
        initialTransaction={editingTransaction}
        accounts={data.accounts}
        categories={data.categories}
      />

      <Modal open={Boolean(accountDraft)} title={accountDraft?.id ? "编辑账户" : "新增账户"} onClose={() => setAccountDraft(null)}>
        {accountDraft ? (
          <form className="modal-form" onSubmit={handleSaveAccount}>
            <div className="form-row">
              <label className="form-field">
                <span>名称</span>
                <input value={accountDraft.name} onChange={(event) => setAccountDraft((current) => ({ ...current, name: event.target.value }))} />
              </label>
              <label className="form-field">
                <span>简称</span>
                <input
                  maxLength={1}
                  value={accountDraft.symbol}
                  onChange={(event) => setAccountDraft((current) => ({ ...current, symbol: event.target.value }))}
                />
              </label>
            </div>
            <div className="form-row">
              <label className="form-field">
                <span>类型</span>
                <select value={accountDraft.type} onChange={(event) => setAccountDraft((current) => ({ ...current, type: event.target.value }))}>
                  <option value="ewallet">电子钱包</option>
                  <option value="bank">银行卡</option>
                  <option value="cash">现金</option>
                </select>
              </label>
              <label className="form-field">
                <span>余额</span>
                <input
                  inputMode="decimal"
                  value={accountDraft.balance}
                  onChange={(event) => setAccountDraft((current) => ({ ...current, balance: event.target.value }))}
                />
              </label>
            </div>
            <button className="primary-button" type="submit">
              保存账户
            </button>
          </form>
        ) : null}
      </Modal>

      <Modal open={Boolean(categoryDraft)} title={categoryDraft?.id ? "编辑分类" : "新增分类"} onClose={() => setCategoryDraft(null)}>
        {categoryDraft ? (
          <form className="modal-form" onSubmit={handleSaveCategory}>
            <div className="form-row">
              <label className="form-field">
                <span>名称</span>
                <input value={categoryDraft.name} onChange={(event) => setCategoryDraft((current) => ({ ...current, name: event.target.value }))} />
              </label>
              <label className="form-field">
                <span>简称</span>
                <input
                  maxLength={1}
                  value={categoryDraft.symbol}
                  onChange={(event) => setCategoryDraft((current) => ({ ...current, symbol: event.target.value }))}
                />
              </label>
            </div>
            <div className="form-row">
              <label className="form-field">
                <span>类型</span>
                <select value={categoryDraft.type} onChange={(event) => setCategoryDraft((current) => ({ ...current, type: event.target.value }))}>
                  <option value="expense">支出</option>
                  <option value="income">收入</option>
                </select>
              </label>
              <label className="form-field">
                <span>色彩</span>
                <input value={categoryDraft.color} onChange={(event) => setCategoryDraft((current) => ({ ...current, color: event.target.value }))} />
              </label>
            </div>
            <button className="primary-button" type="submit">
              保存分类
            </button>
          </form>
        ) : null}
      </Modal>

      <Modal open={Boolean(calibrationDraft)} title="校准账户余额" onClose={() => setCalibrationDraft(null)}>
        {calibrationDraft ? (
          <form className="modal-form" onSubmit={handleCalibrateAccount}>
            <label className="form-field">
              <span>新余额</span>
              <input
                inputMode="decimal"
                value={calibrationDraft.balance}
                onChange={(event) => setCalibrationDraft((current) => ({ ...current, balance: event.target.value }))}
              />
            </label>
            <label className="form-field">
              <span>备注</span>
              <input
                value={calibrationDraft.reason}
                onChange={(event) => setCalibrationDraft((current) => ({ ...current, reason: event.target.value }))}
                placeholder="例如：补记前天漏掉的超市消费"
              />
            </label>
            <button className="primary-button" type="submit">
              保存校准
            </button>
          </form>
        ) : null}
      </Modal>

      <Modal open={showOnboarding} title="开始使用 PocketLedger" onClose={() => setShowOnboarding(false)}>
        <form className="modal-form" onSubmit={handleFinishOnboarding}>
          <p className="onboarding-copy">
            先设置本月生活费，再补充微信、支付宝、银行卡、现金余额。完成这一步之后，下载下来的应用就能直接开始记账。
          </p>
          <label className="form-field">
            <span>本月生活费</span>
            <input
              inputMode="decimal"
              value={data.settings.monthlyAllowance}
              onChange={(event) =>
                commit((current) => updateSettings(current, { monthlyAllowance: Number(event.target.value || 0) }))
              }
            />
          </label>
          <div className="compact-list">
            {data.accounts.map((item) => (
              <label className="form-field" key={item.id}>
                <span>{item.name} 当前余额</span>
                <input
                  inputMode="decimal"
                  value={item.balance}
                  onChange={(event) =>
                    commit((current) => upsertAccount(current, { ...item, balance: event.target.value }))
                  }
                />
              </label>
            ))}
          </div>
          <div className="modal-actions">
            <button className="ghost-button" type="button" onClick={() => setShowOnboarding(false)}>
              暂时跳过
            </button>
            <button className="primary-button" type="submit">
              完成初始化
            </button>
          </div>
        </form>
      </Modal>

      {toast ? <div className="toast">{toast}</div> : null}
    </div>
  );
}
