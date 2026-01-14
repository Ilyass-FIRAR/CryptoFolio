//Clés utilisées dans le localStorage
const K = { a: "cryptofolio_assets", p: "cryptofolio_portfolios" };
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);


// Génère un identifiant unique simple
const uid = () => Math.random().toString(16).slice(2) + Date.now().toString(16);
// Convertit une valeur en nombre sécurisé
const n = (x) => (Number.isFinite(+x) ? +x : 0);

const usd = (x) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n(x));
// Récupère des données depuis le localStorage
const get = (k) => JSON.parse(localStorage.getItem(k) || "[]");
// Récupère des données depuis le localStorage
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

// Change la vue affichée (dashboard, assets, portfolios)
function show(v) {
  Object.entries(V).forEach(([k, e]) => e.classList.toggle("hidden", k !== v));
  $$(".nav-btn").forEach((b) => b.classList.toggle("active", b.dataset.v === v));
  $("#pageTitle").textContent = titles[v][0];
  $("#pageHint").textContent = titles[v][1];

  // Recharge les données selon la vue
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
const fA = $("#fA"),
  aId = $("#aId"),
  aName = $("#aName"),
  aSym = $("#aSym"),
  aCg = $("#aCg"),
  aQty = $("#aQty"),
  aBuy = $("#aBuy"),
  aDate = $("#aDate"),
  aPort = $("#aPort");

const aTb = $("#aTb"),
  aDet = $("#aDet"),
  aQ = $("#aQ"),
  aS = $("#aS");

$("#aClr").onclick = () => {
  [aId, aName, aSym, aCg, aQty, aBuy, aDate].forEach((x) => (x.value = ""));
  aPort.value = "";
  $("#assetMode").textContent = "Create";
};

function invested(a) { return n(a.quantity) * n(a.buyPrice); }

fA.onsubmit = (e) => {
  e.preventDefault();
  if (!fA.checkValidity()) return;

  const arr = get(K.a);
  const id = aId.value || uid();

  const obj = {
    id,
    name: aName.value.trim(),
    symbol: aSym.value.trim().toUpperCase(),
    coingeckoId: aCg.value.trim().toLowerCase(),
    quantity: n(aQty.value),
    buyPrice: n(aBuy.value),
    buyDate: aDate.value,
    portfolioId: aPort.value || "",
    currentPrice: 0,
    lastUpdated: null,
  };

  const i = arr.findIndex((x) => x.id === id);
  if (i >= 0) {
    obj.currentPrice = arr[i].currentPrice || 0;
    obj.lastUpdated = arr[i].lastUpdated || null;
    arr[i] = obj;
    al("Asset updated ✅", "success");
  } else {
    arr.push(obj);
    al("Asset added ✅", "success");
  }

  set(K.a, arr);
  $("#aClr").click();
  rA();
  dash();
};

aQ.oninput = rA;
aS.onchange = rA;

function sortA(list, mode) {
  const c = [...list];
  if (mode === "name_desc") c.sort((a, b) => b.name.localeCompare(a.name));
  else if (mode === "inv_desc") c.sort((a, b) => invested(b) - invested(a));
  else c.sort((a, b) => a.name.localeCompare(b.name));
  return c;
}

function rA() {
  const A = get(K.a),
    P = get(K.p),
    q = aQ.value.trim().toLowerCase();

  let L = A.filter(
    (a) =>
      a.name.toLowerCase().includes(q) ||
      a.symbol.toLowerCase().includes(q) ||
      (a.coingeckoId || "").toLowerCase().includes(q)
  );

  L = sortA(L, aS.value);
  aTb.innerHTML = "";

  if (!L.length) {
    aTb.innerHTML = `<tr><td class="py-3 text-slate-500" colspan="5">No assets yet.</td></tr>`;
    portSel();
    return;
  }

  L.forEach((a) => {
    const inv = invested(a);
    aTb.insertAdjacentHTML(
      "beforeend",
      `<tr class="border-b last:border-b-0">
        <td class="py-2 pr-2">
          <button class="text-sky-700 hover:underline font-semibold" data-v="${a.id}">
            ${esc(a.name)} <span class="text-slate-500">(${esc(a.symbol)})</span>
          </button>
          <div class="text-xs text-slate-400">id: <span class="font-mono">${esc(a.coingeckoId || "-")}</span></div>
        </td>
        <td class="py-2 pr-2">${a.quantity}</td>
        <td class="py-2 pr-2">${usd(a.buyPrice)}</td>
        <td class="py-2 pr-2">${usd(inv)}</td>
        <td class="py-2 text-right">
          <button class="px-2 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-sm" data-e="${a.id}">Edit</button>
          <button class="ml-1 px-2 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-sm" data-d="${a.id}">Delete</button>
        </td>
      </tr>`
    );
  });

  aTb.querySelectorAll("button").forEach((b) => {
    const id = b.dataset.v || b.dataset.e || b.dataset.d;
    if (b.dataset.v) b.onclick = () => detA(id);
    if (b.dataset.e) b.onclick = () => editA(id);
    if (b.dataset.d) b.onclick = () => delA(id);
  });

  portSel();
}

function detA(id) {
  const a = get(K.a).find((x) => x.id === id);
  if (!a) return;

  const pn = get(K.p).find((p) => p.id === a.portfolioId)?.name || "(No portfolio)";
  const cur = a.currentPrice ? usd(a.currentPrice) : `<span class="text-slate-400">not loaded</span>`;

  aDet.innerHTML = `
    <div class="font-bold text-slate-800">${esc(a.name)} <span class="text-slate-500">(${esc(a.symbol)})</span></div>
    <div class="text-sm text-slate-500 mt-1">CoinGecko: <span class="font-mono">${esc(a.coingeckoId || "-")}</span></div>
    <div class="text-sm text-slate-600 mt-2">Qty: <b>${a.quantity}</b> • Buy: <b>${usd(a.buyPrice)}</b> • Current: <b>${cur}</b></div>
    <div class="text-sm text-slate-600 mt-1">Portfolio: <b>${esc(pn)}</b></div>
  `;
}

function editA(id) {
  const a = get(K.a).find((x) => x.id === id);
  if (!a) return;

  aId.value = a.id;
  aName.value = a.name;
  aSym.value = a.symbol;
  aCg.value = a.coingeckoId || "";
  aQty.value = a.quantity;
  aBuy.value = a.buyPrice;
  aDate.value = a.buyDate || "";
  aPort.value = a.portfolioId || "";
  $("#assetMode").textContent = "Edit";

  al("Editing asset ✏️", "info", 1800);
  detA(id);
}

function delA(id) {
  const a = get(K.a).find((x) => x.id === id);
  if (!a || !confirm(`Delete "${a.name}" ?`)) return;

  set(K.a, get(K.a).filter((x) => x.id !== id));
  al("Asset deleted ✅", "warning");
  rA();
  dash();
  aDet.textContent = "Select an asset from the table.";
}

function portSel() {
  const P = get(K.p),
    cur = aPort.value;

  aPort.innerHTML =
    `<option value="">(No portfolio)</option>` +
    P.map((p) => `<option value="${p.id}">${esc(p.name)}</option>`).join("");

  aPort.value = cur || "";
}

//recuperation les prix act depuis coingecko
async function cgCurrent(ids) {
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(
    ids.join(",")
  )}&vs_currencies=usd`;

  const r = await fetch(url);
  if (!r.ok) throw new Error("CoinGecko HTTP " + r.status);
  return r.json();
}

async function updPrices() {
  const A = get(K.a);
    // Récupère les IDs CoinGecko uniques
  const ids = [...new Set(A.map((a) => a.coingeckoId).filter(Boolean))];
  if (!ids.length) {
    al("Add assets with CoinGecko ID first.", "warning", 3000);
    return;
  }

  const data = await cgCurrent(ids);
  const now = new Date().toISOString();

  // Mise à jour des assets avec le prix actuel
  set(
    K.a,
    A.map((a) => ({
      ...a,
      currentPrice: n(data[a.coingeckoId]?.usd),
      lastUpdated: now,
    }))
  );
}

$("#refresh").onclick = async () => {
  try {
    $("#refresh").disabled = true;
    $("#refresh").textContent = "Loading...";
    await updPrices();
    dash();
    al("Current prices updated ✅", "success", 2500);
  } catch (e) {
    al(`API error ❌: ${e.message}`, "danger", 4000);
  } finally {
    $("#refresh").disabled = false;
    $("#refresh").textContent = "Prix (API)";
  }
};
const histCache = new Map();
let histTimer = null;

async function cgHistoryPrice(coingeckoId, isoDate) {
  const id = (coingeckoId || "").trim().toLowerCase();
  const dt = isoDate;
  if (!id || !dt) throw new Error("Missing coingeckoId/date");

  const key = `${id}|${dt}`;
  if (histCache.has(key)) return histCache.get(key);

  const [y, m, d] = dt.split("-");
  const url = `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(id)}/history?date=${d}-${m}-${y}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`CoinGecko HTTP ${r.status}`);

  const j = await r.json();
  const price = j?.market_data?.current_price?.usd;
  if (!price) throw new Error("No USD price for that date");

  histCache.set(key, price);
  return price;
}

async function autoFillBuyPrice() {
  const id = aCg.value.trim().toLowerCase();
  const dt = aDate.value;
  if (!id || !dt) return;

  const prev = aBuy.value;
  aBuy.disabled = true;
  aBuy.placeholder = "Fetching...";

  try {
    const p = await cgHistoryPrice(id, dt);
    aBuy.value = Number(p).toFixed(2);
    if (!prev) al("Buy price auto-filled ✅ (historical)", "info", 2000);
  } catch (e) {
    al(`Historical price unavailable ⚠️ (${e.message})`, "warning", 3000);
  } finally {
    aBuy.disabled = false;
    aBuy.placeholder = "auto or manual";
  }
}

function scheduleAutoFill() {
  clearTimeout(histTimer);
  histTimer = setTimeout(autoFillBuyPrice, 600);
}

aDate.addEventListener("change", scheduleAutoFill);
aCg.addEventListener("change", scheduleAutoFill);
aCg.addEventListener("blur", scheduleAutoFill);

// Met à jour les statistiques du dashboard
function dash() {
  const A = get(K.a);
  const P = get(K.p);

  const inv = A.reduce((s, a) => s + n(a.quantity) * n(a.buyPrice), 0);
  const cur = A.reduce((s, a) => s + n(a.quantity) * n(a.currentPrice), 0);
  const pnl = cur - inv;
  const pct = inv ? (pnl / inv) * 100 : 0;

  $("#kInv").textContent = usd(inv);
  $("#kTot").textContent = usd(cur);
  $("#kPnl").textContent = usd(pnl);
  $("#kPct").textContent = pct.toFixed(2) + "%";
  $("#kCnt").textContent = String(A.length);
  $("#kPorts").textContent = String(P.length);

  $("#kPnl").classList.toggle("text-green-700", pnl >= 0);
  $("#kPnl").classList.toggle("text-red-700", pnl < 0);

  const tb = $("#dashTb");
  tb.innerHTML = "";

  if (!A.length) {
    tb.innerHTML = `<tr><td class="py-3 text-slate-500" colspan="6">No assets yet.</td></tr>`;
    updateCharts([], []);
    return;
  }

  // Values for charts (current value)
  const labels = A.map((a) => a.symbol || a.name);
  const values = A.map((a) => n(a.quantity) * n(a.currentPrice));
  updateCharts(labels, values);

  A.forEach((a) => {
    const invA = n(a.quantity) * n(a.buyPrice);
    const valA = n(a.quantity) * n(a.currentPrice);
    const pnlA = valA - invA;

    tb.insertAdjacentHTML(
      "beforeend",
      `<tr class="border-b last:border-b-0">
        <td class="py-2 pr-2">
          <div class="font-semibold">${esc(a.name)} <span class="text-slate-500">(${esc(a.symbol)})</span></div>
          <div class="text-xs text-slate-400 font-mono">${esc(a.coingeckoId || "-")}</div>
        </td>
        <td class="py-2 pr-2">${a.quantity}</td>
        <td class="py-2 pr-2">${usd(a.buyPrice)}</td>
        <td class="py-2 pr-2">${a.currentPrice ? usd(a.currentPrice) : `<span class="text-slate-400">-</span>`}</td>
        <td class="py-2 pr-2">${usd(valA)}</td>
        <td class="py-2 pr-2 ${pnlA >= 0 ? "text-green-700" : "text-red-700"}">${usd(pnlA)}</td>
      </tr>`
    );
  });
}



initCharts();
rP();
rA();
dash();
show("dash");
