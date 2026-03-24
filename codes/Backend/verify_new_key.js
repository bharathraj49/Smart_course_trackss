const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

async function testNewKey() {
  console.log("Testing New API Key...");
  const apiKey = process.env.GEMINI_API_KEY;
  console.log(
    `Key loaded: ${apiKey ? "Yes (" + apiKey.substring(0, 8) + "...)" : "No"}`,
  );

  // Test Flash
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    console.log("Testing gemini-1.5-flash...");
    const result = await model.generateContent("Are you working?");
    console.log("✅ Success (flash):", result.response.text());
  } catch (error) {
    console.error("❌ Failed (flash):", error.message);
  }

  // Test Pro
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    console.log("Testing gemini-pro...");
    const result = await model.generateContent("Are you working?");
    console.log("✅ Success (pro):", result.response.text());
  } catch (error) {
    console.error("❌ Failed (pro):", error.message);
  }
}

testNewKey();
