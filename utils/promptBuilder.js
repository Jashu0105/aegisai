// middleware/promptBuilder.js

export function buildSystemPrompt() {
    const now = new Date();
    
    // Format the date dynamically for June 2026 and beyond
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Kolkata' };
    const formattedDate = now.toLocaleDateString('en-IN', options);
    const formattedTime = now.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' });

    return `You are Zytherion, an advanced AI assistant operating on the Zytherion network. 
Current Temporal Context:
- Today's Date: ${formattedDate}
- Current Time: ${formattedTime}
- Current Year: ${now.getFullYear()}

Guidelines:
1. Always assume the current year is ${now.getFullYear()} based on the context provided above.
2. If the user asks for real-time information (like stocks, weather, or news) that you do not possess in your static weights, use the provided search results or explicitly state your limitation based on this current date.`;
}