const chatContainer = document.getElementById("chat-container");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");

const BACKEND_URL = "https://aegisai-backend-ifvc.onrender.com/chat";

// Send message function
async function sendMessage() {
    const message = userInput.value.trim();
    if (!message) return;

    // Show user message
    const userDiv = document.createElement("div");
    userDiv.classList.add("message", "user");
    userDiv.innerText = message;
    chatContainer.appendChild(userDiv);

    userInput.value = "";

    // Show loading message
    const loadingDiv = document.createElement("div");
    loadingDiv.classList.add("message", "bot");
    loadingDiv.innerText = "Zytherion is thinking...";
    chatContainer.appendChild(loadingDiv);

    chatContainer.scrollTop = chatContainer.scrollHeight;

try {
    const token = localStorage.getItem("token");

const response = await fetch("https://aegisai-backend-ifvc.onrender.com/chat", {
    method: "POST",
    headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token
    },
    body: JSON.stringify({
        message: message,
        userId: userId
    })
});


        const data = await response.json();

        loadingDiv.remove();

        const botDiv = document.createElement("div");
        botDiv.classList.add("message", "bot");
        botDiv.innerText = data.reply || JSON.stringify(data);
        chatContainer.appendChild(botDiv);

        chatContainer.scrollTop = chatContainer.scrollHeight;

    } catch (error) {
        loadingDiv.remove();

        const errorDiv = document.createElement("div");
        errorDiv.classList.add("message", "bot");
        errorDiv.innerText = "Connection error.";
        chatContainer.appendChild(errorDiv);
    }
}

// Button click
sendBtn.addEventListener("click", sendMessage);

// Enter key support
userInput.addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
        sendMessage();
    }
});
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("service-worker.js")
      .then(() => console.log("Service Worker Registered"))
      .catch(err => console.log("Service Worker Error:", err));
  });
}
