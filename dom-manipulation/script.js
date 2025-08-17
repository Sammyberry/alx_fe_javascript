// =======================
// Dynamic Quote Generator
// =======================

// Global array of quotes
let quotes = [];

// DOM elements
const quoteDisplay = document.getElementById("quoteDisplay");
const newQuoteBtn = document.getElementById("newQuote");

// =======================
// Local Storage Functions
// =======================
function saveQuotes() {
  localStorage.setItem("quotes", JSON.stringify(quotes));
}

function loadQuotes() {
  const saved = localStorage.getItem("quotes");
  if (saved) {
    quotes = JSON.parse(saved);
  } else {
    quotes = [
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
    saveQuotes(); // store defaults
  }
}

// =======================
// Session Storage Functions
// =======================
function saveLastViewedQuote(quote) {
  sessionStorage.setItem("lastQuote", JSON.stringify(quote));
}

function loadLastViewedQuote() {
  const saved = sessionStorage.getItem("lastQuote");
  if (saved) {
    return JSON.parse(saved);
  }
  return null;
}

// =======================
// Display Functions
// =======================
function renderQuote(quote) {
  quoteDisplay.innerHTML = `
    <p><strong>Quote:</strong> "${quote.text}"</p>
    <p><strong>Category:</strong> ${quote.category}</p>
  `;
  saveLastViewedQuote(quote); // save for this session
}

function showRandomQuote() {
  if (quotes.length === 0) {
    quoteDisplay.innerHTML = "<p>No quotes available. Please add some!</p>";
    return;
  }
  const randomIndex = Math.floor(Math.random() * quotes.length);
  const randomQuote = quotes[randomIndex];
  renderQuote(randomQuote);
}

// =======================
// Add Quote Form
// =======================
function createAddQuoteForm() {
  const formDiv = document.createElement("div");

  const quoteInput = document.createElement("input");
  quoteInput.type = "text";
  quoteInput.placeholder = "Enter a new quote";
  quoteInput.id = "newQuoteText";

  const categoryInput = document.createElement("input");
  categoryInput.type = "text";
  categoryInput.placeholder = "Enter quote category";
  categoryInput.id = "newQuoteCategory";

  const addBtn = document.createElement("button");
  addBtn.textContent = "Add Quote";
  addBtn.addEventListener("click", addQuote);

  formDiv.appendChild(quoteInput);
  formDiv.appendChild(categoryInput);
  formDiv.appendChild(addBtn);

  document.body.appendChild(formDiv);
}

function addQuote() {
  const textInput = document.getElementById("newQuoteText");
  const categoryInput = document.getElementById("newQuoteCategory");

  const newText = textInput.value.trim();
  const newCategory = categoryInput.value.trim();

  if (newText && newCategory) {
    const newQuote = { text: newText, category: newCategory };
    quotes.push(newQuote);
    saveQuotes(); // persist
    alert("New quote added!");

    textInput.value = "";
    categoryInput.value = "";
  } else {
    alert("Please enter both a quote and a category.");
  }
}

// =======================
// Export / Import JSON
// =======================
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
}

function importFromJsonFile(event) {
  const fileReader = new FileReader();

  fileReader.onload = function (e) {
    const importedQuotes = JSON.parse(e.target.result);
    quotes.push(...importedQuotes); // merge
    saveQuotes(); // persist
    alert("Quotes imported successfully!");
  };

  fileReader.readAsText(event.target.files[0]);
}

// =======================
// Initialize App
// =======================
document.addEventListener("DOMContentLoaded", () => {
  loadQuotes();

  // Restore last viewed quote for this session
  const last = loadLastViewedQuote();
  if (last) {
    renderQuote(last);
  }

  // Event listeners
  newQuoteBtn.addEventListener("click", showRandomQuote);

  // Add input form dynamically
  createAddQuoteForm();

  // Add Export / Import buttons
  const exportBtn = document.createElement("button");
  exportBtn.textContent = "Export Quotes";
  exportBtn.addEventListener("click", exportToJsonFile);

  const importInput = document.createElement("input");
  importInput.type = "file";
  importInput.accept = ".json";
  importInput.addEventListener("change", importFromJsonFile);

  document.body.appendChild(exportBtn);
  document.body.appendChild(importInput);
});
