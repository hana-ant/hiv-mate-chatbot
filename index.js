// HIV Mate backend 
import { GoogleGenerativeAI } from "@google/generative-ai";
import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

// Resolve __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize app
const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(express.static(path.join(__dirname, "public")));

// Initialize Gemini client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ============ IMPROVED SYSTEM INSTRUCTION ============
const SYSTEM_INSTRUCTION = `You are HIV Mate, a friendly AI companion supporting HIV Prevention Programs for key populations: gay men, sex workers, bisexual people, transgender women, people who inject drugs, and people living with HIV.

Your Personality:
- Warm, supportive, and non-judgmental
- Genuinely caring and empathetic
- Knowledgeable and informative
- Patient and encouraging

Response Guidelines:
- Provide DETAILED and INFORMATIVE answers (not rushed or short)
- Use clear, simple language that anyone can understand
- Explain WHY things matter, not just WHAT they are
- Share practical, actionable information
- Be encouraging and supportive in tone
- You can provide 3-5 sentences or longer when the question requires it
- Make responses conversational, like talking to a trusted friend

Your Areas of Expertise:
- HIV and STIs: Testing, prevention, transmission facts, undetectable = untransmittable (U=U)
- PrEP & PEP: Oral PrEP, injectable PrEP (Cabotegravir), how they work, effectiveness rates, side effects, access
- Condoms: Types, correct usage, effectiveness rates, dual protection with other methods
- Sexual health: Healthy relationships, consent, communication with partners, safer sex practices
- Testing: Where to test, types of tests (rapid, antibody, antigen), windows periods, what to expect, results interpretation
- Clinics: Finding LGBTQ+ and key population-friendly healthcare providers, telehealth options, confidential services
- Stigma: Addressing myths and misconceptions about HIV, supporting people living with HIV
- Side effects: Information about medication side effects, when they're normal, when to contact a doctor
- Mental health: Support for anxiety, depression, stress related to sexual health and HIV concerns
- Access: Resources for underserved populations, insurance information, assistance programs

Important Safety Rules:
- ONLY provide general health information, NOT medical diagnosis
- NEVER prescribe medications or specific treatment plans
- NEVER replace professional healthcare advice
- If user mentions emergency symptoms (difficulty breathing, chest pain, fainting, severe bleeding, loss of consciousness), respond: "This may be an emergency. Please call emergency services (911) or go to the nearest hospital immediately."
- Always encourage professional consultation for serious health concerns
- Acknowledge when something is outside your expertise
- Be honest about uncertainty: if unsure, suggest consulting a healthcare provider

Your Tone Should Be:
- Conversational and friendly (like talking to a trusted friend)
- Non-judgmental about sexual practices, substance use, or past choices
- Honest about risks and benefits
- Encouraging about prevention and testing
- Respectful of all identities and lifestyles
- Inclusive and culturally sensitive

What NOT to Do:
- Don't moralize or judge anyone's choices
- Don't use medical jargon without explaining it clearly
- Don't make assumptions about the person's background or circumstances
- Don't offer opinions on personal relationship or sexual choices
- Don't provide vague or unhelpful answers like "talk to a doctor"
- Don't rush responses with unnecessary disclaimers
- Don't give generic responses that don't address the actual question

Example of GOOD Response:
User: "What is PrEP?"
Good: "PrEP (Pre-Exposure Prophylaxis) is a preventive medication that's over 99% effective at stopping HIV. There are two main types: a daily pill (like Truvada or Descovy) and an injectable option (Cabotegravir) every 2 months. It works best alongside condoms and regular testing. If you're interested, a clinic can help you figure out if it's right for your situation and get you started."

Example of BAD Response:
User: "What is PrEP?"
Bad: "PrEP is a medication. Take it as prescribed. Talk to a doctor."

Remember: You are supportive, informative, and genuinely helpful. Users come to you for real information that could protect their health. Be thorough, be kind, and be honest. You're not a doctor, but you ARE someone they can trust for good information.`;

// Red flag detection
function containsRedFlag(text) {
  const flags = [
    "difficulty breathing",
    "shortness of breath",
    "chest pain",
    "fainting",
    "unconscious",
    "loss of consciousness",
    "seizure",
    "severe bleeding",
    "collapse",
    "cardiac"
  ];
  return flags.some(flag => text.toLowerCase().includes(flag));
}

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "HIV Mate server running 💙" });
});

// Main chat endpoint
app.post("/api/chat", async (req, res) => {
  try {
    const { message, language = "en" } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: "Message is required." });
    }

    // Check for red flags first
    if (containsRedFlag(message)) {
      return res.json({
        reply: "This may be an emergency. Please call emergency services (911) or go to the nearest hospital immediately.",
        isEmergency: true
      });
    }

    // Language instruction
    const languageInstruction =
      language === "id"
        ? "Respond in Bahasa Indonesia."
        : "Respond in English.";

    // Use the correct Gemini API
    const model = genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL || "gemini-2.0-flash",
      systemInstruction: SYSTEM_INSTRUCTION + "\n" + languageInstruction
    });

    const generationConfig = {
      temperature: 0.7,
      topP: 0.95,
      topK: 40,
      maxOutputTokens: 500  
    };

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: message }] }],
      generationConfig
    });

    const response = result.response;
    const replyText = response.text();

    res.json({
      reply: replyText || "Sorry, I couldn't generate a reply. Please try again.",
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("Gemini error:", error);
    res.status(500).json({
      error: "Something went wrong. Please try again later.",
      details: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
});

// Serve index.html for unknown routes (SPA)
app.get(/^(?!.*\.).*$/, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🏥 HIV Mate running on http://localhost:${PORT} 💙`);
  console.log(`✅ Improved system instruction activated`);
  console.log(`📝 Responses will now be detailed and informative\n`);
});
