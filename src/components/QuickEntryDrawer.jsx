import { useEffect, useState } from "react";
import { getTodayString } from "../lib/format";

const TYPE_OPTIONS = [
  { id: "expense", label: "支出" },
  { id: "income", label: "收入" },
  { id: "transfer", label: "转账" }
];

function buildDraft(initialTransaction) {
  return {
    id: initialTransaction?.id,
    type: initialTransaction?.type || "expense",
    amount: initialTransaction?.amount || "",
    accountId: initialTransaction?.accountId || "",
    categoryId: initialTransaction?.categoryId || "",
    fromAccountId: initialTransaction?.fromAccountId || "",
    toAccountId: initialTransaction?.toAccountId || "",
    date: initialTransaction?.date || getTodayString(),
    note: initialTransaction?.note || ""
  };
}

export default function QuickEntryDrawer({
  open,
  onClose,
  onSubmit,
  initialTransaction,
  accounts,
  categories
}) {
  const [draft, setDraft] = useState(buildDraft(initialTransaction));

  useEffect(() => {
    setDraft(buildDraft(initialTransaction));
  }, [initialTransaction, open]);

  const visibleCategories = categories.filter((item) => item.type === draft.type);

  useEffect(() => {
    if ((draft.type === "expense" || draft.type === "income") && !draft.categoryId) {
      setDraft((current) => ({
        ...current,
        categoryId: categories.find((item) => item.type === current.type)?.id || ""
      }));
    }

    if ((draft.type === "expense" || draft.type === "income") && !draft.accountId) {
      setDraft((current) => ({
        ...current,
        accountId: accounts[0]?.id || ""
      }));
    }

    if (draft.type === "transfer" && (!draft.fromAccountId || !draft.toAccountId)) {
      setDraft((current) => ({
        ...current,
        fromAccountId: current.fromAccountId || accounts[0]?.id || "",
        toAccountId: current.toAccountId || accounts[1]?.id || accounts[0]?.id || ""
      }));
    }
  }, [accounts, categories, draft.type, draft.categoryId, draft.accountId, draft.fromAccountId, draft.toAccountId]);

  function updateField(field, value) {
    setDraft((current) => ({
      ...current,
      [field]: value
    }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    const amount = Number(draft.amount || 0);

    if (!amount) {
      return;
    }

    onSubmit({
      ...draft,
      amount
    });
  }

  return (
    <div className={`drawer-overlay ${open ? "is-open" : ""}`} onClick={onClose}>
      <aside className={`quick-drawer ${open ? "is-open" : ""}`} onClick={(event) => event.stopPropagation()}>
        <header className="drawer-header">
          <button className="ghost-button" type="button" onClick={onClose}>
            关闭
          </button>
          <div>
            <p>快速记账</p>
            <strong>{initialTransaction ? "编辑记录" : "10 秒记下一笔"}</strong>
          </div>
        </header>

        <form className="drawer-form" onSubmit={handleSubmit}>
          <div className="segmented-control">
            {TYPE_OPTIONS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={draft.type === item.id ? "is-active" : ""}
                onClick={() =>
                  setDraft((current) => ({
                    ...current,
                    type: item.id,
                    categoryId: item.id === "transfer" ? "" : categories.find((category) => category.type === item.id)?.id || "",
                    accountId: item.id === "transfer" ? "" : accounts[0]?.id || ""
                  }))
                }
              >
                {item.label}
              </button>
            ))}
          </div>

          <label className="form-field">
            <span>金额</span>
            <input
              value={draft.amount}
              onChange={(event) => updateField("amount", event.target.value)}
              inputMode="decimal"
              placeholder="0.00"
            />
          </label>

          {draft.type !== "transfer" ? (
            <>
              <div className="quick-pills">
                {[1, 10, 20, 50, 100].map((value) => (
                  <button
                    key={value}
                    type="button"
                    className="mini-pill"
                    onClick={() => updateField("amount", Number(draft.amount || 0) + value)}
                  >
                    +{value}
                  </button>
                ))}
              </div>

              <section className="drawer-card">
                <div className="section-title">
                  <span>分类</span>
                  <em>{visibleCategories.length} 个可选</em>
                </div>
                <div className="icon-grid">
                  {visibleCategories.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={`icon-tile ${draft.categoryId === item.id ? "is-active" : ""}`}
                      onClick={() => updateField("categoryId", item.id)}
                    >
                      <span style={{ background: item.color }}>{item.symbol}</span>
                      <strong>{item.name}</strong>
                    </button>
                  ))}
                </div>
              </section>

              <section className="drawer-card">
                <div className="section-title">
                  <span>账户</span>
                </div>
                <div className="pill-list">
                  {accounts.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={`pill-chip ${draft.accountId === item.id ? "is-active" : ""}`}
                      onClick={() => updateField("accountId", item.id)}
                    >
                      <span style={{ background: item.color }}>{item.symbol}</span>
                      {item.name}
                    </button>
                  ))}
                </div>
              </section>
            </>
          ) : (
            <section className="drawer-card">
              <div className="transfer-grid">
                <label className="form-field">
                  <span>转出账户</span>
                  <select value={draft.fromAccountId} onChange={(event) => updateField("fromAccountId", event.target.value)}>
                    {accounts.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="form-field">
                  <span>转入账户</span>
                  <select value={draft.toAccountId} onChange={(event) => updateField("toAccountId", event.target.value)}>
                    {accounts.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </section>
          )}

          <section className="drawer-card">
            <div className="form-row">
              <label className="form-field">
                <span>日期</span>
                <input type="date" value={draft.date} onChange={(event) => updateField("date", event.target.value)} />
              </label>
              <label className="form-field">
                <span>备注</span>
                <input
                  value={draft.note}
                  maxLength={60}
                  onChange={(event) => updateField("note", event.target.value)}
                  placeholder="选填，记录一下吃了什么"
                />
              </label>
            </div>
          </section>

          <button className="primary-button large" type="submit">
            {initialTransaction ? "保存修改" : "保存"}
          </button>
        </form>
      </aside>
    </div>
  );
}
