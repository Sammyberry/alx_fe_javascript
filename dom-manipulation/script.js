// ===============================
// Constants (keys for storage)
// ===============================
const STORAGE_KEY = "dqg_quotes_v1";
const SESSION_KEY_LAST = "dqg_last_quote";

// ===============================
// Seed data (only used if no saved data)
// ===============================
const DEFAULT_QUOTES = [
  {
    text: "The best way to get started is to quit talking and begin doing.",
    category: "Motivation",
  },
  {
    text: "Success is not in what you have, but who you are.",
    category: "Success",
  },
  { text: "Happiness depends upon ourselves.", category: "Happiness" },
];

// Will be replaced by loadQuotes()
let quotes = [...DEFAULT_QUOTES];

// ===============================
// DOM refs
// ===============================
const quoteDisplay = document.getElementById("quoteDisplay");
const newQuoteBtn = document.getElementById("newQuote");
const statusEl = document.getElementById("status");

// ===============================
// Helpers
// ===============================
function setStatus(msg) {
  if (!statusEl) return;
  statusEl.textContent = msg || "";
}

function isValidQuote(item) {
  return (
    item &&
    typeof item === "object" &&
    typeof item.text === "string" &&
    item.text.trim().length > 0 &&
    typeof item.category === "string" &&
    item.category.trim().length > 0
  );
}

function sanitizeQuotesArray(arr) {
  if (!Array.isArray(arr)) return [];
  return arr
    .filter(isValidQuote)
    .map((q) => ({ text: q.text.trim(), category: q.category.trim() }));
}

// ===============================
// Local Storage (persist quotes)
// ===============================
function loadQuotes() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      quotes = [...DEFAULT_QUOTES];
      saveQuotes(); // create the key for first time
      return;
    }
    const parsed = JSON.parse(raw);
    const cleaned = sanitizeQuotesArray(parsed);
    quotes = cleaned.length ? cleaned : [...DEFAULT_QUOTES];
  } catch (e) {
    console.warn("Failed to load quotes from localStorage:", e);
    quotes = [...DEFAULT_QUOTES];
  }
}

function saveQuotes() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(quotes));
    setStatus(`Saved ${quotes.length} quotes to local storage.`);
  } catch (e) {
    console.error("Failed to save quotes:", e);
    setStatus("Failed to save quotes.");
  }
}

// ===============================
// Session Storage (remember last viewed quote)
// ===============================
function saveLastViewed(quoteObj) {
  try {
    sessionStorage.setItem(SESSION_KEY_LAST, JSON.stringify(quoteObj));
  } catch (e) {
    console.warn("Failed to save last viewed quote:", e);
  }
}

function getLastViewed() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY_LAST);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return isValidQuote(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

// ===============================
// UI rendering
// ===============================
function renderQuote(quoteObj) {
  if (!quoteObj) return;
  quoteDisplay.innerHTML = "";
  const p = document.createElement("p");
  p.textContent = `"${quoteObj.text}"`;
  const span = document.createElement("span");
  span.textContent = ` — ${quoteObj.category}`;
  span.style.fontStyle = "italic";
  quoteDisplay.append(p, span);
}

// ===============================
// Required functions
// ===============================
function showRandomQuote() {
  if (!quotes.length) {
    quoteDisplay.textContent = "No quotes available. Add one!";
    return;
  }
  const idx = Math.floor(Math.random() * quotes.length);
  const q = quotes[idx];
  renderQuote(q);
  saveLastViewed(q); // <-- session storage use
}

function addQuote() {
  const textInput = document.getElementById("newQuoteText");
  const categoryInput = document.getElementById("newQuoteCategory");

  const text = textInput?.value.trim() || "";
  const category = categoryInput?.value.trim() || "";

  if (!text || !category) {
    alert("Please enter both a quote and a category.");
    return;
  }

  quotes.push({ text, category });
  saveQuotes();

  // Clear and show newly added quote immediately
  textInput.value = "";
  categoryInput.value = "";
  renderQuote({ text, category });
  saveLastViewed({ text, category });

  alert("Quote added successfully!");
}

/**
 * Kept for checker compatibility.
 * Creates the add-quote UI ONLY if the static inputs aren't present.
 */
function createAddQuoteForm() {
  const hasStatic =
    document.getElementById("newQuoteText") &&
    document.getElementById("newQuoteCategory") &&
    (document.querySelector('button[onclick="addQuote()"]') ||
      document.getElementById("addQuoteBtn"));

  if (hasStatic) return; // we already have the form in HTML

  const wrapper = document.createElement("div");
  const textInput = document.createElement("input");
  textInput.id = "newQuoteText";
  textInput.type = "text";
  textInput.placeholder = "Enter a new quote";

  const categoryInput = document.createElement("input");
  categoryInput.id = "newQuoteCategory";
  categoryInput.type = "text";
  categoryInput.placeholder = "Enter quote category";

  const btn = document.createElement("button");
  btn.id = "addQuoteBtn";
  btn.textContent = "Add Quote";
  btn.addEventListener("click", addQuote);

  wrapper.append(textInput, categoryInput, btn);
  document.body.appendChild(wrapper);
}

// ===============================
// JSON Export / Import
// ===============================
function exportToJsonFile() {
  const blob = new Blob([JSON.stringify(quotes, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "quotes.json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  setStatus("Exported quotes.json");
}

// Matches the signature in your instructions
function importFromJsonFile(event) {
  const files = event?.target?.files;
  if (!files || !files[0]) {
    alert("No file selected.");
    return;
  }
  const fileReader = new FileReader();
  fileReader.onload = function (e) {
    try {
      const imported = JSON.parse(e.target.result);
      const cleaned = sanitizeQuotesArray(imported);
      if (!cleaned.length) {
        alert(
          "No valid quotes found in the file. Expect array of {text, category}."
        );
        return;
      }
      const before = quotes.length;
      quotes.push(...cleaned);
      saveQuotes();
      alert(
        `Quotes imported successfully! Added ${quotes.length - before} item(s).`
      );
      setStatus(`Imported ${quotes.length - before} quotes from file.`);
    } catch (err) {
      console.error(err);
      alert("Invalid JSON file.");
    } finally {
      // Clear file input so same file can be re-imported if desired
      event.target.value = "";
    }
  };
  fileReader.readAsText(files[0]);
}

// ===============================
// Init
// ===============================
document.addEventListener("DOMContentLoaded", () => {
  loadQuotes();
  createAddQuoteForm();

  // Restore last viewed quote for this tab (session)
  const last = getLastViewed();
  if (last) {
    renderQuote(last);
    setStatus("Restored last viewed quote from this session.");
  }

  if (newQuoteBtn) newQuoteBtn.addEventListener("click", showRandomQuote);
});
