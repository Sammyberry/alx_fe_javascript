// ===============================
// Constants & Keys
// ===============================
const STORAGE_KEY_QUOTES = "dqg_quotes_v1";
const STORAGE_KEY_FILTER = "dqg_selectedCategory";
const STORAGE_KEY_LASTSYNC = "dqg_lastSync";
const SESSION_KEY_LAST_QUOTE = "dqg_lastQuote";

// Simulated server endpoint (JSONPlaceholder).
// NOTE: JSONPlaceholder doesn't truly persist writes;
// we're using it to simulate network requests.
const SERVER_URL = "https://jsonplaceholder.typicode.com/posts";

// Auto-sync interval (ms)
const AUTO_SYNC_MS = 15000;

// ===============================
// State
// ===============================
let quotes = []; // local source of truth
let autoSyncTimer = null;

// ===============================
// DOM
// ===============================
const quoteDisplay = document.getElementById("quoteDisplay");
const categoryFilter = document.getElementById("categoryFilter");
const newQuoteBtn = document.getElementById("newQuote");
const statusEl = document.getElementById("status");
const syncStatusEl = document.getElementById("syncStatus");
const autoSyncToggle = document.getElementById("autoSyncToggle");
const syncNowBtn = document.getElementById("syncNowBtn");
const currentFilterPill = document.getElementById("currentFilterPill");
const conflictCenter = document.getElementById("conflictCenter");
const conflictList = document.getElementById("conflictList");

// ===============================
// Utilities
// ===============================
function setStatus(msg) {
  if (statusEl) statusEl.textContent = msg;
}
function setSyncStatus(msg) {
  if (syncStatusEl) syncStatusEl.textContent = msg;
}

function nowISO() {
  return new Date().toISOString();
}

function genLocalId() {
  return `loc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function isValidQuote(q) {
  return (
    q &&
    typeof q.text === "string" &&
    q.text.trim() &&
    typeof q.category === "string" &&
    q.category.trim()
  );
}

function sanitizeQuotesArray(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.filter(isValidQuote).map((q) => ({
    id: q.id || genLocalId(),
    text: q.text.trim(),
    category: q.category.trim(),
    updatedAt: q.updatedAt || nowISO(),
    synced: Boolean(q.synced),
    source: q.source || "local", // "local" | "server"
  }));
}

// ===============================
// Local Storage
// ===============================
function saveQuotes() {
  localStorage.setItem(STORAGE_KEY_QUOTES, JSON.stringify(quotes));
  setStatus(`Saved ${quotes.length} quotes locally.`);
}

function loadQuotes() {
  const raw = localStorage.getItem(STORAGE_KEY_QUOTES);
  if (!raw) {
    quotes = sanitizeQuotesArray([
      {
        id: genLocalId(),
        text: "The best way to get started is to quit talking and begin doing.",
        category: "Motivation",
        updatedAt: nowISO(),
      },
      {
        id: genLocalId(),
        text: "Success is not in what you have, but who you are.",
        category: "Success",
        updatedAt: nowISO(),
      },
      {
        id: genLocalId(),
        text: "Life is what happens when you're busy making other plans.",
        category: "Life",
        updatedAt: nowISO(),
      },
    ]);
    saveQuotes();
    return;
  }
  try {
    quotes = sanitizeQuotesArray(JSON.parse(raw));
  } catch {
    quotes = [];
  }
}

function saveLastSync(ts) {
  localStorage.setItem(STORAGE_KEY_LASTSYNC, ts);
  setSyncStatus(`Last sync: ${new Date(ts).toLocaleString()}`);
}

// ===============================
// Session Storage (last viewed quote)
// ===============================
function saveLastViewedQuote(quote) {
  sessionStorage.setItem(SESSION_KEY_LAST_QUOTE, JSON.stringify(quote));
}
function loadLastViewedQuote() {
  const raw = sessionStorage.getItem(SESSION_KEY_LAST_QUOTE);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// ===============================
// UI Rendering
// ===============================
function renderQuote(q) {
  if (!q) {
    quoteDisplay.textContent = "No quote.";
    return;
  }
  quoteDisplay.innerHTML = `
    <p style="margin:0 0 6px 0;">“${q.text}”</p>
    <span class="muted">— ${q.category} · <span class="pill">${
    q.source || "local"
  }</span></span>
  `;
  saveLastViewedQuote(q);
}

function updateFilterPill() {
  currentFilterPill.textContent = categoryFilter.value;
}

function populateCategories() {
  const categories = ["all", ...new Set(quotes.map((q) => q.category))];
  categoryFilter.innerHTML = "";
  for (const cat of categories) {
    const opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = cat[0].toUpperCase() + cat.slice(1);
    categoryFilter.appendChild(opt);
  }
  const savedFilter = localStorage.getItem(STORAGE_KEY_FILTER) || "all";
  categoryFilter.value = savedFilter;
  updateFilterPill();
}

function getFilteredQuotes() {
  const selected = categoryFilter.value;
  return selected === "all"
    ? quotes
    : quotes.filter((q) => q.category === selected);
}

function filterQuotes() {
  localStorage.setItem(STORAGE_KEY_FILTER, categoryFilter.value);
  updateFilterPill();
  showRandomQuote();
}

// Required by earlier tasks: keep this present; create dynamic form only if missing
function createAddQuoteForm() {
  const hasStatic =
    document.getElementById("newQuoteText") &&
    document.getElementById("newQuoteCategory");
  if (hasStatic) return; // We already have static inputs in HTML

  const wrapper = document.createElement("div");
  const t = document.createElement("input");
  t.id = "newQuoteText";
  t.placeholder = "Enter a new quote";
  t.type = "text";
  const c = document.createElement("input");
  c.id = "newQuoteCategory";
  c.placeholder = "Enter quote category";
  c.type = "text";
  const b = document.createElement("button");
  b.textContent = "Add Quote";
  b.className = "btn";
  b.addEventListener("click", addQuote);
  wrapper.append(t, c, b);
  document.body.appendChild(wrapper);
}

// ===============================
// Core Features
// ===============================
function showRandomQuote() {
  const pool = getFilteredQuotes();
  if (!pool.length) {
    quoteDisplay.textContent = "No quotes available in this category.";
    return;
  }
  const idx = Math.floor(Math.random() * pool.length);
  const q = pool[idx];
  renderQuote(q);
}

function addQuote() {
  const textEl = document.getElementById("newQuoteText");
  const catEl = document.getElementById("newQuoteCategory");
  const text = (textEl.value || "").trim();
  const category = (catEl.value || "").trim();
  if (!text || !category) {
    alert("Please enter both a quote and a category.");
    return;
  }
  const q = {
    id: genLocalId(),
    text,
    category,
    updatedAt: nowISO(),
    synced: false,
    source: "local",
  };
  quotes.push(q);
  saveQuotes();
  populateCategories(); // update dropdown if new category
  renderQuote(q);
  setStatus("Quote added locally. Will sync to server.");
  textEl.value = "";
  catEl.value = "";
}

// ===============================
// Import / Export (JSON)
// ===============================
function exportToJsonFile() {
  const blob = new Blob([JSON.stringify(quotes, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "quotes.json";
  a.click();
  URL.revokeObjectURL(url);
  setStatus("Exported quotes.json");
}

function importFromJsonFile(event) {
  const file = event?.target?.files?.[0];
  if (!file) {
    alert("No file selected.");
    return;
  }
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const imported = sanitizeQuotesArray(JSON.parse(e.target.result));
      const before = quotes.length;
      // Merge by id; if duplicate id, prefer imported
      const byId = new Map(quotes.map((q) => [q.id, q]));
      for (const q of imported) byId.set(q.id, q);
      quotes = Array.from(byId.values());
      saveQuotes();
      populateCategories();
      setStatus(`Imported ${quotes.length - before} new item(s) from JSON.`);
      alert("Quotes imported successfully!");
    } catch {
      alert("Invalid JSON.");
    } finally {
      event.target.value = "";
    }
  };
  reader.readAsText(file);
}

// ===============================
// Server Simulation (via JSONPlaceholder)
// ===============================

// Map a JSONPlaceholder post to our quote model
function mapPostToQuote(post) {
  // We use title/body as text, and tag category "Server"
  const text = (post.title || post.body || "").toString().trim();
  return {
    id: `srv-${post.id}`,
    text: text || "Server sample",
    category: "Server",
    updatedAt: nowISO(), // JSONPlaceholder has no timestamp; we stamp on fetch
    synced: true,
    source: "server",
  };
}

// Fetch some "server" quotes
async function fetchFromServer() {
  const res = await fetch(`${SERVER_URL}?_limit=5`);
  const data = await res.json();
  return Array.isArray(data) ? data.map(mapPostToQuote) : [];
}

// Push local-unsynced quotes to the "server"
async function pushLocalToServer() {
  const unsynced = quotes.filter((q) => !q.synced && q.source === "local");
  if (!unsynced.length) return { pushed: 0, updated: [] };

  // Simulate POST for each unsynced quote
  const updated = [];
  for (const q of unsynced) {
    try {
      const res = await fetch(SERVER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: q.text, body: q.text }),
      });
      const data = await res.json();
      // JSONPlaceholder returns an id, but doesn't persist.
      // We'll mark as synced and convert to a "server id".
      q.id = `srv-${data.id ?? Math.floor(Math.random() * 100000)}`;
      q.synced = true;
      q.source = "server";
      q.updatedAt = nowISO();
      updated.push(q);
    } catch {
      // Network error? Keep as unsynced; we'll retry next sync.
    }
  }
  // Persist local changes
  saveQuotes();
  return { pushed: updated.length, updated };
}

// Merge server quotes into local with simple conflict resolution:
// "Server wins" when the same id exists and content differs.
function mergeServerIntoLocal(serverQuotes) {
  const localMap = new Map(quotes.map((q) => [q.id, q]));
  const conflicts = [];

  for (const s of serverQuotes) {
    const l = localMap.get(s.id);
    if (!l) {
      localMap.set(s.id, s);
      continue;
    }
    // If different content, resolve conflict
    const differs = l.text !== s.text || l.category !== s.category;
    if (differs) {
      conflicts.push({ id: s.id, local: { ...l }, server: { ...s } });
      // Server wins:
      localMap.set(s.id, s);
    } else {
      // Keep whichever has newer timestamp (no-op here since we stamp fetch)
      // You could compare Date.parse(l.updatedAt) vs Date.parse(s.updatedAt)
      localMap.set(s.id, s);
    }
  }

  // Preserve local-only quotes too:
  for (const [id, lq] of new Map(quotes.map((q) => [q.id, q]))) {
    if (!localMap.has(id)) localMap.set(id, lq);
  }

  quotes = Array.from(localMap.values());
  saveQuotes();
  return conflicts;
}

function showConflicts(conflicts) {
  if (!conflicts.length) {
    conflictCenter.style.display = "none";
    conflictList.innerHTML = "";
    return;
  }
  conflictCenter.style.display = "block";
  conflictList.innerHTML = conflicts
    .map((c) => {
      const localPreview = `“${c.local.text}” — ${c.local.category}`;
      const serverPreview = `“${c.server.text}” — ${c.server.category}`;
      return `
      <div class="card" style="margin:8px 0;">
        <div><strong>ID:</strong> ${c.id}</div>
        <div style="margin-top:6px;"><strong>Server version (kept):</strong><br/>${serverPreview}</div>
        <div style="margin-top:6px;"><strong>Local version (overwritten):</strong><br/>${localPreview}</div>
        <div class="row" style="margin-top:8px;">
          <button class="btn" onclick="restoreLocalVersion('${c.id}')">Restore Local Version</button>
          <button class="btn" onclick="keepServerVersion('${c.id}')">Keep Server Version</button>
        </div>
      </div>
    `;
    })
    .join("");
}

function restoreLocalVersion(conflictId) {
  // This requires we stored the last conflict set; simplest approach:
  // We embed local version inside a data attribute in conflictList, but for brevity,
  // we keep a copy in window._lastConflicts
  const entry = (window._lastConflicts || []).find((c) => c.id === conflictId);
  if (!entry) return;
  // Put back local version and mark as not synced (so next push can re-send)
  const idx = quotes.findIndex((q) => q.id === conflictId);
  if (idx >= 0) {
    quotes[idx] = {
      ...entry.local,
      synced: false,
      source: "local",
      updatedAt: nowISO(),
    };
    saveQuotes();
    setStatus("Restored local version; will be pushed on next sync.");
    showConflicts(
      (window._lastConflicts || []).filter((c) => c.id !== conflictId)
    );
  }
}

function keepServerVersion(conflictId) {
  const entry = (window._lastConflicts || []).find((c) => c.id === conflictId);
  if (!entry) return;
  // Ensure server version is saved
  const idx = quotes.findIndex((q) => q.id === conflictId);
  if (idx >= 0) {
    quotes[idx] = { ...entry.server };
    saveQuotes();
    setStatus("Kept server version.");
    showConflicts(
      (window._lastConflicts || []).filter((c) => c.id !== conflictId)
    );
  }
}

// Full sync: push local changes, then pull from server and merge
async function syncWithServer() {
  try {
    setSyncStatus("Syncing…");
    await pushLocalToServer();
    const serverData = await fetchFromServer();
    const conflicts = mergeServerIntoLocal(serverData);
    window._lastConflicts = conflicts; // store for restore buttons
    showConflicts(conflicts);
    populateCategories(); // categories may change (e.g., if server items have categories)
    saveLastSync(Date.now());
    setSyncStatus(
      `Synced at ${new Date().toLocaleTimeString()}. Conflicts: ${
        conflicts.length
      }.`
    );
  } catch (e) {
    setSyncStatus("Sync failed (network?).");
  }
}

// ===============================
// Wiring / Init
// ===============================
document.addEventListener("DOMContentLoaded", () => {
  loadQuotes();
  populateCategories();

  const last = loadLastViewedQuote();
  if (last) renderQuote(last);

  if (newQuoteBtn) newQuoteBtn.addEventListener("click", showRandomQuote);
  if (syncNowBtn) syncNowBtn.addEventListener("click", syncWithServer);

  // Restore auto-sync preference (default ON for demo)
  const autostart = true;
  autoSyncToggle.checked = autostart;
  if (autostart) {
    autoSyncTimer = setInterval(syncWithServer, AUTO_SYNC_MS);
  }

  autoSyncToggle.addEventListener("change", (e) => {
    if (e.target.checked) {
      if (!autoSyncTimer)
        autoSyncTimer = setInterval(syncWithServer, AUTO_SYNC_MS);
      setSyncStatus("Auto-sync enabled.");
    } else {
      clearInterval(autoSyncTimer);
      autoSyncTimer = null;
      setSyncStatus("Auto-sync disabled.");
    }
  });

  // Show current filter immediately
  filterQuotes();
});
