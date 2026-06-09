import axios from 'axios';

export async function fetchLiveWebData(userQuery) {
    try {
        const response = await axios.get('https://api.tavily.com/search', {
            params: {
                api_key: process.env.TAVILY_API_KEY,
                query: userQuery,
                search_depth: "basic",
                include_answer: false
            }
        });
        return response.data.results.map(result => `Source: ${result.title}\nContent: ${result.content}`).join('\n\n');
    } catch (error) {
        console.error("Failed to fetch live data:", error);
        return "No real-time data available.";
    }
}