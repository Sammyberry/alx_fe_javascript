let quotes = [];

// ===== STORAGE HELPERS =====
function saveQuotes() {
  localStorage.setItem("quotes", JSON.stringify(quotes));
}

function loadQuotes() {
  const storedQuotes = localStorage.getItem("quotes");
  if (storedQuotes) {
    quotes = JSON.parse(storedQuotes);
  } else {
    quotes = [
      {
        text: "The best way to predict the future is to invent it.",
        category: "Inspiration",
      },
      {
        text: "Life is what happens when you’re busy making other plans.",
        category: "Life",
      },
      { text: "Do or do not. There is no try.", category: "Motivation" },
    ];
    saveQuotes();
  }
}

// ===== DOM FUNCTIONS =====
function showRandomQuote() {
  if (quotes.length === 0) return;
  const randomIndex = Math.floor(Math.random() * quotes.length);
  const quote = quotes[randomIndex];
  document.getElementById(
    "quoteDisplay"
  ).textContent = `"${quote.text}" — [${quote.category}]`;

  // Save last viewed in session storage
  sessionStorage.setItem("lastViewedQuote", JSON.stringify(quote));
}

function createAddQuoteForm() {
  const formDiv = document.getElementById("addQuoteForm");
  formDiv.innerHTML = `
    <input id="newQuoteText" type="text" placeholder="Enter a new quote" />
    <input id="newQuoteCategory" type="text" placeholder="Enter quote category" />
    <button onclick="addQuote()">Add Quote</button>
  `;
}

function addQuote() {
  const textInput = document.getElementById("newQuoteText");
  const categoryInput = document.getElementById("newQuoteCategory");

  const text = textInput.value.trim();
  const category = categoryInput.value.trim();

  if (text && category) {
    const newQuote = { text, category };
    quotes.push(newQuote);
    saveQuotes();
    populateCategories();
    filterQuotes();

    textInput.value = "";
    categoryInput.value = "";

    // Optionally sync to server
    postQuoteToServer(newQuote);
  } else {
    alert("Please enter both text and category!");
  }
}

// ===== CATEGORY FILTER =====
function populateCategories() {
  const filter = document.getElementById("categoryFilter");
  const categories = ["all", ...new Set(quotes.map((q) => q.category))];

  filter.innerHTML = categories
    .map((cat) => `<option value="${cat}">${cat}</option>`)
    .join("");

  // Restore last filter
  const savedFilter = localStorage.getItem("selectedCategory");
  if (savedFilter && categories.includes(savedFilter)) {
    filter.value = savedFilter;
    filterQuotes();
  }
}

function filterQuotes() {
  const filter = document.getElementById("categoryFilter").value;
  localStorage.setItem("selectedCategory", filter);

  let filteredQuotes = quotes;
  if (filter !== "all") {
    filteredQuotes = quotes.filter((q) => q.category === filter);
  }

  const display = document.getElementById("quoteDisplay");
  if (filteredQuotes.length === 0) {
    display.textContent = "No quotes in this category.";
  } else {
    const randomIndex = Math.floor(Math.random() * filteredQuotes.length);
    const quote = filteredQuotes[randomIndex];
    display.textContent = `"${quote.text}" — [${quote.category}]`;
  }
}

// ===== JSON IMPORT/EXPORT =====
function exportToJsonFile() {
  const dataStr = JSON.stringify(quotes, null, 2);
  const blob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "quotes.json";
  a.click();

  URL.revokeObjectURL(url);
}

function importFromJsonFile(event) {
  const fileReader = new FileReader();
  fileReader.onload = function (event) {
    const importedQuotes = JSON.parse(event.target.result);
    quotes.push(...importedQuotes);
    saveQuotes();
    populateCategories();
    alert("Quotes imported successfully!");
  };
  fileReader.readAsText(event.target.files[0]);
}

// ===== SERVER SYNC (Simulation) =====
async function fetchQuotesFromServer() {
  const response = await fetch("https://jsonplaceholder.typicode.com/posts");
  const data = await response.json();
  // Simulate quotes from server
  return data.slice(0, 5).map((post) => ({
    text: post.title,
    category: "Server",
  }));
}

async function postQuoteToServer(quote) {
  await fetch("https://jsonplaceholder.typicode.com/posts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(quote),
  });
}

function syncQuotes() {
  fetchQuotesFromServer().then((serverQuotes) => {
    quotes = serverQuotes; // Server wins
    saveQuotes();
    populateCategories();
    filterQuotes();

    // ✅ UI Notification
    const syncStatus = document.getElementById("syncStatus");
    if (syncStatus) {
      syncStatus.textContent = "Quotes synced with server!";
      setTimeout(() => {
        syncStatus.textContent = "";
      }, 3000);
    }
  });
}

// Periodic Sync every 15s
setInterval(syncQuotes, 15000);

// ===== INIT =====
loadQuotes();
createAddQuoteForm();
populateCategories();
filterQuotes();
