const ROLES = [
  { id: "all", label: "全部樂器" },
  { id: "leadGuitar", label: "Lead 結他" },
  { id: "rhythmGuitar", label: "節奏結他" },
  { id: "bass", label: "Bass" },
  { id: "drums", label: "鼓組" },
  { id: "keys", label: "鍵盤" },
  { id: "vocals", label: "人聲" },
];

function fmtTime(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatAdviceText(data) {
  const lines = [];
  lines.push("SongAnalyst｜編曲建議（靜態示範）");
  lines.push(`歌曲：${data.title}`);
  if (data.mir) {
    lines.push(
      `BPM：${data.mir.bpm}｜調性：${data.mir.key} ${data.mir.mode === "major" ? "大調" : "小調"}｜時長：${fmtTime(data.mir.durationSec)}`,
    );
  }
  lines.push("");
  if (data.summaryZh) {
    lines.push(data.summaryZh);
    lines.push("");
  }
  for (const sec of data.advice || []) {
    lines.push(
      `── ${sec.sectionLabelZh}（${fmtTime(sec.startSec)}–${fmtTime(sec.endSec)}）──`,
    );
    for (const inst of sec.instruments || []) {
      lines.push(`【${inst.labelZh}】`);
      for (const tip of inst.tips || []) lines.push(`• ${tip}`);
      lines.push("");
    }
  }
  lines.push("— 由 SongAnalyst 靜態示範產生 —");
  return lines.join("\n");
}

let demoData = null;
let activeRole = "all";

const els = {
  load: document.getElementById("load-demo"),
  copy: document.getElementById("copy-advice"),
  status: document.getElementById("status"),
  result: document.getElementById("result"),
  title: document.getElementById("song-title"),
  summary: document.getElementById("song-summary"),
  badges: document.getElementById("mir-badges"),
  stems: document.getElementById("stems"),
  filters: document.getElementById("role-filters"),
  advice: document.getElementById("advice"),
};

function setStatus(msg, isError = false) {
  els.status.textContent = msg || "";
  els.status.classList.toggle("error", Boolean(isError));
}

function renderFilters() {
  els.filters.innerHTML = "";
  for (const role of ROLES) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = role.label;
    btn.className = role.id === activeRole ? "active" : "";
    btn.addEventListener("click", () => {
      activeRole = role.id;
      renderFilters();
      renderAdvice();
    });
    els.filters.appendChild(btn);
  }
}

function renderStems() {
  els.stems.innerHTML = "";
  for (const stem of demoData.stems || []) {
    const card = document.createElement("div");
    card.className = "stem-card";
    card.innerHTML = `
      <div class="row">
        <strong>${stem.labelZh}</strong>
        <a href="${stem.url}" download>下載</a>
      </div>
      <audio controls preload="none" src="${stem.url}"></audio>
    `;
    els.stems.appendChild(card);
  }
}

function renderAdvice() {
  els.advice.innerHTML = "";
  for (const sec of demoData.advice || []) {
    const card = document.createElement("article");
    card.className = "advice-card";
    const instruments = (sec.instruments || []).filter(
      (i) => activeRole === "all" || i.role === activeRole,
    );
    const body = instruments
      .map(
        (inst) => `
      <div class="inst">
        <div class="label">${inst.labelZh}</div>
        <ul>${(inst.tips || []).map((t) => `<li>${t}</li>`).join("")}</ul>
      </div>`,
      )
      .join("");
    card.innerHTML = `
      <h5>${sec.sectionLabelZh}</h5>
      <div class="time">${fmtTime(sec.startSec)}–${fmtTime(sec.endSec)}</div>
      ${body}
    `;
    els.advice.appendChild(card);
  }
}

function renderResult() {
  els.title.textContent = demoData.title;
  els.summary.textContent = demoData.summaryZh || "";
  const mir = demoData.mir;
  els.badges.innerHTML = mir
    ? `
      <span>${mir.bpm} BPM</span>
      <span>${mir.key} ${mir.mode === "major" ? "大調" : "小調"}</span>
      <span>${fmtTime(mir.durationSec)}</span>
      <span class="amber">MIR：${mir.confidence}</span>
      <span>分軌：示範</span>
    `
    : "";
  renderStems();
  renderFilters();
  renderAdvice();
  els.result.classList.remove("hidden");
  els.copy.disabled = false;
}

async function loadDemo() {
  setStatus("載入示範中…");
  els.load.disabled = true;
  try {
    const res = await fetch("assets/demo-result.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`無法讀取示範資料（${res.status}）`);
    demoData = await res.json();
    renderResult();
    setStatus("示範已載入。可試聽分軌或複製建議。");
  } catch (e) {
    setStatus(e instanceof Error ? e.message : "載入失敗", true);
  } finally {
    els.load.disabled = false;
  }
}

els.load.addEventListener("click", loadDemo);
els.copy.addEventListener("click", async () => {
  if (!demoData) return;
  try {
    await navigator.clipboard.writeText(formatAdviceText(demoData));
    setStatus("已複製建議全文。");
  } catch {
    setStatus("複製失敗，請手動選取文字。", true);
  }
});
