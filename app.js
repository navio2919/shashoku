const USERS = [
  "東條りな", "田中", "佐藤", "鈴木", "高橋",
  "伊藤", "山本", "中村", "小林", "加藤"
];

const STORAGE_KEY = "shashoku_entries_v1";

const sampleEntries = [
  { date: "2026-06-21", user: "東條りな", amount: 480, memo: "定食A" },
  { date: "2026-06-24", user: "田中", amount: 520, memo: "カレー" },
  { date: "2026-07-03", user: "東條りな", amount: 450, memo: "そば" },
  { date: "2026-07-08", user: "佐藤", amount: 600, memo: "定食B" },
  { date: "2026-07-20", user: "東條りな", amount: 500, memo: "日替わり" },
  { date: "2026-07-21", user: "田中", amount: 530, memo: "定食A" }
];

let entries = loadEntries();

const userSelect = document.querySelector("#user");
const form = document.querySelector("#mealForm");
const entryTable = document.querySelector("#entryTable");
const monthSummary = document.querySelector("#monthSummary");
const userSummary = document.querySelector("#userSummary");
const clearData = document.querySelector("#clearData");
const downloadCsv = document.querySelector("#downloadCsv");

function init() {
  USERS.forEach(name => {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    userSelect.appendChild(option);
  });

  document.querySelector("#date").valueAsDate = new Date();

  form.addEventListener("submit", addEntry);
  clearData.addEventListener("click", resetDemo);
  downloadCsv.addEventListener("click", exportCsv);

  render();
}

function loadEntries() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) return JSON.parse(saved);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sampleEntries));
  return sampleEntries;
}

function saveEntries() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function getClosingMonth(dateStr) {
  const date = new Date(`${dateStr}T00:00:00`);
  let year = date.getFullYear();
  let month = date.getMonth() + 1;
  const day = date.getDate();

  // 20日締め：21日以降は翌月締め
  if (day > 20) {
    month++;
    if (month > 12) {
      month = 1;
      year++;
    }
  }

  return `${year}-${String(month).padStart(2, "0")}`;
}

function yen(amount) {
  return `${Number(amount).toLocaleString()}円`;
}

function addEntry(event) {
  event.preventDefault();

  entries.push({
    date: document.querySelector("#date").value,
    user: document.querySelector("#user").value,
    amount: Number(document.querySelector("#amount").value),
    memo: document.querySelector("#memo").value.trim()
  });

  saveEntries();
  form.reset();
  document.querySelector("#date").valueAsDate = new Date();
  render();
}

function deleteEntry(index) {
  entries.splice(index, 1);
  saveEntries();
  render();
}

function resetDemo() {
  entries = [];
  saveEntries();
  render();
}

function summarizeBy(keyFn) {
  return entries.reduce((acc, entry) => {
    const key = keyFn(entry);
    acc[key] = (acc[key] || 0) + Number(entry.amount);
    return acc;
  }, {});
}

function renderSummary(container, summary) {
  const rows = Object.entries(summary).sort().map(([label, total]) => `
    <div class="summary-row">
      <span>${label}</span>
      <strong>${yen(total)}</strong>
    </div>
  `).join("");

  container.innerHTML = rows || "<p>まだデータがありません。</p>";
}

function render() {
  entryTable.innerHTML = entries.map((entry, index) => `
    <tr>
      <td>${entry.date}</td>
      <td>${getClosingMonth(entry.date)}</td>
      <td>${entry.user}</td>
      <td>${yen(entry.amount)}</td>
      <td>${entry.memo || ""}</td>
      <td><button class="delete" onclick="deleteEntry(${index})">削除</button></td>
    </tr>
  `).join("");

  renderSummary(monthSummary, summarizeBy(entry => `${getClosingMonth(entry.date)}締め`));
  renderSummary(userSummary, summarizeBy(entry => entry.user));
}

function exportCsv() {
  const header = ["利用日", "締め月", "利用者", "金額", "備考"];
  const rows = entries.map(entry => [
    entry.date,
    getClosingMonth(entry.date),
    entry.user,
    entry.amount,
    entry.memo || ""
  ]);

  const csv = [header, ...rows]
    .map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(","))
    .join("\n");

  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "shashoku_summary.csv";
  link.click();
  URL.revokeObjectURL(url);
}

window.deleteEntry = deleteEntry;
init();
