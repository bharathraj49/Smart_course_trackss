const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

async function testConnection() {
  const apiKey = process.env.GEMINI_API_KEY;
  console.log(
    `Testing API Key: ${apiKey ? apiKey.substring(0, 10) + "..." : "Missing"}`,
  );

  if (!apiKey) {
    console.error("❌ API Key not found in .env");
    return;
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  // Specific model requested by user
  const modelName = "gemini-1.5-flash";

  try {
    console.log(`Attempting to connect to model: ${modelName}`);
    const model = genAI.getGenerativeModel({ model: modelName });

    const prompt = "Reply with 'Connection Successful' if you can read this.";
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    console.log(`✅ Success! Model responded: "${text.trim()}"`);
  } catch (error) {
    console.error(`❌ Connection Failed:`, error.message);
    if (error.response) {
      console.error("Error details:", JSON.stringify(error.response, null, 2));
    }
  }
}

testConnection();
