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

    const systemInstruction = `
You are Scarlet AI, a highly conversational assistant.

CRITICAL RULES:
- Always maintain conversation context
- Be natural, human-like, and helpful
- If an image is provided, analyze it carefully
`;

    const safeHistory = Array.isArray(history)
      ? history.slice(-12).map(m => ({
          role: m.role === "model" ? "assistant" : "user",
          content: m.parts?.map(p => p.text).join(" ") || m.content || ""
        }))
      : [];

    let userMessage;

    if (imageData) {
      userMessage = {
        role: "user",
        content: [
          {
            type: "text",
            text: userText || "Describe this image"
          },
          {
            type: "image_url",
            image_url: {
              url: imageData.startsWith("data:")
                ? imageData
                : `data:image/png;base64,${imageData}`
            }
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
        "HTTP-Referer": req.headers.origin || "https://vercel.app",
        "X-Title": "Scarlet AI"
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        messages: [
          { role: "system", content: systemInstruction },
          ...safeHistory,
          userMessage
        ],
        temperature: 0.7,
        max_tokens: 1500
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data?.error?.message || "OpenRouter request failed"
      });
    }

    const text = data?.choices?.[0]?.message?.content;

    if (!text) {
      return res.status(500).json({ error: "Empty response from AI" });
    }

    return res.status(200).json({ text });

  } catch (err) {
    console.error("Server Error:", err);
    return res.status(500).json({ error: err.message });
  }
}
