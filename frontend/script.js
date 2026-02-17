// ===============================
// AegisAI Production Frontend JS
// ===============================

document.addEventListener("DOMContentLoaded", () => {

    const chatContainer = document.getElementById("chat-container");
    const userInput = document.getElementById("user-input");
    const sendBtn = document.getElementById("send-btn");

    if (!chatContainer || !userInput || !sendBtn) {
        console.error("HTML elements not found. Check your IDs.");
        return;
    }

    // ===============================
    // Get or Create User ID
    // ===============================
    let userId = localStorage.getItem("aegis_user_id");

    if (!userId) {
        userId = "user_" + Math.random().toString(36).substring(2);
        localStorage.setItem("aegis_user_id", userId);
    }

    // ===============================
    // Send Message
    // ===============================
    async function sendMessage() {
        const message = userInput.value.trim();
        if (!message) return;

        addMessage(message, "user");
        userInput.value = "";

        const loadingElement = addMessage("AegisAI is thinking...", "bot");
        loadingElement.classList.add("loading");

        try {
            const response = await fetch("http://127.0.0.1:3000/chat", {

                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    message: message,
                    userId: userId
                })
            });

            const data = await response.json();

            loadingElement.remove();

            if (data.reply) {
                addMessage(data.reply, "bot");
            } else {
                addMessage("AI service error.", "bot");
            }

        } catch (error) {
            loadingElement.remove();
            addMessage("Server connection failed.", "bot");
            console.error("Frontend Error:", error);
        }
    }

    // ===============================
    // Add Message to Chat UI
    // ===============================
    function addMessage(text, type) {
        const messageDiv = document.createElement("div");
        messageDiv.classList.add("message", type);
        messageDiv.innerText = text;

        chatContainer.appendChild(messageDiv);
        chatContainer.scrollTop = chatContainer.scrollHeight;

        return messageDiv;
    }

    // ===============================
    // Button Click Event
    // ===============================
    sendBtn.addEventListener("click", sendMessage);

    // ===============================
    // Enter Key Support
    // ===============================
    userInput.addEventListener("keypress", function (e) {
        if (e.key === "Enter") {
            sendMessage();
        }
    });

});
