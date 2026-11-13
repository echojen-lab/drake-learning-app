// Vercel serverless function: POST /api/chat
// Keeps the API key and the tutor's system prompt on the server.
//
// Request body:  { "message": "I goed to Tokyo", "history": [{ "role": "user"|"assistant", "content": "..." }, ...] }
// Response:      { "reply": "..." }  or  { "error": "..." }

import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-sonnet-5-5";
// Used only if MODEL declines a message (stop_reason "refusal")
const FALLBACK_MODEL = "claude-sonnet-5";

const MAX_TOKENS = 200;
const MAX_HISTORY = 30;   // only the most recent messages are sent (limits cost)
const MAX_CHARS = 1000;   // longest allowed single message

const SYSTEM_PROMPT = `You are a patient, warm, and encouraging English tutor for Japanese-speaking adult learners. Follow these rules in every response:
1. ALWAYS respond in simple English (CEFR A2–B1 level). Use short sentences. Avoid idioms, slang, or complex grammar unless the student uses them first.
2. If the student makes a grammar mistake, gently point it out. Format: acknowledge what they said, show the correction with a brief explanation, then continue the conversation naturally. Example: "Great question! Just a small note — we say 'I have been' not 'I have be' (past participle form). So: 'I have been to Tokyo.' Now tell me more about your trip!"
3. Keep responses under 60 words. Students are learning — long responses are overwhelming.
4. Ask ONE follow-up question at the end of each response to keep the conversation flowing. Make it related to what the student just said.
5. If the student seems stuck or unsure, offer a helpful phrase they can use. Example: "Not sure what to say? Try: 'I would like to practice talking about [topic].'"
6. Use emoji sparingly (1 per message maximum) for encouragement — 😊 👍 ✨
7. Write in English. There are only two exceptions: (a) the student explicitly asks for a translation of a specific word, or (b) rule 10 below. Never write full sentences in Japanese.
8. If the student writes in Japanese, gently encourage them to try in English: "I can see you wrote in Japanese! Can you try saying that in English? I'll help if you get stuck."
9. Celebrate small wins. When the student uses a new vocabulary word correctly for the first time in this conversation, celebrate it explicitly and name the word: "Great use of that word! 'Reservation' is perfect here." Also acknowledge complex sentences: "Great use of 'although'! That's an advanced word — well done." Celebrate each word only once.
10. Occasionally, when you use a word that may be difficult for an A2–B1 learner, add the Japanese translation in parentheses right after it, for example: "a reservation (予約)". Do this for at most one word per message, and not in every message.
11. After the student has sent 4 or more messages about the same topic, suggest a new, related topic to keep things fresh, for example: "You're doing great with food words! Want to try talking about travel next?" Make the suggestion your one follow-up question for that message. Don't suggest a new topic again until the student has sent 4 more messages.
12. If the student tells you their name, use it naturally in your replies (not in every sentence). If they haven't told you, don't guess a name.`;

const REFUSAL_REPLY =
  "Sorry, I can't help with that. Let's talk about something else! What do you like to do on weekends?";
const EMPTY_REPLY = "Sorry, I didn't catch that. Can you say it again?";

// Created on the first request (not when the file loads), so a missing or
// broken API key gives a clear error message instead of crashing the function.
// Short timeout: the chat page gives up after 20 seconds anyway.
let client = null;
function getClient() {
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY.trim(), timeout: 15000, maxRetries: 1 });
  }
  return client;
}

// Only accept plain { role, content } text messages from the browser,
// so the front-end can't change the system prompt or any other setting.
function buildMessages(history, message) {
  if (typeof message !== "string" || !message.trim()) return null;

  const incoming = (Array.isArray(history) ? history : [])
    .concat([{ role: "user", content: message }]);

  const messages = [];
  for (const m of incoming) {
    if (!m || (m.role !== "user" && m.role !== "assistant") || typeof m.content !== "string") continue;
    const content = m.content.trim().slice(0, MAX_CHARS);
    if (!content) continue;
    const prev = messages[messages.length - 1];
    if (prev && prev.role === m.role) prev.content += "\n" + content; // keep user/assistant alternating
    else messages.push({ role: m.role, content });
  }

  const recent = messages.slice(-MAX_HISTORY);
  while (recent.length && recent[0].role !== "user") recent.shift(); // must start with the student
  return recent.length ? recent : null;
}

function replyText(response) {
  return response.content
    .filter(block => block.type === "text")
    .map(block => block.text)
    .join("")
    .trim();
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Use POST." });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: "The server is missing its API key." });
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = null; }
  }
  const messages = buildMessages(body?.history, body?.message);
  if (!messages) {
    return res.status(400).json({ error: "Please send a message." });
  }

  try {
    let response = await getClient().messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      // Short chat replies: no thinking, so all 200 tokens go to the answer
      thinking: { type: "between_tools" },
      output_config: { effort: "low" },
      messages
    });

    if (response.stop_reason === "refusal") {
      response = await getClient().messages.create({
        model: FALLBACK_MODEL,
        max_tokens: MAX_TOKENS,
        system: SYSTEM_PROMPT,
        thinking: { type: "disabled" },
        output_config: { effort: "low" },
        messages
      });
    }
    if (response.stop_reason === "refusal") {
      return res.status(200).json({ reply: REFUSAL_REPLY });
    }

    return res.status(200).json({ reply: replyText(response) || EMPTY_REPLY });
  } catch (error) {
    console.error("Anthropic API error:", error);
    if (error instanceof Anthropic.RateLimitError) {
      return res.status(429).json({ error: "Sensei is very busy right now. Please try again in a moment." });
    }
    if (error instanceof Anthropic.AuthenticationError) {
      return res.status(500).json({ error: "The server's API key is not valid." });
    }
    if (error instanceof Anthropic.APIConnectionError) {
      return res.status(504).json({ error: "Sensei took too long to answer. Please try again." });
    }
    if (error instanceof Anthropic.APIError) {
      return res.status(502).json({ error: "Sensei had a problem answering. Please try again." });
    }
    return res.status(500).json({ error: "Something went wrong on the server." });
  }
}
