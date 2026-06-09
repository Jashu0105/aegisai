const chatContainer = document.getElementById("chat-container");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");

const BACKEND_URL = "http://localhost:3000/chat";

async function sendMessage() {
    const messageText = userInput.value.trim();
    if (!messageText) return;

    // Show user message bubble
    const userDiv = document.createElement("div");
    userDiv.classList.add("message", "user");
    userDiv.innerText = messageText;
    chatContainer.appendChild(userDiv);

    userInput.value = "";

    // Show loading indicator
    const loadingDiv = document.createElement("div");
    loadingDiv.classList.add("message", "bot");
    loadingDiv.innerText = "Zytherion is thinking...";
    chatContainer.appendChild(loadingDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;

    try {
        const token = localStorage.getItem("token");
        if (!token) {
            window.location.href = "login.html";
            return;
        }

        const response = await fetch(BACKEND_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ message: messageText })
        });

        if (response.status === 401 || response.status === 403) {
            localStorage.removeItem("token");
            window.location.href = "login.html";
            return;
        }

        const data = await response.json();
        loadingDiv.remove();

        const botDiv = document.createElement("div");
        botDiv.classList.add("message", "bot");
        
        // Dynamic payload parsing
        botDiv.innerText = data.reply || data.botReply || data.message || "Error: Unexpected response format.";
        chatContainer.appendChild(botDiv);
        chatContainer.scrollTop = chatContainer.scrollHeight;

    } catch (error) {
        loadingDiv.remove();
        const errorDiv = document.createElement("div");
        errorDiv.classList.add("message", "bot");
        errorDiv.innerText = "Connection error. Please try again.";
        chatContainer.appendChild(errorDiv);
        console.error("Chat Error:", error);
    }
}

sendBtn.addEventListener("click", sendMessage);
userInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
        e.preventDefault();
        sendMessage();
    }
});