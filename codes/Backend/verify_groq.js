const Groq = require("groq-sdk");
require("dotenv").config();

async function testGroq() {
  console.log("Testing Groq API...");
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: "user", content: "Hello, are you online?" }],
      model: "llama-3.3-70b-versatile",
    });

    console.log(
      "✅ Success! Response:",
      chatCompletion.choices[0]?.message?.content,
    );
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

testGroq();
