const express = require("express");
const router = express.Router();
const Groq = require("groq-sdk");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

router.post("/chat", async (req, res) => {
  if (!process.env.GROQ_API_KEY) {
    return res.status(500).json({ reply: "API Key missing." });
  }

  try {
    const { message, context, history } = req.body;

    const systemPrompt = `You are a helpful, encouraging, and knowledgeable AI study companion.

Context:
${context?.title ? `Current Topic: ${context.title}` : ""}
${context?.description ? `Description: ${context.description}` : ""}
${context?.content ? `Course Material: ${context.content}` : ""}
${
  context?.pageType === "quiz"
    ? `
CURRENT ACTIVITY: Taking a Quiz (${context.quizTitle})
Progress: Question ${context.progress?.current || "?"} of ${context.progress?.total || "?"}
Current Question Details:
${JSON.stringify(context.currentQuestion, null, 2)}
`
    : ""
}

Guidelines:
1. **Explain Simply**: Define concepts in simple, easy-to-understand terms. Avoid jargon unless necessary (then explain it).
2. **Use Context**: If the user asks for resources, look at the "Active Learning Material" in the context above and recommend specific "lessons", "videos", or "notes" by name.
3. **Be Specific**: If you see a relevant video or note in the context, mention it: "You might find the video '[Video Title]' helpful."
4. **Be Concise**: Keep answers short and direct. Use markdown for readability (bullet points, bold text).
5. **Quiz Help**: If the user is in a quiz, HELP THEM understand the concept but DO NOT just give the answer unless they are completely stuck. Guide them.`;

    const messages = [{ role: "system", content: systemPrompt }];

    if (history && Array.isArray(history)) {
      history.forEach((msg) => {
        messages.push({
          role: msg.role === "assistant" ? "assistant" : "user",
          content: msg.content || "",
        });
      });
    }

    messages.push({ role: "user", content: message });

    const completion = await groq.chat.completions.create({
      messages: messages,
      model: "llama-3.3-70b-versatile",
    });

    res.json({
      reply: completion.choices[0]?.message?.content || "No response.",
    });
  } catch (error) {
    console.error("❌ Chat Error:", error.message);
    res.status(500).json({
      reply: "I am having trouble connecting right now. Please try again.",
      error: error.message,
    });
  }
});

router.post("/assessment-help", async (req, res) => {
  if (!process.env.GROQ_API_KEY) {
    return res.json({ explanation: "AI unavailable." });
  }

  try {
    const { question, userAnswer, correctAnswer, courseContext } = req.body;

    const prompt = `Tutor Help:
Question: ${question}
Student Answer: ${userAnswer}
Correct: ${correctAnswer}
Context: ${JSON.stringify(courseContext)}

Return ONLY a JSON object with the following structure (no markdown formatting):
{ "explanation": "...", "correctConcept": "...", "recommendedNotes": [], "recommendedVideos": [] }`;

    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
      response_format: { type: "json_object" },
    });

    const text = completion.choices[0]?.message?.content || "{}";

    try {
      // Clean up potential markdown code blocks just in case
      const cleanText = text.replace(/```json|```/g, "").trim();
      res.json(JSON.parse(cleanText));
    } catch (e) {
      console.error("JSON Parse Error:", e);
      res.json({ explanation: text });
    }
  } catch (error) {
    console.error("Assessment Error:", error.message);
    res.status(500).json({ explanation: "Error." });
  }
});

module.exports = router;
