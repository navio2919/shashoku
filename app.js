// Google Apps Script のウェブアプリURLをここに貼り付けてください。
// 例: const GAS_WEB_APP_URL = "https://script.google.com/macros/s/xxxxxxxxxxxx/exec";
const GAS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbx6e7llJuQvAAHAFpE4hVFWLuJz0pbSpmpOJff68VfciXAmyDZ5UObygCWtVshYMsll/exec";

const USERS = [
  "東條", "田中", "佐藤", "鈴木", "高橋",
  "伊藤", "山本", "中村", "小林", "加藤"
];

const MENUS = [
  { name: "日替わり定食", price: 500 },
  { name: "カレー", price: 450 },
  { name: "うどん", price: 380 },
  { name: "そば", price: 380 },
  { name: "弁当", price: 550 },
  { name: "その他", price: 0 }
];

let entries = [];

const userSelect = document.querySelector("#user");
const menuSelect = document.querySelector("#menu");
const amountInput = document.querySelector("#amount");
const form = document.querySelector("#mealForm");
const entryTable = document.querySelector("#entryTable");
const monthSummary = document.querySelector("#monthSummary");
const userSummary = document.querySelector("#userSummary");
const statusMessage = document.querySelector("#status");
const syncButton = document.querySelector("#syncButton");
const downloadCsv = document.querySelector("#downloadCsv");
const menuButtons = document.querySelector("#menuButtons");

function init() {
  USERS.forEach(name => {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    userSelect.appendChild(option);
  });

  MENUS.forEach(menu => {
    const option = document.createElement("option");
    option.value = menu.name;
    option.dataset.price = menu.price;
    option.textContent = `${menu.name}（${yen(menu.price)}）`;
    menuSelect.appendChild(option);

    const button = document.createElement("button");
    button.type = "button";
    button.textContent = `${menu.name} ${yen(menu.price)}`;
    button.addEventListener("click", () => selectMenu(menu.name));
    menuButtons.appendChild(button);
  });

  document.querySelector("#date").valueAsDate = new Date();
  updateAmountFromMenu();

  menuSelect.addEventListener("change", updateAmountFromMenu);
  form.addEventListener("submit", addEntry);
  syncButton.addEventListener("click", fetchEntries);
  downloadCsv.addEventListener("click", exportCsv);

  fetchEntries();
}

function selectMenu(menuName) {
  menuSelect.value = menuName;
  updateAmountFromMenu();
}

function updateAmountFromMenu() {
  const option = menuSelect.selectedOptions[0];
  amountInput.value = option ? option.dataset.price : "";
}

function setStatus(message, isError = false) {
  statusMessage.textContent = message;
  statusMessage.classList.toggle("error", isError);
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

async function addEntry(event) {
  event.preventDefault();

  const entry = {
    action: "add",
    timestamp: new Date().toISOString(),
    date: document.querySelector("#date").value,
    closingMonth: getClosingMonth(document.querySelector("#date").value),
    user: userSelect.value,
    menu: menuSelect.value,
    amount: Number(amountInput.value),
    memo: document.querySelector("#memo").value.trim()
  };

  if (!GAS_WEB_APP_URL) {
    setStatus("GAS_WEB_APP_URL が未設定です。app.js にURLを入れてください。", true);
    return;
  }

  try {
    setStatus("登録中です...");
    await fetch(GAS_WEB_APP_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(entry)
    });

    setStatus("登録しました。最新データを取得します。");
    form.reset();
    document.querySelector("#date").valueAsDate = new Date();
    updateAmountFromMenu();

    // no-cors ではレスポンスを読めないため、少し待ってから取得します。
    setTimeout(fetchEntries, 800);
  } catch (error) {
    setStatus("登録に失敗しました。Apps Script のURLや公開設定を確認してください。", true);
  }
}

async function fetchEntries() {
  if (!GAS_WEB_APP_URL) {
    setStatus("GAS_WEB_APP_URL が未設定です。app.js にURLを入れてください。", true);
    render();
    return;
  }

  try {
    setStatus("最新データを取得中です...");
    const response = await fetch(`${GAS_WEB_APP_URL}?action=list`);
    const data = await response.json();
    entries = data.entries || [];
    setStatus(`最新データを取得しました。${entries.length}件`);
    render();
  } catch (error) {
    setStatus("データ取得に失敗しました。Apps Script のURLや公開設定を確認してください。", true);
  }
}

function summarizeBy(keyFn) {
  return entries.reduce((acc, entry) => {
    const key = keyFn(entry);
    acc[key] = (acc[key] || 0) + Number(entry.amount || 0);
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
  entryTable.innerHTML = entries.map(entry => `
    <tr>
<td>${formatDateTimeLabel(entry.timestamp)}</td>
<td>${entry.date || ""}</td>
<td>${formatClosingMonthLabel(entry.closingMonth || getClosingMonth(entry.date))}</td>
      <td>${entry.user || ""}</td>
      <td>${entry.menu || ""}</td>
      <td>${yen(entry.amount || 0)}</td>
      <td>${entry.memo || ""}</td>
    </tr>
  `).join("");

renderSummary(monthSummary, summarizeBy(entry =>
  formatClosingMonthLabel(entry.closingMonth || getClosingMonth(entry.date))
));
  renderSummary(userSummary, summarizeBy(entry => entry.user));
}

function exportCsv() {
  const header = ["登録日時", "利用日", "締め月", "利用者", "メニュー", "金額", "備考"];
  const rows = entries.map(entry => [
    entry.timestamp || "",
    entry.date || "",
    formatClosingMonthLabel(entry.closingMonth || getClosingMonth(entry.date)),
    entry.user || "",
    entry.menu || "",
    entry.amount || 0,
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

function formatDateTimeLabel(value) {
  if (!value) return "";
  const date = new Date(value);
  if (isNaN(date)) return value;

  return date.toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatClosingMonthLabel(value) {
  if (!value) return "";

  // 2026-06 の場合
  if (/^\d{4}-\d{2}$/.test(value)) {
    return `${Number(value.split("-")[1])}月締め`;
  }

  // 2026-05-31T15:00:00.000Z の場合
  const date = new Date(value);
  if (!isNaN(date)) {
    return `${date.getMonth() + 1}月締め`;
  }

  return value;
}

init();
