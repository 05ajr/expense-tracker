const storageKey = "my-expense-tracker";
const expenseCategories = ["Food", "Transportation", "Bills", "Shopping", "Entertainment", "Health", "Other"];
const incomeCategories = ["Paycheck", "Side work", "Gift", "Other"];

const form = document.querySelector("#transactionForm");
const descriptionInput = document.querySelector("#description");
const amountInput = document.querySelector("#amount");
const dateInput = document.querySelector("#date");
const categoryInput = document.querySelector("#category");
const monthFilter = document.querySelector("#monthFilter");
const typeFilter = document.querySelector("#typeFilter");
const list = document.querySelector("#transactionList");

let transactions = loadTransactions();
let editingId = null;

function localDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function loadTransactions() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function saveTransactions() {
  localStorage.setItem(storageKey, JSON.stringify(transactions));
}

function money(value) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

function selectedType() {
  return form.querySelector('input[name="type"]:checked').value;
}

function updateCategories(selected = "") {
  const categories = selectedType() === "expense" ? expenseCategories : incomeCategories;
  categoryInput.replaceChildren();
  categories.forEach(category => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    categoryInput.append(option);
  });
  if (categories.includes(selected)) categoryInput.value = selected;
}

function resetForm() {
  form.reset();
  dateInput.value = localDate();
  editingId = null;
  updateCategories();
  document.querySelector("#formTitle").textContent = "Add a transaction";
  document.querySelector("#saveButton").textContent = "Add transaction";
  document.querySelector("#cancelButton").hidden = true;
}

function render() {
  const monthEntries = transactions.filter(item => item.date.startsWith(monthFilter.value));
  const income = monthEntries.filter(item => item.type === "income").reduce((sum, item) => sum + item.amount, 0);
  const expenses = monthEntries.filter(item => item.type === "expense").reduce((sum, item) => sum + item.amount, 0);
  const balance = income - expenses;
  document.querySelector("#income").textContent = money(income);
  document.querySelector("#expenses").textContent = money(expenses);
  document.querySelector("#balance").textContent = money(balance);
  document.querySelector("#balanceNote").textContent = balance < 0 ? "Spent more than you earned" : "For the selected month";

  const visible = monthEntries
    .filter(item => typeFilter.value === "all" || item.type === typeFilter.value)
    .sort((a, b) => b.date.localeCompare(a.date));

  document.querySelector("#entryCount").textContent = `${visible.length} ${visible.length === 1 ? "entry" : "entries"}`;
  document.querySelector("#exportButton").disabled = visible.length === 0;
  list.replaceChildren();

  if (!visible.length) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "No transactions for these filters.";
    list.append(empty);
  }

  visible.forEach(item => {
    const row = document.createElement("div");
    row.className = "transaction";

    const symbol = document.createElement("span");
    symbol.className = `transaction-icon ${item.type}`;
    symbol.textContent = item.type === "income" ? "+" : "−";

    const details = document.createElement("div");
    details.className = "transaction-detail";
    const name = document.createElement("strong");
    name.textContent = item.description;
    const info = document.createElement("small");
    info.textContent = `${item.category} · ${new Date(item.date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
    details.append(name, info);

    const amount = document.createElement("span");
    amount.className = `transaction-amount ${item.type}`;
    amount.textContent = `${item.type === "expense" ? "−" : "+"}${money(item.amount)}`;

    const actions = document.createElement("div");
    actions.className = "transaction-actions";
    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.textContent = "Edit";
    editButton.setAttribute("aria-label", `Edit ${item.description}`);
    editButton.addEventListener("click", () => editTransaction(item.id));
    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.textContent = "Delete";
    deleteButton.setAttribute("aria-label", `Delete ${item.description}`);
    deleteButton.addEventListener("click", () => deleteTransaction(item.id));
    actions.append(editButton, deleteButton);
    row.append(symbol, details, amount, actions);
    list.append(row);
  });

  renderBreakdown(monthEntries);
}

function renderBreakdown(monthEntries) {
  const totals = {};
  monthEntries.filter(item => item.type === "expense").forEach(item => {
    totals[item.category] = (totals[item.category] || 0) + item.amount;
  });
  const categories = Object.entries(totals).sort((a, b) => b[1] - a[1]);
  const container = document.querySelector("#categoryBreakdown");
  container.replaceChildren();

  if (!categories.length) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "Add an expense to see your spending breakdown.";
    container.append(empty);
    return;
  }

  const totalSpent = categories.reduce((sum, category) => sum + category[1], 0);
  categories.forEach(([category, amount]) => {
    const row = document.createElement("div");
    row.className = "breakdown-row";
    const label = document.createElement("div");
    label.className = "breakdown-label";
    const name = document.createElement("span");
    name.textContent = category;
    const value = document.createElement("span");
    value.textContent = money(amount);
    label.append(name, value);
    const track = document.createElement("div");
    track.className = "track";
    const fill = document.createElement("div");
    fill.className = "fill";
    fill.style.width = `${(amount / totalSpent) * 100}%`;
    track.append(fill);
    row.append(label, track);
    container.append(row);
  });
}

function editTransaction(id) {
  const item = transactions.find(entry => entry.id === id);
  if (!item) return;
  editingId = id;
  form.querySelector(`input[name="type"][value="${item.type}"]`).checked = true;
  updateCategories(item.category);
  descriptionInput.value = item.description;
  amountInput.value = item.amount;
  dateInput.value = item.date;
  document.querySelector("#formTitle").textContent = "Edit transaction";
  document.querySelector("#saveButton").textContent = "Save changes";
  document.querySelector("#cancelButton").hidden = false;
  form.scrollIntoView({ behavior: "smooth", block: "center" });
  descriptionInput.focus({ preventScroll: true });
}

function deleteTransaction(id) {
  if (!confirm("Delete this transaction?")) return;
  transactions = transactions.filter(item => item.id !== id);
  saveTransactions();
  if (editingId === id) resetForm();
  render();
}

form.addEventListener("submit", event => {
  event.preventDefault();
  const amount = Number(amountInput.value);
  if (!Number.isFinite(amount) || amount <= 0 || !descriptionInput.value.trim() || !dateInput.value) return;
  const entry = {
    id: editingId || `${Date.now()}-${Math.random()}`,
    description: descriptionInput.value.trim(),
    amount: Math.round(amount * 100) / 100,
    date: dateInput.value,
    category: categoryInput.value,
    type: selectedType()
  };
  if (editingId) {
    transactions = transactions.map(item => item.id === editingId ? entry : item);
  } else {
    transactions.push(entry);
  }
  saveTransactions();
  monthFilter.value = entry.date.slice(0, 7);
  resetForm();
  render();
});

form.querySelectorAll('input[name="type"]').forEach(input => {
  input.addEventListener("change", () => updateCategories());
});
document.querySelector("#cancelButton").addEventListener("click", resetForm);
monthFilter.addEventListener("change", render);
typeFilter.addEventListener("change", render);

document.querySelector("#exportButton").addEventListener("click", () => {
  const rows = transactions.filter(item => item.date.startsWith(monthFilter.value))
    .filter(item => typeFilter.value === "all" || item.type === typeFilter.value);
  const quote = value => `"${String(value).replaceAll('"', '""')}"`;
  const csv = ["Date,Description,Type,Category,Amount", ...rows.map(item =>
    [item.date, item.description, item.type, item.category, item.amount.toFixed(2)].map(quote).join(",")
  )].join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `transactions-${monthFilter.value}.csv`;
  link.click();
  URL.revokeObjectURL(url);
});

monthFilter.value = localDate().slice(0, 7);
resetForm();
render();
