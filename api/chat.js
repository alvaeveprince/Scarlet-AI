export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { userText, imageData, history } = req.body;

    const API_KEY = process.env.OPENROUTER_API_KEY;

    if (!API_KEY) {
      return res.status(500).json({ error: "Missing API key on server" });
    }

    // 🧠 SYSTEM PROMPT
    const systemInstruction = `
You are Scarlet AI, a highly conversational assistant.

CRITICAL RULES:
- Always maintain conversation context
- NEVER say you cannot see past messages
- Be natural, human-like, and contextual
- If an image is provided, analyze it carefully
`;

    // 🧠 SAFE HISTORY
    const safeHistory = Array.isArray(history)
      ? history.slice(-12).map(m => ({
          role: m.role === "model" ? "assistant" : m.role,
          content: Array.isArray(m.parts)
            ? m.parts.map(p => p.text || "").join(" ")
            : (m.content || "")
        }))
      : [];

    // 🧠 BUILD USER MESSAGE (WITH IMAGE SUPPORT FIX)
    let userMessage;

    if (imageData) {
      userMessage = {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: {
              url: imageData
            }
          },
          {
            type: "text",
            text: userText || "Describe this image"
          }
        ]
      };
    } else {
      userMessage = {
        role: "user",
        content: userText || ""
      };
    }

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

          ...safeHistory,

          userMessage
        ]
      })
    });

    const data = await response.json();

    const text = data?.choices?.[0]?.message?.content;

    if (!text) {
      return res.status(500).json({
        error: "Empty response from AI",
        raw: data
      });
    }

    return res.status(200).json({ text });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
