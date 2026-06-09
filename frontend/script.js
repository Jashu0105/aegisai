const chatContainer = document.getElementById("chat-container");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");

const BACKEND_URL = "http://localhost:3000/chat";

async function sendMessage() {
    const message = userInput.value.trim();
    if (!message) return;

    // Show user message chat bubble
    const userDiv = document.createElement("div");
    userDiv.classList.add("message", "user");
    userDiv.innerText = message;
    chatContainer.appendChild(userDiv);

    userInput.value = "";

    // Show processing loading placeholder
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
            body: JSON.stringify({ message: message })
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
        botDiv.innerText = data.reply || data.botReply || data.message || "Error: Unexpected response format.";
        chatContainer.appendChild(botDiv);

        chatContainer.scrollTop = chatContainer.scrollHeight;

    } catch (error) {
        if (chatContainer.contains(loadingDiv)) {
            loadingDiv.remove();
        }

        const errorDiv = document.createElement("div");
        errorDiv.classList.add("message", "bot");
        errorDiv.innerText = "Connection error. Ensure your backend server process is initialized.";
        chatContainer.appendChild(errorDiv);
        console.error("Chat Execution Path Error:", error);
    }
}

sendBtn.addEventListener("click", sendMessage);
userInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
        e.preventDefault();
        sendMessage();
    }
});