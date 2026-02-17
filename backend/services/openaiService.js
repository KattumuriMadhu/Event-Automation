import OpenAI from "openai";

// Load keys from environment variable (comma-separated)
const openAiKeys = process.env.OPENAI_API_KEYS
  ? process.env.OPENAI_API_KEYS.split(',').map(k => k.trim()).filter(k => k)
  : [];

function getRotatedKey() {
  if (openAiKeys.length > 0) {
    const randomIndex = Math.floor(Math.random() * openAiKeys.length);
    console.log(`Using Key Index: ${randomIndex}`);
    return openAiKeys[randomIndex];
  }
  return process.env.OPENAI_API_KEY;
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function generateSocialContent(event) {
  /* ================= GENERATE CAPTION (TEXT + VISION) ================= */
  const userContent = [
    {
      type: "text",
      text: `
Event Title: ${event.title}
Department: ${event.department}
Type: ${event.type}
Audience: ${event.audience}
Date: ${event.date}
${event.resourcePerson ? `Resource Person: ${event.resourcePerson}` : ""}
Tone: ${event.tone}

${event.customPrompt ? `CUSTOM INSTRUCTIONS: ${event.customPrompt}` : "Write an engaging Instagram caption for this college event."}

- Analyze the image (if attached) and the title/details.
- Write 3-4 compelling and slightly more descriptive sentences to fully capture the essence of the event.
- Generate 6-8 relevant hashtags at the end.
- Output ONLY the caption and hashtags.
`,
    },
  ];

  if (event.imageBase64) {
    userContent.push({
      type: "image_url",
      image_url: {
        url: event.imageBase64,
      },
    });
  }

  let rawResponse;
  let success = false;

  // Retry Logic: Try all available keys
  let keysToTry = [];
  if (openAiKeys && openAiKeys.length > 0) {
    // Shuffle the keys to distribute usage
    keysToTry = [...openAiKeys].sort(() => Math.random() - 0.5);
  } else {
    keysToTry = [process.env.OPENAI_API_KEY];
  }

  // Filter out any undefined keys
  keysToTry = keysToTry.filter(k => k);

  const ATTEMPTS = keysToTry.length;

  for (let i = 0; i < ATTEMPTS; i++) {
    try {
      const apiKey = keysToTry[i];
      // Find original index for debugging logging
      const originalIndex = openAiKeys.indexOf(apiKey);
      console.log(`Using Key Index: ${originalIndex !== -1 ? originalIndex : 'ENV'}`);

      const openai = new OpenAI({ apiKey });
      console.log(`[Attempt ${i + 1}/${ATTEMPTS}] Generating with key...`);

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.8,
        messages: [
          {
            role: "system",
            content:
              "You are a creative social media manager for a college. Create exciting, relevant captions. Do not sound robotic.",
          },
          {
            role: "user",
            content: userContent,
          },
        ],
      });

      rawResponse = response.choices[0].message.content.trim();
      success = true;
      break; // Success!

    } catch (error) {
      console.error(`Attempt ${i + 1} failed:`, error.message);

      // Add delay before next attempt to help with rate limits
      if (i < ATTEMPTS - 1) {
        console.log("Waiting 2 seconds before next attempt...");
        await delay(2000);
      }
    }
  }

  if (!success) {
    console.log("All attempts failed. Using Fallback Template.");
    // Fallback template if ALL attempts fail
    rawResponse = `🚀 Exciting News! 

Join us for **${event.title}** organized by the **${event.department}** department!

📅 Date: ${new Date(event.date).toDateString()}
${event.resourcePerson ? `📍 Resource Person: ${event.resourcePerson}` : ""}

Don't miss this opportunity to learn and grow! 🎓

#NSRIT #CollegeEvent #${event.department} #Learning`;
  }

  // Use the response (either from AI or fallback)
  const raw = rawResponse;

  return raw;
}

export async function chatWithAssistant(message) {
  const apiKey = getRotatedKey();
  if (!apiKey) {
    console.error("❌ OPENAI_API_KEY is missing");
    throw new Error("Server configuration error: API Key missing");
  }

  const openai = new OpenAI({ apiKey });

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.7,
    messages: [
      {
        role: "system",
        content: `You are a helpful assistant for the "Event Automation System" at NSRIT.
        You can answer any topic the user asks about.
        HOWEVER, if the user asks about the system, you are an expert in:
        - Managing events (creating, editing, deleting)
        - Approval workflows (HOD approval, rejection)
        - Social media automation (Instagram posting, scheduling)
        - User management (Admin, Provider roles)`,
      },
      { role: "user", content: message },
    ],
  });

  return response.choices[0].message.content.trim();
}

export async function suggestPostingTime(event) {
  const apiKey = getRotatedKey();
  if (!apiKey) throw new Error("API Key missing");

  const openai = new OpenAI({ apiKey });

  const prompt = `
    Analyze this college event:
    Title: ${event.title}
    Audience: ${event.audience}
    Type: ${event.type}
    Date: ${event.date}

    Suggest the BEST date and time to post this on social media (Facebook/Instagram) for maximum engagement.
    - Consider students are busy during class hours (9am-4pm).
    - Evenings (6pm-9pm) or weekends are usually better.
    - If the event is soon, suggest a time ASAP.
    
    Output ONLY a valid JSON object in this format:
    {
      "datetime": "ISO_8601_STRING",
      "reason": "Short explanation (under 15 words)"
    }
  `;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.7,
    messages: [
      { role: "system", content: "You are a social media expert algorithm." },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
  });

  return JSON.parse(response.choices[0].message.content);
}
