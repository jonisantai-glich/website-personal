const form = document.getElementById("giftForm");
const result = document.getElementById("result");
const giftLink = document.getElementById("giftLink");
const copyBtn = document.getElementById("copyBtn");
const shareBtn = document.getElementById("shareBtn");
const openBtn = document.getElementById("openBtn");
const createMode = document.getElementById("createMode");
const claimMode = document.getElementById("claimMode");

const claimSender = document.getElementById("claimSender");
const claimMessage = document.getElementById("claimMessage");
const wheel = document.getElementById("wheel");
const labels = document.getElementById("labels");
const spinBtn = document.getElementById("spinBtn");
const state = document.getElementById("state");

let remaining = [];
let spinning = false;
let rotation = 0;

function toRp(n) {
  return "Rp " + new Intl.NumberFormat("id-ID").format(Math.max(0, n));
}

function hashString(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed) {
  return function () {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function equalSplit(total, count) {
  const base = Math.floor(total / count);
  const arr = new Array(count).fill(base);
  let rem = total - base * count;
  let i = 0;
  while (rem > 0) {
    arr[i] += 1;
    rem -= 1;
    i = (i + 1) % count;
  }
  return arr;
}

function randomSplit(total, count, rng) {
  if (count === 1) return [total];
  const arr = [];
  let remain = total;
  for (let i = count; i > 1; i--) {
    const min = 1;
    const max = remain - (i - 1);
    const pick = Math.max(min, Math.floor(rng() * Math.max(2, max / 1.7)) + min);
    arr.push(pick);
    remain -= pick;
  }
  arr.push(remain);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function buildWheel(values) {
  if (!values.length) {
    wheel.style.background = "conic-gradient(#eee 0deg, #eee 360deg)";
    labels.innerHTML = "";
    return;
  }

  const colors = ["#ffb347", "#ffd59e", "#7cc7ff", "#b2e1ff", "#ffd0a8", "#9ee7c5"];
  const segment = 360 / values.length;
  const stops = values.map((_, i) => {
    const start = i * segment;
    const end = (i + 1) * segment;
    return `${colors[i % colors.length]} ${start}deg ${end}deg`;
  }).join(", ");
  wheel.style.background = `conic-gradient(${stops})`;

  labels.innerHTML = "";
  values.forEach((v, i) => {
    const row = document.createElement("div");
    row.className = "label";
    row.innerHTML = `<span>Spin ${i + 1}</span><strong>${toRp(v)}</strong>`;
    labels.appendChild(row);
  });
}

function makeLink(payload) {
  const params = new URLSearchParams({
    gift: "1",
    sender: payload.sender,
    amount: String(payload.amount),
    count: String(payload.count),
    type: payload.type,
    msg: payload.msg,
    id: Math.random().toString(36).slice(2, 9)
  });
  return window.location.origin + window.location.pathname + "?" + params.toString();
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const payload = {
    sender: form.sender.value.trim(),
    amount: Number(form.amount.value) || 0,
    count: Math.max(1, Number(form.count.value) || 1),
    type: form.type.value,
    msg: form.message.value.trim()
  };
  if (!payload.sender || payload.amount < 1000) return;
  giftLink.value = makeLink(payload);
  result.classList.remove("hidden");
});

form.addEventListener("reset", () => {
  setTimeout(() => result.classList.add("hidden"), 0);
});

copyBtn.addEventListener("click", async () => {
  if (!giftLink.value) return;
  try {
    await navigator.clipboard.writeText(giftLink.value);
  } catch (_) {
    giftLink.select();
    document.execCommand("copy");
  }
  copyBtn.textContent = "Tersalin";
  setTimeout(() => copyBtn.textContent = "Copy", 1100);
});

shareBtn.addEventListener("click", async () => {
  if (!giftLink.value) return;
  const text = "Aku kirim hadiah. Spin link ini:";
  if (navigator.share) {
    try {
      await navigator.share({ title: "Spin Hadiah", text, url: giftLink.value });
      return;
    } catch (_) {}
  }
  window.open("https://wa.me/?text=" + encodeURIComponent(text + " " + giftLink.value), "_blank");
});

openBtn.addEventListener("click", () => {
  if (!giftLink.value) return;
  window.open(giftLink.value, "_blank");
});

function initClaim(params) {
  createMode.classList.add("hidden");
  claimMode.classList.remove("hidden");

  const sender = params.get("sender") || "-";
  const amount = Number(params.get("amount") || 0);
  const count = Math.max(1, Number(params.get("count") || 1));
  const type = params.get("type") || "equal";
  const msg = params.get("msg") || "-";
  const seed = hashString(params.get("id") || "seed");
  const rng = mulberry32(seed);
  const values = type === "equal" ? equalSplit(amount, count) : randomSplit(amount, count, rng);

  remaining = values.slice();
  claimSender.textContent = sender;
  claimMessage.textContent = msg;
  buildWheel(remaining);
}

spinBtn.addEventListener("click", () => {
  if (spinning) return;
  if (!remaining.length) {
    state.textContent = "Hadiah sudah habis.";
    state.className = "state bad";
    return;
  }

  spinning = true;
  const index = Math.floor(Math.random() * remaining.length);
  const segment = 360 / remaining.length;
  const target = 360 - (index * segment + segment / 2);
  rotation += 360 * 4 + target;
  wheel.style.transform = `rotate(${rotation}deg)`;
  state.textContent = "Memutar...";
  state.className = "state";

  setTimeout(() => {
    const prize = remaining.splice(index, 1)[0];
    buildWheel(remaining);
    state.textContent = "Selamat! Kamu dapat " + toRp(prize);
    state.className = "state ok";
    spinning = false;
  }, 3300);
});

const params = new URLSearchParams(window.location.search);
if (params.get("gift") === "1") {
  initClaim(params);
}
