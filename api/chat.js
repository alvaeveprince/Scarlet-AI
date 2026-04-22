export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { userText, imageData, history } = req.body;

    const API_KEY = process.env.OPENROUTER_API_KEY;

    const systemInstruction = `
You are Scarlet AI, a highly conversational assistant.

IMPORTANT RULES:
- Remember conversation flow
- Respond using full chat context
- NEVER say you cannot see past messages
- Always behave like a continuous conversation
- Be natural, human-like, and context-aware
`;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://your-site.vercel.app",
        "X-Title": "Scarlet AI"
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: systemInstruction
          },

          ...(history || []).slice(-12).map(m => ({
            role: m.role === "model" ? "assistant" : m.role,
            content: m.parts
              ? m.parts.map(p => p.text || "").join(" ")
              : m.content
          })),

          {
            role: "user",
            content: userText
          }
        ]
      })
    });

    const data = await response.json();

    return res.status(200).json({
      text: data?.choices?.[0]?.message?.content || "No response"
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
