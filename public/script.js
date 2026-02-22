// public/script.js - HIV Mate Frontend Logic

const chatBox = document.getElementById("chat-box");
const chatForm = document.getElementById("chat-form");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");
const newChatBtn = document.getElementById("new-chat-btn");
const historyTags = document.getElementById("history-tags");
const clearHistoryBtn = document.getElementById("clear-history-btn");

const STORAGE_KEY = "hivmate_history";
const MAX_HISTORY = 6;

// ============ MESSAGE RENDERING ============
function appendMessage(sender, text, isLoading = false) {
  const messageEl = document.createElement("div");
  messageEl.className = `message message-${sender}`;

  if (isLoading) {
    messageEl.innerHTML = `
      <div class="typing-indicator">
        <span></span><span></span><span></span>
      </div>
      <p>HIV Mate is thinking...</p>
    `;
    messageEl.id = "loading-message";
  } else {
    messageEl.textContent = text;
  }

  chatBox.appendChild(messageEl);
  scrollToBottom();
  return messageEl;
}

function scrollToBottom() {
  chatBox.scrollTop = chatBox.scrollHeight;
}

// ============ HISTORY MANAGEMENT ============
function loadHistory() {
  try {
    const history = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    historyTags.innerHTML = "";

    if (history.length === 0) {
      historyTags.innerHTML = '<p class="no-history">No recent questions yet</p>';
      return;
    }

    history.slice(0, MAX_HISTORY).forEach((question) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = truncateText(question, 30);
      btn.title = question;
      btn.className = "history-tag";
      btn.onclick = (e) => {
        e.preventDefault();
        userInput.value = question;
        userInput.focus();
      };
      historyTags.appendChild(btn);
    });
  } catch (error) {
    console.error("Error loading history:", error);
  }
}

function saveToHistory(text) {
  if (!text || text.length < 3) return;

  try {
    let history = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");

    // Remove if already exists (to move to top)
    history = history.filter((h) => h !== text);

    // Add to front
    history.unshift(text);

    // Keep only recent
    history = history.slice(0, 20);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    loadHistory();
  } catch (error) {
    console.error("Error saving to history:", error);
  }
}

function clearHistory() {
  if (confirm("Clear all recent questions?")) {
    localStorage.removeItem(STORAGE_KEY);
    loadHistory();
  }
}

// ============ UTILITY FUNCTIONS ============
function truncateText(text, maxLen) {
  return text.length > maxLen ? text.substring(0, maxLen) + "..." : text;
}

function setLoading(isLoading) {
  sendBtn.disabled = isLoading;
  userInput.disabled = isLoading;
}

// ============ CHAT FUNCTIONALITY ============
async function sendMessage() {
  const message = userInput.value.trim();

  if (!message) return;

  // Display user message
  appendMessage("user", message);
  userInput.value = "";
  saveToHistory(message);

  // Show loading state
  setLoading(true);
  const loadingEl = appendMessage("bot", "", true);

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: message,
        language: document.documentElement.lang || "en"
      })
    });

    const data = await response.json();

    // Remove loading message
    loadingEl.remove();

    if (!response.ok) {
      appendMessage("bot", data.error || "Sorry, something went wrong. Please try again.");
    } else {
      const reply = data.reply || "I couldn't generate a response. Please try again.";
      appendMessage("bot", reply);

      // Highlight emergency messages
      if (data.isEmergency) {
        const lastMsg = chatBox.lastElementChild;
        lastMsg.classList.add("emergency-message");
      }
    }
  } catch (error) {
    console.error("Chat error:", error);
    loadingEl.remove();
    appendMessage("bot", "Network error. Please check your connection and try again.");
  } finally {
    setLoading(false);
    userInput.focus();
  }
}

// ============ EVENT LISTENERS ============
chatForm.addEventListener("submit", (e) => {
  e.preventDefault();
  sendMessage();
});

newChatBtn.addEventListener("click", () => {
  if (chatBox.children.length > 0) {
    if (confirm("Start a new chat? Current conversation will be cleared.")) {
      chatBox.innerHTML = "";
      userInput.focus();
    }
  }
});

clearHistoryBtn?.addEventListener("click", clearHistory);

// Send button click (mobile friendly)
sendBtn.addEventListener("click", (e) => {
  e.preventDefault();
  sendMessage();
});

// Allow Enter to send, Shift+Enter for new line on desktop
userInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

// Mobile menu toggle
document.getElementById("menu-btn")?.addEventListener("click", () => {
  document.querySelector(".sidebar").classList.toggle("mobile-open");
});

// Close sidebar when clicking outside on mobile
document.addEventListener("click", (e) => {
  const sidebar = document.querySelector(".sidebar");
  const menuBtn = document.getElementById("menu-btn");

  if (!sidebar.contains(e.target) && !menuBtn.contains(e.target)) {
    sidebar.classList.remove("mobile-open");
  }
});

// ============ INITIALIZATION ============
document.addEventListener("DOMContentLoaded", () => {
  loadHistory();
  userInput.focus();

  // Simulate a welcome message
  setTimeout(() => {
    if (chatBox.children.length === 0) {
      appendMessage(
        "bot",
        "Hello! I'm HIV Mate. I'm here to provide warm, non-judgmental support on HIV prevention, testing, PrEP, and connecting you with friendly clinics. What would you like to know? 💙"
      );
    }
  }, 300);
});
