const K = { a: "cryptofolio_assets", p: "cryptofolio_portfolios" };
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

const uid = () => Math.random().toString(16).slice(2) + Date.now().toString(16);
const n = (x) => (Number.isFinite(+x) ? +x : 0);
const usd = (x) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n(x));

const get = (k) => JSON.parse(localStorage.getItem(k) || "[]");
const set = (k, v) => localStorage.setItem(k, JSON.stringify(v));

const esc = (s) =>
  String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const al = (msg, type = "info", timeout = 3500) => {
  const id = "al_" + Date.now();
  const colors = {
    success: "bg-green-50 border-green-200 text-green-800",
    info: "bg-sky-50 border-sky-200 text-sky-800",
    warning: "bg-yellow-50 border-yellow-200 text-yellow-800",
    danger: "bg-red-50 border-red-200 text-red-800",
  };

  $("#al").innerHTML = `
    <div id="${id}" class="p-3 rounded-2xl border ${colors[type] || colors.info} text-sm flex items-start justify-between gap-3">
      <div>${msg}</div>
      <button class="text-slate-500 hover:text-slate-700 font-bold">✕</button>
    </div>
  `;
  const el = document.getElementById(id);
  el.querySelector("button").onclick = () => el.remove();
  if (timeout > 0) setTimeout(() => el?.remove(), timeout);
};

const V = { dash: $("#v-dash"), assets: $("#v-assets"), ports: $("#v-ports") };
const titles = {
  dash: ["Dashboard", "Overview + charts + current prices update."],
  assets: ["Assets", "Manage assets + auto buy price from history."],
  ports: ["Portfolios", "Create portfolios and assign assets."],
};

function show(v) {
  Object.entries(V).forEach(([k, e]) => e.classList.toggle("hidden", k !== v));
  $$(".nav-btn").forEach((b) => b.classList.toggle("active", b.dataset.v === v));
  $("#pageTitle").textContent = titles[v][0];
  $("#pageHint").textContent = titles[v][1];

  if (v === "assets") rA();
  if (v === "ports") rP();
  if (v === "dash") dash();
}
$$(".nav-btn").forEach((b) => (b.onclick = () => show(b.dataset.v)));

let barChart = null;
let pieChart = null;

const chartColors = [
  "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899",
  "#14B8A6", "#F97316", "#6366F1", "#84CC16", "#06B6D4", "#D946EF",
  "#F43F5E", "#22C55E", "#FBBF24", "#FB923C", "#A855F7", "#0EA5E9",
];

function initCharts() {
  const barEl = $("#bar");
  const pieEl = $("#pie");
  if (!barEl || !pieEl || typeof Chart === "undefined") return;

  barChart = new Chart(barEl, {
    type: "bar",
    data: { labels: [], datasets: [{ label: "Value (USD)", data: [] }] },
    options: {
      responsive: true,
      plugins: { legend: { display: true } },
      scales: { y: { beginAtZero: true } },
    },
  });

  pieChart = new Chart(pieEl, {
    type: "pie",
    data: { labels: [], datasets: [{ data: [], backgroundColor: [] }] },
    options: { responsive: true, plugins: { legend: { display: true } } },
  });
}

function updateCharts(labels, values) {
  if (barChart) {
    barChart.data.labels = labels;
    barChart.data.datasets[0].data = values;
    barChart.update();
  }
  if (pieChart) {
    pieChart.data.labels = labels;
    pieChart.data.datasets[0].data = values;
    pieChart.data.datasets[0].backgroundColor = labels.map((_, i) => chartColors[i % chartColors.length]);
    pieChart.update();
  }
}

const fP = $("#fP"),
  pId = $("#pId"),
  pName = $("#pName"),
  pDesc = $("#pDesc"),
  pTb = $("#pTb");

$("#pClr").onclick = () => (pId.value = pName.value = pDesc.value = "");

fP.onsubmit = (e) => {
  e.preventDefault();
  if (!fP.checkValidity()) return;

  const arr = get(K.p);
  const id = pId.value || uid();
  const obj = { id, name: pName.value.trim(), desc: pDesc.value.trim() };

  const i = arr.findIndex((x) => x.id === id);
  i >= 0 ? (arr[i] = obj) : arr.push(obj);

  set(K.p, arr);
  $("#pClr").click();
  al("Portfolio saved ✅", "success");
  rP();
  portSel();
  dash();
};

function rP() {
  const P = get(K.p),
    A = get(K.a);
  pTb.innerHTML = "";

  if (!P.length) {
    pTb.innerHTML = `<tr><td class="py-3 text-slate-500" colspan="3">No portfolios yet.</td></tr>`;
    return;
  }

  P.forEach((p) => {
    const count = A.filter((a) => a.portfolioId === p.id).length;
    pTb.insertAdjacentHTML(
      "beforeend",
      `<tr class="border-b last:border-b-0">
        <td class="py-2 pr-2">
          <div class="font-semibold">${esc(p.name)}</div>
          <div class="text-xs text-slate-500">${esc(p.desc || "")}</div>
        </td>
        <td class="py-2 pr-2">${count}</td>
        <td class="py-2 text-right">
          <button class="px-2 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-sm" data-e="${p.id}">Edit</button>
          <button class="ml-1 px-2 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-sm" data-d="${p.id}">Delete</button>
        </td>
      </tr>`
    );
  });

  pTb.querySelectorAll("button").forEach((b) => {
    b.onclick = () => {
      const id = b.dataset.e || b.dataset.d;
      const P2 = get(K.p);

      if (b.dataset.e) {
        const p = P2.find((x) => x.id === id);
        if (!p) return;
        pId.value = p.id;
        pName.value = p.name;
        pDesc.value = p.desc || "";
        al("Editing portfolio ✏️", "info", 1800);
      }

      if (b.dataset.d) {
        const p = P2.find((x) => x.id === id);
        if (!p || !confirm(`Delete "${p.name}" ?`)) return;

        set(
          K.a,
          get(K.a).map((a) => (a.portfolioId === id ? { ...a, portfolioId: "" } : a))
        );
        set(K.p, P2.filter((x) => x.id !== id));

        al("Portfolio deleted ✅", "warning");
        rP();
        portSel();
        rA();
        dash();
      }
    };
  });
}