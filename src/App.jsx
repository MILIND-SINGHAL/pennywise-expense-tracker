import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  BarChart3,
  Bell,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  CreditCard,
  Download,
  FileText,
  HeartPulse,
  Home,
  MoreHorizontal,
  Plus,
  Search,
  Settings,
  ShoppingBag,
  Sparkles,
  Trash2,
  TrainFront,
  Utensils,
  Wallet,
  X
} from "lucide-react";

const categoryStyles = {
  Food: { icon: Utensils, color: "#eb8c5a", background: "#fff1e9" },
  Transport: { icon: TrainFront, color: "#6485dc", background: "#edf1ff" },
  Shopping: { icon: ShoppingBag, color: "#a27bd4", background: "#f4efff" },
  Bills: { icon: FileText, color: "#5c9d87", background: "#eaf7f1" },
  Health: { icon: HeartPulse, color: "#df7186", background: "#fff0f2" },
  Entertainment: { icon: Sparkles, color: "#c69042", background: "#fff6e6" },
  Other: { icon: CreditCard, color: "#748091", background: "#f0f2f5" }
};
const categories = Object.keys(categoryStyles);
const navItems = [
  { label: "Overview", icon: Home },
  { label: "Transactions", icon: CreditCard },
  { label: "Budgets", icon: BarChart3 },
  { label: "Reports", icon: FileText },
  { label: "Settings", icon: Settings },
  { label: "Help center", icon: CircleHelp }
];
const monthFormat = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" });
const pageDescriptions = {
  Overview: ["YOUR MONEY, MADE CLEAR", "Here’s what’s happening with your money."],
  Transactions: ["EVERY LITTLE MONEY MOVE", "Search, filter, and manage all your expenses."],
  Budgets: ["A PLAN THAT FEELS GOOD", "Set monthly category limits and keep spending in check."],
  Reports: ["THE BIGGER PICTURE", "Understand your habits with a monthly spending breakdown."],
  Settings: ["MAKE IT YOURS", "Manage your profile and display preferences."],
  "Help center": ["HERE WHEN YOU NEED US", "Quick answers to common questions."]
};

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function getPreviousMonth(value) {
  const [year, month] = value.split("-").map(Number);
  return `${month === 1 ? year - 1 : year}-${String(month === 1 ? 12 : month - 1).padStart(2, "0")}`;
}

function monthLabel(value) {
  const [year, month] = value.split("-").map(Number);
  return monthFormat.format(new Date(year, month - 1, 1));
}

function dateLabel(value) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function initials(name) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() || "").join("") || "K";
}

function App() {
  const [expenses, setExpenses] = useState([]);
  const [allExpenses, setAllExpenses] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [previousTotal, setPreviousTotal] = useState(0);
  const [month, setMonth] = useState(currentMonth);
  const [activePage, setActivePage] = useState("Overview");
  const [userName, setUserName] = useState(() => localStorage.getItem("pennywise.name") || "Kaif");
  const [currency, setCurrency] = useState(() => localStorage.getItem("pennywise.currency") || "USD");
  const [categoryFilter, setCategoryFilter] = useState("All categories");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [budgetModalOpen, setBudgetModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const money = useMemo(() => new Intl.NumberFormat("en-US", { style: "currency", currency }), [currency]);

  async function loadExpenses() {
    setLoading(true);
    setError("");
    try {
      const [response, previousResponse] = await Promise.all([
        fetch(`/api/expenses?month=${month}`),
        fetch(`/api/expenses?month=${getPreviousMonth(month)}`)
      ]);
      if (!response.ok || !previousResponse.ok) throw new Error("Could not load expenses.");
      const [currentExpenses, previousExpenses] = await Promise.all([response.json(), previousResponse.json()]);
      setExpenses(currentExpenses);
      setPreviousTotal(previousExpenses.reduce((sum, expense) => sum + expense.amount, 0));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadExpenses();
  }, [month]);

  useEffect(() => {
    if (activePage !== "Reports") return;
    fetch("/api/expenses")
      .then((response) => {
        if (!response.ok) throw new Error("Could not load report data.");
        return response.json();
      })
      .then(setAllExpenses)
      .catch((requestError) => setError(requestError.message));
  }, [activePage, month]);

  useEffect(() => {
    if (activePage !== "Budgets") return;
    fetch("/api/budgets")
      .then((response) => {
        if (!response.ok) throw new Error("Could not load budgets.");
        return response.json();
      })
      .then(setBudgets)
      .catch((requestError) => setError(requestError.message));
  }, [activePage]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const filteredExpenses = useMemo(() => {
    const query = search.trim().toLowerCase();
    return expenses.filter((expense) => {
      const matchesCategory = categoryFilter === "All categories" || expense.category === categoryFilter;
      const matchesSearch = !query || `${expense.title} ${expense.category} ${expense.note}`.toLowerCase().includes(query);
      return matchesCategory && matchesSearch;
    });
  }, [expenses, categoryFilter, search]);

  const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const spendingChange = previousTotal > 0 ? ((total - previousTotal) / previousTotal) * 100 : null;
  const maxCategory = Math.max(...categories.map((category) =>
    expenses.filter((expense) => expense.category === category).reduce((sum, expense) => sum + expense.amount, 0)
  ), 1);
  const categoryTotals = categories
    .map((category) => ({
      category,
      amount: expenses.filter((expense) => expense.category === category).reduce((sum, expense) => sum + expense.amount, 0)
    }))
    .filter((item) => item.amount > 0)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 4);
  const reportExpenses = allExpenses.filter((expense) => expense.date.startsWith(month));
  const reportTotal = reportExpenses.reduce((sum, expense) => sum + expense.amount, 0);

  async function saveExpense(payload) {
    const isEditing = Boolean(editingExpense);
    const response = await fetch(isEditing ? `/api/expenses/${editingExpense.id}` : "/api/expenses", {
      method: isEditing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const result = response.status === 204 ? null : await response.json();
    if (!response.ok) throw new Error(result?.error || "Could not save expense.");
    setModalOpen(false);
    setEditingExpense(null);
    setToast(isEditing ? "Expense updated" : "Expense added");
    await loadExpenses();
  }

  async function deleteExpense(id) {
    if (!window.confirm("Delete this expense? This action can’t be undone.")) return;
    try {
      const response = await fetch(`/api/expenses/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Could not delete expense.");
      }
      setToast("Expense deleted");
      await loadExpenses();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function loadBudgets() {
    const response = await fetch("/api/budgets");
    if (!response.ok) throw new Error("Could not load budgets.");
    setBudgets(await response.json());
  }

  async function saveBudget(payload) {
    const isEditing = Boolean(editingBudget);
    const response = await fetch(isEditing ? `/api/budgets/${editingBudget.id}` : "/api/budgets", {
      method: isEditing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const result = response.status === 204 ? null : await response.json();
    if (!response.ok) throw new Error(result?.error || "Could not save budget.");
    setBudgetModalOpen(false);
    setEditingBudget(null);
    setToast(isEditing ? "Budget updated" : "Budget created");
    await loadBudgets();
  }

  async function deleteBudget(id) {
    if (!window.confirm("Delete this budget?")) return;
    try {
      const response = await fetch(`/api/budgets/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Could not delete budget.");
      }
      setToast("Budget deleted");
      await loadBudgets();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  function saveSettings(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const nextName = String(formData.get("name") || "").trim();
    if (!nextName) {
      setError("Enter a name before saving your profile.");
      return;
    }
    const nextCurrency = String(formData.get("currency"));
    setUserName(nextName);
    setCurrency(nextCurrency);
    localStorage.setItem("pennywise.name", nextName);
    localStorage.setItem("pennywise.currency", nextCurrency);
    setToast("Settings saved");
    setError("");
  }

  function exportReport(reportExpenses) {
    const rows = [["Date", "Title", "Category", "Amount", "Note"], ...reportExpenses.map((expense) => [
      expense.date, expense.title, expense.category, expense.amount.toFixed(2), expense.note || ""
    ])];
    const csv = rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `pennywise-${month}-report.csv`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setToast("Report downloaded");
  }

  function moveMonth(direction) {
    const [year, number] = month.split("-").map(Number);
    const date = new Date(year, number - 1 + direction, 1);
    setMonth(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`);
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#" aria-label="Pennywise home">
          <span className="brand-mark"><Wallet size={19} strokeWidth={2.2} /></span>
          <span>pennywise<span className="brand-period">.</span></span>
        </a>
        <div className="workspace-label">WORKSPACE</div>
        <button className="workspace-switch" onClick={() => setActivePage("Settings")} title="Open account settings">
          <span className="workspace-avatar">{initials(userName).slice(0, 1)}</span>
          <span className="workspace-text"><strong>{userName}’s space</strong><small>Personal account</small></span>
          <ChevronDown size={16} />
        </button>
        <div className="nav-label">MENU</div>
        <nav className="main-nav" aria-label="Main navigation">
          {navItems.slice(0, 4).map(({ label, icon: Icon }) => (
            <button key={label} aria-label={label} className={`nav-item ${activePage === label ? "active" : ""}`} onClick={() => { setActivePage(label); setError(""); }}>
              <Icon size={18} strokeWidth={1.8} /><span>{label}</span>
              {label === "Transactions" && <span className="nav-count">{expenses.length}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-tip">
            <div className="tip-icon"><Sparkles size={16} /></div>
            <strong>Little steps add up.</strong>
            <p>You’re building a great money habit. Keep going!</p>
            <div className="tip-progress"><span /></div>
            <small>4 day streak <span>✨</span></small>
          </div>
          {navItems.slice(4).map(({ label, icon: Icon }) => <button key={label} aria-label={label} className={`nav-item muted-nav ${activePage === label ? "active" : ""}`} onClick={() => { setActivePage(label); setError(""); }}><Icon size={18} /><span>{label}</span></button>)}
          <div className="profile-row">
            <div className="profile-avatar">{initials(userName)}</div>
            <div className="profile-name"><strong>{userName}</strong><small>Personal account</small></div>
            <button className="profile-more" aria-label="Open settings" onClick={() => setActivePage("Settings")}><MoreHorizontal size={19} /></button>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumbs">Workspace <span>/</span> <strong>{activePage}</strong></div>
          <div className="topbar-actions">
            <div className="date-chip"><CalendarDays size={15} /> {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</div>
            <button className="icon-button notification-button" aria-label="Notifications" onClick={() => setToast("You’re all caught up")}><Bell size={18} /><i /></button>
            <div className="profile-avatar top-avatar">{initials(userName)}</div>
          </div>
        </header>
        <div className="page-content">
          <div className="page-heading">
            <div><p className="eyebrow">{pageDescriptions[activePage][0]}</p><h1>{activePage === "Overview" ? `Good afternoon, ${userName}` : activePage}<span>✦</span></h1><p className="page-subtitle">{pageDescriptions[activePage][1]}</p></div>
            {(activePage === "Overview" || activePage === "Transactions") && <button className="primary-button" onClick={() => { setEditingExpense(null); setModalOpen(true); }}><Plus size={17} /> Add expense</button>}
          </div>

          {error && <div className="error-banner" role="alert">{error}<button onClick={() => { setError(""); if (activePage === "Budgets") loadBudgets().catch((requestError) => setError(requestError.message)); else loadExpenses(); }}>Try again</button></div>}
          {activePage === "Overview" ? <>
          <section className="summary-grid" aria-label="Monthly summary">
            <article className="summary-card total-card">
              <div className="card-topline"><span>Total spending</span><span className="summary-icon violet"><Wallet size={17} /></span></div>
              <div className="summary-value">{loading ? "—" : money.format(total)}</div>
              <div className="summary-footer">{spendingChange === null ? <span className="trend-pill neutral">No prior data</span> : <span className={`trend-pill ${spendingChange > 0 ? "spending-up" : ""}`}>{spendingChange > 0 ? <ArrowUpRight size={13} /> : <ArrowDownLeft size={13} />}{Math.abs(spendingChange).toFixed(1)}%</span>}<span>vs. last month</span><span className="summary-period">{monthLabel(month).split(" ")[0]}</span></div>
              <div className="sparkline" aria-hidden="true"><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /></div>
            </article>
            <article className="summary-card">
              <div className="card-topline"><span>Transactions</span><span className="summary-icon peach"><ArrowUpRight size={17} /></span></div>
              <div className="summary-value">{loading ? "—" : expenses.length}<span className="value-unit"> transactions</span></div>
              <div className="summary-footer"><span className="trend-pill neutral">This month</span><span className="summary-caption">across {new Set(expenses.map((expense) => expense.category)).size} categories</span></div>
              <div className="mini-bars" aria-hidden="true">{[26, 38, 31, 48, 36, 58, 42, 70, 50, 64, 45, 80, 57, 68, 47, 74, 54, 91].map((height, index) => <i key={index} style={{ height: `${height}%` }} />)}</div>
            </article>
            <article className="summary-card">
              <div className="card-topline"><span>Average per day</span><span className="summary-icon mint"><BarChart3 size={17} /></span></div>
              <div className="summary-value">{loading ? "—" : money.format(total / Math.max(month === currentMonth() ? new Date().getDate() : new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate(), 1))}</div>
              <div className="summary-footer"><span className="trend-pill neutral">{monthLabel(month).split(" ")[0]}</span><span className="summary-caption">daily average</span></div>
              <div className="average-dots" aria-hidden="true">{Array.from({ length: 28 }, (_, index) => <i key={index} className={index % 4 === 0 ? "dot-accent" : ""} />)}</div>
            </article>
          </section>

          <section className="insights-grid">
            <article className="panel spending-panel">
              <div className="panel-heading">
                <div><h2>Spending overview</h2><p>A closer look at your expenses</p></div>
                <div className="month-picker"><button aria-label="Previous month" onClick={() => moveMonth(-1)}><ChevronLeft size={16} /></button><span>{monthLabel(month)}</span><button aria-label="Next month" onClick={() => moveMonth(1)}><ChevronRight size={16} /></button></div>
              </div>
              {categoryTotals.length ? (
                <div className="category-chart">
                  <div className="chart-total"><span>{money.format(total)}</span><small>total this month</small></div>
                  <div className="chart-bars">
                    {categoryTotals.map(({ category, amount }) => {
                      const style = categoryStyles[category];
                      return <div className="chart-row" key={category}><div className="chart-label"><span className="chart-dot" style={{ background: style.color }} />{category}</div><div className="chart-track"><div className="chart-fill" style={{ width: `${Math.max((amount / maxCategory) * 100, 4)}%`, background: style.color }} /></div><span className="chart-amount">{money.format(amount)}</span></div>;
                    })}
                  </div>
                  <div className="chart-footnote"><span><i className="legend-dot" /> Spending by category</span><span>{monthLabel(month)}</span></div>
                </div>
              ) : (
                <div className="empty-chart"><div className="empty-chart-icon"><BarChart3 size={20} /></div><strong>No spending to show yet</strong><span>Add an expense to see your breakdown.</span><button onClick={() => setModalOpen(true)}>Add your first expense <ArrowUpRight size={14} /></button></div>
              )}
            </article>
            <article className="panel category-panel">
              <div className="panel-heading"><div><h2>Top categories</h2><p>Where your money goes</p></div><button className="more-button" aria-label="More category options" onClick={() => setToast("Category insights are up to date")}><MoreHorizontal size={20} /></button></div>
              {categoryTotals.length ? <div className="category-list">
                {categoryTotals.slice(0, 3).map(({ category, amount }) => {
                  const style = categoryStyles[category];
                  const Icon = style.icon;
                  return <div className="category-item" key={category}><span className="category-icon" style={{ color: style.color, background: style.background }}><Icon size={17} /></span><span className="category-name"><strong>{category}</strong><small>{expenses.filter((expense) => expense.category === category).length} transactions</small></span><span className="category-amount">{money.format(amount)}</span></div>;
                })}
              </div> : <div className="category-empty">Your category insights will show up here.</div>}
              <button className="text-button" onClick={() => setActivePage("Transactions")}>View all transactions <ChevronRight size={15} /></button>
            </article>
          </section>

          <section className="panel transactions-panel">
            <div className="panel-heading transactions-heading">
              <div><h2>Recent transactions</h2><p>Your latest money moves</p></div>
              <div className="transaction-tools">
                <label className="search-field"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search..." aria-label="Search transactions" />{search && <button aria-label="Clear search" onClick={() => setSearch("")}><X size={14} /></button>}</label>
                <label className="filter-select"><select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} aria-label="Filter by category"><option>All categories</option>{categories.map((category) => <option key={category}>{category}</option>)}</select><ChevronDown size={14} /></label>
                <button className="more-button" aria-label="More transaction options" onClick={() => setToast("You’re viewing the latest transactions")}><MoreHorizontal size={20} /></button>
              </div>
            </div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>TRANSACTION</th><th>CATEGORY</th><th>DATE</th><th>AMOUNT</th><th aria-label="Actions" /></tr></thead>
                <tbody>
                  {loading ? <tr><td className="table-message" colSpan="5">Loading transactions…</td></tr> :
                    filteredExpenses.length ? filteredExpenses.slice(0, 7).map((expense) => {
                      const style = categoryStyles[expense.category] || categoryStyles.Other;
                      const Icon = style.icon;
                      return <tr key={expense.id}>
                        <td><div className="transaction-title"><span className="transaction-icon" style={{ background: style.background, color: style.color }}><Icon size={16} /></span><span><strong>{expense.title}</strong><small>{expense.note || expense.category}</small></span></div></td>
                        <td><span className="category-tag"><i style={{ background: style.color }} />{expense.category}</span></td>
                        <td className="date-cell">{dateLabel(expense.date)}</td>
                        <td className="amount-cell">−{money.format(expense.amount)}</td>
                        <td><div className="row-actions"><button title="Edit expense" aria-label={`Edit ${expense.title}`} onClick={() => { setEditingExpense(expense); setModalOpen(true); }}><Settings size={14} /></button><button title="Delete expense" aria-label={`Delete ${expense.title}`} onClick={() => deleteExpense(expense.id)}><X size={15} /></button></div></td>
                      </tr>;
                    }) : <tr><td className="table-message" colSpan="5">{expenses.length ? "No transactions match your search." : "No expenses this month yet. Add one to get started!"}</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="table-footer"><span>Showing <strong>{Math.min(filteredExpenses.length, 7)}</strong> of <strong>{filteredExpenses.length}</strong> transactions</span><button onClick={() => setActivePage("Transactions")}>View all transactions <ChevronRight size={14} /></button></div>
          </section>
          <footer className="page-footer"><span>Made for a little more peace of mind <span>♡</span></span><span>All your data stays yours.</span></footer>
          </> : activePage === "Transactions" ? <TransactionsPage
            expenses={filteredExpenses}
            totalCount={expenses.length}
            month={month}
            setMonth={setMonth}
            categoryFilter={categoryFilter}
            setCategoryFilter={setCategoryFilter}
            search={search}
            setSearch={setSearch}
            loading={loading}
            onEdit={(expense) => { setEditingExpense(expense); setModalOpen(true); }}
            onDelete={deleteExpense}
            onExport={() => exportReport(filteredExpenses)}
            money={money}
          /> : activePage === "Budgets" ? <BudgetsPage
            budgets={budgets.filter((budget) => budget.month === month)}
            expenses={expenses}
            month={month}
            setMonth={setMonth}
            money={money}
            onAdd={() => { setEditingBudget(null); setBudgetModalOpen(true); }}
            onEdit={(budget) => { setEditingBudget(budget); setBudgetModalOpen(true); }}
            onDelete={deleteBudget}
          /> : activePage === "Reports" ? <ReportsPage
            expenses={reportExpenses}
            total={reportTotal}
            month={month}
            setMonth={setMonth}
            money={money}
            onExport={() => exportReport(reportExpenses)}
          /> : activePage === "Settings" ? <SettingsPage userName={userName} currency={currency} onSave={saveSettings} /> : <HelpPage />}
        </div>
      </main>

      {modalOpen && <ExpenseModal expense={editingExpense} onClose={() => { setModalOpen(false); setEditingExpense(null); }} onSave={saveExpense} />}
      {budgetModalOpen && <BudgetModal budget={editingBudget} month={month} onClose={() => { setBudgetModalOpen(false); setEditingBudget(null); }} onSave={saveBudget} />}
      {toast && <div className="toast"><span className="toast-check">✓</span>{toast}</div>}
    </div>
  );
}

function TransactionsPage({ expenses, totalCount, month, setMonth, categoryFilter, setCategoryFilter, search, setSearch, loading, onEdit, onDelete, onExport, money }) {
  const [visibleCount, setVisibleCount] = useState(10);
  const pageExpenses = expenses.slice(0, visibleCount);

  useEffect(() => setVisibleCount(10), [month, categoryFilter, search]);

  function moveMonth(direction) {
    const [year, number] = month.split("-").map(Number);
    const date = new Date(year, number - 1 + direction, 1);
    setMonth(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`);
  }

  return <section className="panel full-page-panel">
    <div className="page-toolbar">
      <div className="month-picker"><button aria-label="Previous month" onClick={() => moveMonth(-1)}><ChevronLeft size={16} /></button><span>{monthLabel(month)}</span><button aria-label="Next month" onClick={() => moveMonth(1)}><ChevronRight size={16} /></button></div>
      <button className="secondary-button" onClick={onExport} disabled={!expenses.length}><Download size={15} /> Export CSV</button>
    </div>
    <div className="transaction-tools page-transaction-tools">
      <label className="search-field"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search title, note, category..." aria-label="Search transactions" />{search && <button aria-label="Clear search" onClick={() => setSearch("")}><X size={14} /></button>}</label>
      <label className="filter-select"><select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} aria-label="Filter by category"><option>All categories</option>{categories.map((category) => <option key={category}>{category}</option>)}</select><ChevronDown size={14} /></label>
      <span className="result-count">{expenses.length} results</span>
    </div>
    <TransactionTable expenses={pageExpenses} loading={loading} onEdit={onEdit} onDelete={onDelete} money={money} />
    <div className="table-footer"><span>Showing <strong>{pageExpenses.length}</strong> of <strong>{expenses.length}</strong> filtered transactions ({totalCount} this month)</span>{pageExpenses.length < expenses.length && <button onClick={() => setVisibleCount((count) => count + 10)}>Load more <ChevronDown size={14} /></button>}</div>
  </section>;
}

function TransactionTable({ expenses, loading, onEdit, onDelete, money }) {
  return <div className="table-wrap">
    <table>
      <thead><tr><th>TRANSACTION</th><th>CATEGORY</th><th>DATE</th><th>AMOUNT</th><th aria-label="Actions" /></tr></thead>
      <tbody>{loading ? <tr><td className="table-message" colSpan="5">Loading transactions…</td></tr> : expenses.length ? expenses.map((expense) => {
        const style = categoryStyles[expense.category] || categoryStyles.Other;
        const Icon = style.icon;
        return <tr key={expense.id}>
          <td><div className="transaction-title"><span className="transaction-icon" style={{ background: style.background, color: style.color }}><Icon size={16} /></span><span><strong>{expense.title}</strong><small>{expense.note || expense.category}</small></span></div></td>
          <td><span className="category-tag"><i style={{ background: style.color }} />{expense.category}</span></td>
          <td className="date-cell">{dateLabel(expense.date)}</td>
          <td className="amount-cell">−{money.format(expense.amount)}</td>
          <td><div className="row-actions"><button title="Edit expense" aria-label={`Edit ${expense.title}`} onClick={() => onEdit(expense)}><Settings size={14} /></button><button title="Delete expense" aria-label={`Delete ${expense.title}`} onClick={() => onDelete(expense.id)}><X size={15} /></button></div></td>
        </tr>;
      }) : <tr><td className="table-message" colSpan="5">No transactions found for this month and filter.</td></tr>}</tbody>
    </table>
  </div>;
}

function BudgetsPage({ budgets, expenses, month, setMonth, money, onAdd, onEdit, onDelete }) {
  const totalBudget = budgets.reduce((sum, budget) => sum + budget.amount, 0);
  const spent = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const moveMonth = (direction) => {
    const [year, number] = month.split("-").map(Number);
    const date = new Date(year, number - 1 + direction, 1);
    setMonth(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`);
  };

  return <section className="budget-page">
    <div className="panel budget-overview">
      <div className="panel-heading"><div><h2>Monthly budgets</h2><p>Keep a little room for what matters.</p></div><button className="primary-button" onClick={onAdd}><Plus size={16} /> Set a budget</button></div>
      <div className="page-toolbar budget-month-toolbar">
        <div className="month-picker"><button aria-label="Previous month" onClick={() => moveMonth(-1)}><ChevronLeft size={16} /></button><span>{monthLabel(month)}</span><button aria-label="Next month" onClick={() => moveMonth(1)}><ChevronRight size={16} /></button></div>
        <div className="budget-summary"><span><strong>{money.format(spent)}</strong> spent</span><i /> <span><strong>{money.format(totalBudget)}</strong> planned</span></div>
      </div>
      {budgets.length ? <div className="budget-list">{budgets.map((budget) => {
        const style = categoryStyles[budget.category];
        const Icon = style.icon;
        const amountSpent = expenses.filter((expense) => expense.category === budget.category).reduce((sum, expense) => sum + expense.amount, 0);
        const percent = Math.min((amountSpent / budget.amount) * 100, 100);
        const overBudget = amountSpent > budget.amount;
        return <article className="budget-row" key={budget.id}>
          <span className="category-icon" style={{ color: style.color, background: style.background }}><Icon size={17} /></span>
          <div className="budget-details"><div className="budget-title"><strong>{budget.category}</strong><span>{money.format(amountSpent)} <small>of {money.format(budget.amount)}</small></span></div><div className="budget-track"><i className={overBudget ? "over-budget" : ""} style={{ width: `${percent}%` }} /></div><small className={overBudget ? "budget-warning" : "budget-remaining"}>{overBudget ? `${money.format(amountSpent - budget.amount)} over budget` : `${money.format(budget.amount - amountSpent)} remaining`}</small></div>
          <div className="budget-actions"><button aria-label={`Edit ${budget.category} budget`} onClick={() => onEdit(budget)}><Settings size={15} /></button><button aria-label={`Delete ${budget.category} budget`} onClick={() => onDelete(budget.id)}><Trash2 size={15} /></button></div>
        </article>;
      })}</div> : <div className="page-empty"><span className="empty-chart-icon"><BarChart3 size={20} /></span><strong>No budgets for {monthLabel(month)}</strong><span>Create a category budget to start tracking how you’re doing.</span><button className="secondary-button" onClick={onAdd}><Plus size={15} /> Create your first budget</button></div>}
    </div>
    <div className="budget-tip"><Sparkles size={17} /><span><strong>A gentle reminder</strong> Budgets are guides, not rules. Adjust them whenever life changes.</span></div>
  </section>;
}

function ReportsPage({ expenses, total, month, setMonth, money, onExport }) {
  const categoryTotals = categories.map((category) => ({
    category,
    total: expenses.filter((expense) => expense.category === category).reduce((sum, expense) => sum + expense.amount, 0),
    count: expenses.filter((expense) => expense.category === category).length
  })).filter((item) => item.total > 0).sort((a, b) => b.total - a.total);
  const dailyTotals = expenses.reduce((totals, expense) => {
    const day = Number(expense.date.slice(-2));
    const week = Math.min(Math.floor((day - 1) / 7), 4);
    totals[week] += expense.amount;
    return totals;
  }, [0, 0, 0, 0, 0]);
  const maxWeek = Math.max(...dailyTotals, 1);
  const moveMonth = (direction) => {
    const [year, number] = month.split("-").map(Number);
    const date = new Date(year, number - 1 + direction, 1);
    setMonth(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`);
  };

  return <section className="reports-page">
    <div className="panel reports-summary">
      <div className="panel-heading"><div><h2>Monthly report</h2><p>A clear snapshot of your spending.</p></div><button className="secondary-button" onClick={onExport} disabled={!expenses.length}><Download size={15} /> Export CSV</button></div>
      <div className="page-toolbar report-month-toolbar"><div className="month-picker"><button aria-label="Previous month" onClick={() => moveMonth(-1)}><ChevronLeft size={16} /></button><span>{monthLabel(month)}</span><button aria-label="Next month" onClick={() => moveMonth(1)}><ChevronRight size={16} /></button></div><span className="report-count">{expenses.length} transactions</span></div>
      <div className="report-highlight"><span className="summary-icon violet"><Wallet size={19} /></span><div><small>Total spent</small><strong>{money.format(total)}</strong></div><span className="report-highlight-note">{expenses.length ? `Across ${categoryTotals.length} categories` : "Nothing recorded this month"}</span></div>
    </div>
    <div className="reports-grid">
      <article className="panel report-panel"><div className="panel-heading"><div><h2>Category breakdown</h2><p>How this month adds up</p></div></div>
        {categoryTotals.length ? <div className="report-category-list">{categoryTotals.map(({ category, total: amount, count }) => {
          const style = categoryStyles[category];
          const Icon = style.icon;
          return <div className="report-category" key={category}><span className="category-icon" style={{ background: style.background, color: style.color }}><Icon size={16} /></span><div className="report-category-content"><div><strong>{category}</strong><span>{money.format(amount)} <small>· {count} {count === 1 ? "expense" : "expenses"}</small></span></div><div className="chart-track"><div className="chart-fill" style={{ width: `${(amount / (total || 1)) * 100}%`, background: style.color }} /></div></div></div>;
        })}</div> : <div className="category-empty">Add expenses to see your breakdown.</div>}
      </article>
      <article className="panel report-panel"><div className="panel-heading"><div><h2>Spending by week</h2><p>Monthly activity at a glance</p></div></div>
        <div className="weekly-chart">{dailyTotals.map((amount, index) => <div className="week-column" key={index}><span className="week-value">{amount ? money.format(amount) : "—"}</span><div className="week-track"><i style={{ height: `${amount ? Math.max((amount / maxWeek) * 100, 5) : 0}%` }} /></div><small>Week {index + 1}</small></div>)}</div>
      </article>
    </div>
  </section>;
}

function SettingsPage({ userName, currency, onSave }) {
  return <section className="settings-page">
    <form className="panel settings-card" onSubmit={onSave}>
      <div className="panel-heading"><div><h2>Profile & preferences</h2><p>Your details are saved in this browser.</p></div></div>
      <div className="settings-profile"><span className="profile-avatar settings-avatar">{initials(userName)}</span><div><strong>{userName}</strong><small>Personal account</small></div></div>
      <label className="form-label">Display name<input name="name" required maxLength="60" defaultValue={userName} /></label>
      <label className="form-label">Display currency<select name="currency" defaultValue={currency}><option value="USD">US Dollar (USD)</option><option value="EUR">Euro (EUR)</option><option value="GBP">British Pound (GBP)</option><option value="INR">Indian Rupee (INR)</option><option value="CAD">Canadian Dollar (CAD)</option><option value="AUD">Australian Dollar (AUD)</option></select></label>
      <div className="settings-note"><Check size={15} /> These preferences apply to all amounts you see in the app.</div>
      <button className="primary-button" type="submit"><Check size={15} /> Save preferences</button>
    </form>
    <div className="panel settings-data-card"><div className="settings-data-icon"><Wallet size={18} /></div><div><strong>Your data stays on this device</strong><p>Your expenses and budgets are stored in the local app database. Your profile preferences are saved in this browser.</p></div></div>
  </section>;
}

function HelpPage() {
  const questions = [
    ["How do I add an expense?", "Choose Add expense from Overview or Transactions. Enter a description, amount, date, and category, then save. Your dashboard updates right away."],
    ["How do monthly budgets work?", "Open Budgets and choose a month. Set a limit for any category; Pennywise compares that limit with your recorded spending for that category."],
    ["Can I edit or remove a transaction?", "In Transactions, use the edit or delete buttons at the end of a row. Deleting asks for confirmation before removing the expense."],
    ["How do I export my records?", "Open Reports or Transactions and select Export CSV. The file contains the dates, descriptions, categories, amounts, and notes for the selected month."],
    ["Where is my data stored?", "This mini project stores expenses and budgets in a local SQLite database on the server. Your display name and currency preference are stored in your browser."]
  ];
  return <section className="panel help-page"><div className="panel-heading"><div><h2>Frequently asked questions</h2><p>A few helpful things to get you going.</p></div></div><div className="faq-list">{questions.map(([question, answer]) => <details key={question} className="faq-item"><summary>{question}<ChevronDown size={16} /></summary><p>{answer}</p></details>)}</div><div className="help-contact"><CircleHelp size={17} /><span><strong>Still have a question?</strong> This mini project runs locally, so you can review the README for setup and API details.</span></div></section>;
}

function BudgetModal({ budget, month, onClose, onSave }) {
  const [form, setForm] = useState({ category: budget?.category || "Food", amount: budget?.amount ?? "", month: budget?.month || month });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await onSave({ ...form, amount: Number(form.amount) });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section className="expense-modal" role="dialog" aria-modal="true" aria-labelledby="budget-modal-title">
      <div className="modal-heading"><div><span className="modal-kicker">PLAN AHEAD</span><h2 id="budget-modal-title">{budget ? "Edit budget" : "Set a budget"}</h2><p>Choose a category and monthly spending limit.</p></div><button className="modal-close" onClick={onClose} aria-label="Close dialog"><X size={19} /></button></div>
      <form onSubmit={submit}>
        <label className="form-label">Category<select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>{categories.map((category) => <option key={category}>{category}</option>)}</select></label>
        <div className="form-row"><label className="form-label">Monthly limit<div className="amount-input"><span>$</span><input type="number" min="0.01" max="1000000000" step="0.01" required placeholder="0.00" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} /></div></label><label className="form-label">Month<input type="month" required value={form.month} onChange={(event) => setForm({ ...form, month: event.target.value })} /></label></div>
        {error && <div className="form-error" role="alert">{error}</div>}
        <div className="modal-actions"><button type="button" className="cancel-button" onClick={onClose}>Cancel</button><button type="submit" className="primary-button" disabled={saving}>{saving ? "Saving…" : budget ? "Save changes" : <><Plus size={16} /> Create budget</>}</button></div>
      </form>
    </section>
  </div>;
}

function ExpenseModal({ expense, onClose, onSave }) {
  const [form, setForm] = useState({
    title: expense?.title || "",
    amount: expense?.amount ?? "",
    category: expense?.category || "Food",
    date: expense?.date || new Date().toISOString().slice(0, 10),
    note: expense?.note || ""
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setSaving(true);
    try {
      await onSave({ ...form, amount: Number(form.amount) });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section className="expense-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="modal-heading"><div><span className="modal-kicker">{expense ? "MAKE A CHANGE" : "KEEP TRACK"} </span><h2 id="modal-title">{expense ? "Edit expense" : "Add an expense"}</h2><p>{expense ? "Update the details below." : "Small details make a big difference."}</p></div><button className="modal-close" onClick={onClose} aria-label="Close dialog"><X size={19} /></button></div>
      <form onSubmit={submit}>
        <label className="form-label">What was it for?<input autoFocus maxLength="80" required placeholder="e.g. Coffee with friends" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label>
        <div className="form-row">
          <label className="form-label">Amount<div className="amount-input"><span>$</span><input type="number" min="0.01" max="1000000000" step="0.01" required placeholder="0.00" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} /></div></label>
          <label className="form-label">Date<input type="date" required value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} /></label>
        </div>
        <label className="form-label">Category<select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>{categories.map((category) => <option key={category}>{category}</option>)}</select></label>
        <label className="form-label">Note <span className="optional-label">OPTIONAL</span><textarea rows="3" maxLength="300" placeholder="Add a little context..." value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} /></label>
        {error && <div className="form-error" role="alert">{error}</div>}
        <div className="modal-actions"><button type="button" className="cancel-button" onClick={onClose}>Cancel</button><button type="submit" className="primary-button" disabled={saving}>{saving ? "Saving…" : expense ? "Save changes" : <><Plus size={16} /> Add expense</>}</button></div>
      </form>
    </section>
  </div>;
}

export default App;
