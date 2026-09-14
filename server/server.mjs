import http from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  sendMail,
  matchAlertEmail,
  claimStatusEmail,
  claimSubmittedEmail,
  adminLostReportEmail,
  adminClaimSubmittedEmail,
  emailConfigured,
  testEmail,
} from "./mailer.mjs";

import {
  databaseConfigured,
  dbHealth,
  listLostItems,
  upsertLostItem,
  listFoundItems,
  upsertFoundItem,
  listClaims,
  upsertClaim,
} from "./database/postgres.mjs";

// =========================================================
// LOAD .ENV
// =========================================================

const serverDir = dirname(fileURLToPath(import.meta.url));

const envCandidates = [
  resolve(process.cwd(), ".env"),
  resolve(serverDir, ".env"),
];

for (const envPath of envCandidates) {
  if (!existsSync(envPath)) continue;

  const lines = readFileSync(envPath, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) continue;

    const index = trimmed.indexOf("=");

    if (index === -1) continue;

    const key = trimmed.slice(0, index).trim();

    const value = trimmed
      .slice(index + 1)
      .trim()
      .replace(/^['"]|['"]$/g, "");

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

// =========================================================
// CONFIGURATION
// =========================================================

const PORT = Number(process.env.PORT || 3001);

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const OPENAI_MODEL =
  process.env.OPENAI_MODEL || "gpt-4.1-mini";

// =========================================================
// RESPONSE HELPERS
// =========================================================

function sendJson(res, status, payload) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  });

  res.end(JSON.stringify(payload));
}

// =========================================================
// REQUEST BODY
// =========================================================

async function readJson(req) {
  let body = "";

  for await (const chunk of req) {
    body += chunk;

    if (body.length > 15_000_000) {
      const error = new Error(
        "Request is too large. Use a smaller image."
      );

      error.status = 413;

      throw error;
    }
  }

  if (!body) return {};

  try {
    return JSON.parse(body);
  } catch {
    const error = new Error("Invalid JSON request.");

    error.status = 400;

    throw error;
  }
}

// =========================================================
// OPENAI HELPERS
// =========================================================

function extractOutputText(data) {
  if (
    typeof data?.output_text === "string" &&
    data.output_text.trim()
  ) {
    return data.output_text.trim();
  }

  const parts = [];

  for (const item of data?.output || []) {
    for (const content of item?.content || []) {
      if (
        content?.type === "output_text" &&
        content?.text
      ) {
        parts.push(content.text);
      }
    }
  }

  return parts.join("\n").trim();
}

function cleanJson(text) {
  return String(text || "")
    .replace(/^json\s*/i, "")
    .replace(/^\s*```json\s*/i, "")
    .replace(/^\s*```\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
}

async function callOpenAI(
  input,
  instructions,
  maxOutputTokens = 1200
) {
  if (!OPENAI_API_KEY) {
    const error = new Error(
      "OPENAI_API_KEY is missing. Add it to the .env file."
    );

    error.status = 503;

    throw error;
  }

  const response = await fetch(
    "https://api.openai.com/v1/responses",
    {
      method: "POST",

      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        model: OPENAI_MODEL,
        instructions,
        input,
        max_output_tokens: maxOutputTokens,
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    const error = new Error(
      data?.error?.message ||
        "OpenAI request failed."
    );

    error.status = response.status;

    throw error;
  }

  const outputText = extractOutputText(data);

  if (!outputText) {
    const error = new Error(
      "OpenAI returned an empty response."
    );

    error.status = 502;

    throw error;
  }

  return outputText;
}

// =========================================================
// VERIFICATION QUESTION SAFETY
// =========================================================

function sanitiseVerificationQuestions(value) {
  if (!Array.isArray(value)) return [];
  const blocked = /password|passcode|pin\b|bank|card number|cvv|authentication|one[- ]?time code|otp|full id|passport number|licen[cs]e number|biometric|fingerprint|face id/i;
  return [...new Set(value.map((q) => String(q || "").trim()).filter((q) => q.length >= 12 && q.length <= 180).filter((q) => !blocked.test(q)))].slice(0, 3);
}

// =========================================================
// LOCAL AI MATCHING FALLBACK
// =========================================================

function normalise(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function words(value) {
  return normalise(value)
    .split(" ")
    .filter((word) => word.length >= 3);
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function getField(item, names) {
  const analysis = item?.aiAnalysis || {};

  for (const name of names) {
    if (
      item?.[name] !== undefined &&
      item?.[name] !== null &&
      String(item[name]).trim()
    ) {
      return item[name];
    }

    if (
      analysis?.[name] !== undefined &&
      analysis?.[name] !== null &&
      String(analysis[name]).trim()
    ) {
      return analysis[name];
    }
  }

  return "";
}

function getArrayField(item, names) {
  const value = getField(item, names);

  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === "string") {
    return value
      .split(/[,\|]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function getAllText(item) {
  const analysis = item?.aiAnalysis || {};

  const values = [
    item?.title,
    item?.description,
    item?.category,
    item?.location,
    item?.object,
    item?.primaryColour,
    item?.brand,
    item?.material,
    item?.visibleText,
    item?.condition,
    item?.searchDescription,
    item?.manualSearchQuery,

    analysis?.title,
    analysis?.description,
    analysis?.category,
    analysis?.object,
    analysis?.primaryColour,
    analysis?.brand,
    analysis?.material,
    analysis?.visibleText,
    analysis?.condition,
    analysis?.searchDescription,

    ...(Array.isArray(item?.secondaryColours)
      ? item.secondaryColours
      : []),

    ...(Array.isArray(item?.distinctiveFeatures)
      ? item.distinctiveFeatures
      : []),

    ...(Array.isArray(analysis?.secondaryColours)
      ? analysis.secondaryColours
      : []),

    ...(Array.isArray(analysis?.distinctiveFeatures)
      ? analysis.distinctiveFeatures
      : []),
  ];

  return normalise(values.join(" "));
}

function overlapScore(a, b) {
  const first = unique(words(a));
  const second = new Set(unique(words(b)));

  if (!first.length || !second.size) {
    return 0;
  }

  return first.filter((word) => second.has(word)).length;
}

function fieldMatches(lostValue, foundValue) {
  const lost = normalise(lostValue);
  const found = normalise(foundValue);

  if (!lost || !found) return false;

  if (lost === found) return true;

  if (lost.includes(found) || found.includes(lost)) {
    return true;
  }

  return overlapScore(lost, found) > 0;
}

function dateDifferenceDays(dateA, dateB) {
  if (!dateA || !dateB) return null;

  const first = new Date(dateA);
  const second = new Date(dateB);

  if (
    Number.isNaN(first.getTime()) ||
    Number.isNaN(second.getTime())
  ) {
    return null;
  }

  return Math.abs(
    first.getTime() - second.getTime()
  ) /
    (1000 * 60 * 60 * 24);
}

function similarityScore(lostItem, foundItem) {
  let score = 0;

  const matchingFeatures = [];
  const differences = [];

  // -------------------------------------------------------
  // Category
  // -------------------------------------------------------

  const lostCategory = getField(
    lostItem,
    ["category"]
  );

  const foundCategory = getField(
    foundItem,
    ["category"]
  );

  if (
    fieldMatches(
      lostCategory,
      foundCategory
    )
  ) {
    score += 20;

    matchingFeatures.push(
      `Category: ${lostCategory}`
    );
  } else if (
    lostCategory &&
    foundCategory
  ) {
    differences.push(
      `Category differs: ${lostCategory} vs ${foundCategory}`
    );
  }

  // -------------------------------------------------------
  // Object type
  // -------------------------------------------------------

  const lostObject = getField(
    lostItem,
    ["object", "itemType", "type"]
  );

  const foundObject = getField(
    foundItem,
    ["object", "itemType", "type"]
  );

  if (
    fieldMatches(
      lostObject,
      foundObject
    )
  ) {
    score += 20;

    matchingFeatures.push(
      `Object type: ${lostObject}`
    );
  } else if (
    lostObject &&
    foundObject
  ) {
    differences.push(
      `Object type differs: ${lostObject} vs ${foundObject}`
    );
  }

  // -------------------------------------------------------
  // Colour
  // -------------------------------------------------------

  const lostColours = unique([
    getField(lostItem, [
      "primaryColour",
      "color",
      "colour",
    ]),
    ...getArrayField(lostItem, [
      "secondaryColours",
    ]),
  ]);

  const foundColours = unique([
    getField(foundItem, [
      "primaryColour",
      "color",
      "colour",
    ]),
    ...getArrayField(foundItem, [
      "secondaryColours",
    ]),
  ]);

  const colourMatch = lostColours.some(
    (lostColour) =>
      foundColours.some(
        (foundColour) =>
          fieldMatches(
            lostColour,
            foundColour
          )
      )
  );

  if (colourMatch) {
    score += 15;

    matchingFeatures.push(
      `Colour: ${lostColours.join(", ")}`
    );
  } else if (
    lostColours.length &&
    foundColours.length
  ) {
    differences.push(
      `Colour differs: ${lostColours.join(", ")} vs ${foundColours.join(", ")}`
    );
  }

  // -------------------------------------------------------
  // Brand
  // -------------------------------------------------------

  const lostBrand = getField(
    lostItem,
    ["brand"]
  );

  const foundBrand = getField(
    foundItem,
    ["brand"]
  );

  if (
    fieldMatches(
      lostBrand,
      foundBrand
    )
  ) {
    score += 15;

    matchingFeatures.push(
      `Brand: ${lostBrand}`
    );
  } else if (
    lostBrand &&
    foundBrand
  ) {
    differences.push(
      `Brand differs: ${lostBrand} vs ${foundBrand}`
    );
  }

  // -------------------------------------------------------
  // Location
  // -------------------------------------------------------

  const lostLocation = getField(
    lostItem,
    ["location", "lastSeenLocation"]
  );

  const foundLocation = getField(
    foundItem,
    ["location", "foundLocation"]
  );

  if (
    fieldMatches(
      lostLocation,
      foundLocation
    )
  ) {
    score += 15;

    matchingFeatures.push(
      `Location is similar: ${lostLocation}`
    );
  } else if (
    lostLocation &&
    foundLocation
  ) {
    differences.push(
      `Location differs: ${lostLocation} vs ${foundLocation}`
    );
  }

  // -------------------------------------------------------
  // Material
  // -------------------------------------------------------

  const lostMaterial = getField(
    lostItem,
    ["material"]
  );

  const foundMaterial = getField(
    foundItem,
    ["material"]
  );

  if (
    fieldMatches(
      lostMaterial,
      foundMaterial
    )
  ) {
    score += 5;

    matchingFeatures.push(
      `Material: ${lostMaterial}`
    );
  }

  // -------------------------------------------------------
  // Description / keywords
  // -------------------------------------------------------

  const lostText = getAllText(lostItem);
  const foundText = getAllText(foundItem);

  const lostWords = unique(words(lostText));
  const foundWordSet = new Set(
    unique(words(foundText))
  );

  const commonWords = lostWords.filter(
    (word) => foundWordSet.has(word)
  );

  if (commonWords.length >= 2) {
    score += Math.min(
      10,
      commonWords.length * 2
    );

    matchingFeatures.push(
      `Shared details: ${commonWords
        .slice(0, 6)
        .join(", ")}`
    );
  }

  // -------------------------------------------------------
  // Date proximity
  // -------------------------------------------------------

  const lostDate =
    lostItem?.dateLost ||
    lostItem?.lostDate;

  const foundDate =
    foundItem?.dateFound ||
    foundItem?.foundDate;

  const days = dateDifferenceDays(
    lostDate,
    foundDate
  );

  if (days !== null) {
    if (days <= 3) {
      score += 5;

      matchingFeatures.push(
        "Dates are close"
      );
    } else if (days <= 7) {
      score += 3;

      matchingFeatures.push(
        "Dates are reasonably close"
      );
    }
  }

  score = Math.min(
    100,
    Math.round(score)
  );

  let confidence = "low";

  if (score >= 80) {
    confidence = "high";
  } else if (score >= 60) {
    confidence = "medium";
  }

  let reason;

  if (matchingFeatures.length) {
    reason =
      "Potential match based on " +
      matchingFeatures
        .slice(0, 4)
        .join(", ") +
      ".";
  } else {
    reason =
      "Limited information was available for comparison.";
  }

  return {
    candidateId: foundItem.id,
    score,
    confidence,
    matchingFeatures,
    differences,
    reason,
  };
}

function localMatchItems(
  lostItem,
  foundItems
) {
  return foundItems
    .map((foundItem) =>
      similarityScore(
        lostItem,
        foundItem
      )
    )
    .filter(
      (match) => match.score >= 20
    )
    .sort(
      (a, b) => b.score - a.score
    );
}

// =========================================================
// CHATBOT
// =========================================================

const chatbotInstructions = `
You are the assistant for a university Lost & Found Management System.

Answer only questions about:
- reporting lost items
- reporting found items
- searching
- AI matching
- claiming items
- ownership verification
- privacy
- notifications
- using this application

Be concise and practical.

Never request:
- passwords
- banking information
- full identification numbers
- authentication codes
- biometric data

Redirect unrelated questions to lost-and-found support.
`;

// =========================================================
// SERVER
// =========================================================

const server = http.createServer(
  async (req, res) => {
    if (req.method === "OPTIONS") {
      return sendJson(res, 204, {});
    }

    try {
      // =====================================================
      // HEALTH
      // =====================================================

      if (
        req.method === "GET" &&
        req.url === "/api/health"
      ) {
        return sendJson(res, 200, {
          ok: true,
          openaiConfigured:
            Boolean(OPENAI_API_KEY),
          model: OPENAI_MODEL,
          emailConfigured,
        });
      }

      // =====================================================
      // POSTGRESQL DATA API (optional until frontend migration)
      // =====================================================

      if (req.method === "GET" && req.url === "/api/db/health") {
        if (!databaseConfigured()) {
          return sendJson(res, 200, { configured: false, connected: false });
        }
        try {
          const info = await dbHealth();
          return sendJson(res, 200, { configured: true, connected: true, ...info });
        } catch (error) {
          return sendJson(res, 503, { configured: true, connected: false, error: error.message });
        }
      }

      if (req.method === "GET" && req.url === "/api/db/lost-items") {
        if (!databaseConfigured()) return sendJson(res, 503, { error: "DATABASE_URL is not configured." });
        return sendJson(res, 200, { items: await listLostItems() });
      }

      if (req.method === "POST" && req.url === "/api/db/lost-items") {
        if (!databaseConfigured()) return sendJson(res, 503, { error: "DATABASE_URL is not configured." });
        const { item } = await readJson(req);
        if (!item || typeof item !== "object") return sendJson(res, 400, { error: "A lost item object is required." });
        return sendJson(res, 200, { item: await upsertLostItem(item) });
      }

      if (req.method === "GET" && req.url === "/api/db/found-items") {
        if (!databaseConfigured()) return sendJson(res, 503, { error: "DATABASE_URL is not configured." });
        return sendJson(res, 200, { items: await listFoundItems() });
      }

      if (req.method === "POST" && req.url === "/api/db/found-items") {
        if (!databaseConfigured()) return sendJson(res, 503, { error: "DATABASE_URL is not configured." });
        const { item } = await readJson(req);
        if (!item || typeof item !== "object") return sendJson(res, 400, { error: "A found item object is required." });
        return sendJson(res, 200, { item: await upsertFoundItem(item) });
      }

      if (req.method === "GET" && req.url === "/api/db/claims") {
        if (!databaseConfigured()) return sendJson(res, 503, { error: "DATABASE_URL is not configured." });
        return sendJson(res, 200, { claims: await listClaims() });
      }

      if (req.method === "POST" && req.url === "/api/db/claims") {
        if (!databaseConfigured()) return sendJson(res, 503, { error: "DATABASE_URL is not configured." });
        const { claim } = await readJson(req);
        if (!claim || typeof claim !== "object") return sendJson(res, 400, { error: "A claim object is required." });
        return sendJson(res, 200, { claim: await upsertClaim(claim) });
      }

      // =====================================================
      // AI CHAT
      // =====================================================

      if (
        req.method === "POST" &&
        req.url === "/api/ai/chat"
      ) {
        const {
          message,
          history = [],
        } = await readJson(req);

        if (!message?.trim()) {
          return sendJson(res, 400, {
            error: "Message is required.",
          });
        }

        const conversation = (
          Array.isArray(history)
            ? history.slice(-8)
            : []
        ).map((entry) => {
          const role =
            entry?.role === "assistant"
              ? "assistant"
              : "user";

          return {
            role,
            content: [
              {
                type:
                  role === "assistant"
                    ? "output_text"
                    : "input_text",
                text: String(
                  entry?.content || ""
                ),
              },
            ],
          };
        });

        conversation.push({
          role: "user",
          content: [
            {
              type: "input_text",
              text: String(message).trim(),
            },
          ],
        });

        const reply = await callOpenAI(
          conversation,
          chatbotInstructions,
          700
        );

        return sendJson(res, 200, {
          reply,
        });
      }

      // =====================================================
      // AI OWNERSHIP QUESTION GENERATION
      // =====================================================
      if (req.method === "POST" && req.url === "/api/ai/generate-verification-questions") {
        const { item = {}, analysis = null } = await readJson(req);
        const usefulText = [item.title, item.description, item.category, analysis?.object, analysis?.primaryColour, analysis?.brand, analysis?.material, analysis?.visibleText, ...(analysis?.distinctiveFeatures || [])].filter(Boolean).join(" ").trim();
        if (usefulText.length < 12) return sendJson(res, 400, { error: "Add a useful item title and description before generating item questions." });

        const prompt = `Create exactly 3 item-identification questions for this lost-item report. Return ONLY a JSON array of exactly 3 strings.

These questions are answered privately by the person reporting the item lost and are kept as supporting evidence. Focus on physical details a genuine owner should know well, but do not reveal the expected answer in the question.

Use three DIFFERENT evidence types where possible:
- location and shape of a scratch, dent, crack, stain, repair or wear pattern
- a case, strap, accessory, attachment, sticker, engraving, customisation or usual contents
- a distinctive physical configuration, hidden mark, placement of a logo, button, pocket, clasp, pattern or other identifying feature

Avoid generic questions whose answer is simply the category, basic colour or obvious title. Never ask for passwords, PINs, unlock codes, bank/payment details, full government ID numbers, authentication codes or biometrics. Keep each question short and natural.

Lost report: ${JSON.stringify(item)}
Photo analysis: ${JSON.stringify(analysis || {})}`;

        const text = await callOpenAI(prompt, "Generate safe, item-specific physical verification questions. Return only valid JSON.", 700);
        let questions = [];
        try { questions = sanitiseVerificationQuestions(JSON.parse(cleanJson(text))); } catch { questions = []; }
        if (questions.length !== 3) return sendJson(res, 502, { error: "AI could not generate three safe item questions. Add more distinctive item details and try again." });
        return sendJson(res, 200, { questions });
      }

      // =====================================================
      // PRIVATE OWNER-KNOWLEDGE QUESTIONS FOR LOST REPORTS
      // Stored separately from the physical item questions.
      // =====================================================
      if (req.method === "POST" && req.url === "/api/ai/generate-owner-questions") {
        const { item = {}, analysis = null } = await readJson(req);
        if (!String(item.title || "").trim() || !String(item.description || "").trim()) {
          return sendJson(res, 400, { error: "Add the item title and description first." });
        }

        const prompt = `Create exactly 3 PRIVATE OWNER-KNOWLEDGE questions for a lost-item report. Return ONLY a JSON array of exactly 3 strings.

These are a separate section from physical item-identification questions. Ask things that a genuine owner is likely to know from owning or using the item, and that are not normally obvious to a stranger simply looking at it. The reporter's answers will be stored privately for later admin/ownership review.

Prefer three DIFFERENT owner-only evidence types:
- where, when or from whom the item was bought, received or gifted (approximate answers are acceptable)
- a repair, replacement, modification or hidden/inside mark known to the owner
- a usual accessory, contents, case, attachment, nickname, personal setup or non-secret usage detail
- a specific incident/history detail involving the item that can later be compared with the owner's saved answer

Do NOT ask for passwords, PINs, unlock patterns, account names, banking information, authentication codes, full government ID numbers, full serial numbers used as security credentials, or biometrics. Do not ask a question whose answer is already stated directly in the title or basic category. Keep each question concise and non-leading.

Lost report: ${JSON.stringify(item)}
Photo analysis: ${JSON.stringify(analysis || {})}`;

        let questions = [];
        try {
          const text = await callOpenAI(prompt, "Generate three safe private owner-knowledge questions for lost-property verification. Return only valid JSON.", 700);
          questions = sanitiseVerificationQuestions(JSON.parse(cleanJson(text)));
        } catch (error) {
          console.warn("AI private owner-question generation unavailable; using safe fallback questions:", error.message);
        }

        if (questions.length !== 3) {
          questions = [
            "Where or from whom did you buy, receive or get this item, approximately?",
            "Describe any repair, modification or hidden mark on the item that you know about.",
            "What accessory, case, attachment or personal setup do you normally use with this item?",
          ];
        }

        return sendJson(res, 200, { questions });
      }

      // =====================================================
      // CLAIM-SPECIFIC OWNERSHIP QUESTIONS
      // Questions are generated from the protected found-item record,
      // but expected answers are never sent to the browser.
      // =====================================================
      if (req.method === "POST" && req.url === "/api/ai/generate-claim-verification") {
        const { foundItem = {}, searchItem = {} } = await readJson(req);
        if (!foundItem?.id) return sendJson(res, 400, { error: "A matched found item is required." });

        const prompt = `Create exactly 3 ownership-verification questions for a person claiming this found item.
Return ONLY a JSON array of exactly 3 question strings.

The questions must test details a genuine owner is likely to know WITHOUT revealing the answer.
Prioritise:
- scratches, dents, wear, damage, stains or condition
- accessories, case, strap, contents, customisation or attachments
- logos, markings, engraving, stickers or distinctive details
- where the owner remembers buying, using or last having the item ONLY when that can be meaningfully checked

Rules:
- Do not state any protected found-item detail in the question itself.
- Do not ask leading multiple-choice questions.
- Never ask for passwords, PINs, unlock codes, OTPs, banking details, full ID numbers or biometrics.
- Keep each question short, natural and easy to answer.

User search (may be incomplete): ${JSON.stringify(searchItem)}
Protected found record: ${JSON.stringify(foundItem)}`;

        let questions = [];
        try {
          const text = await callOpenAI(prompt, "Generate secure owner-only lost-property verification questions. Return only valid JSON.", 700);
          questions = sanitiseVerificationQuestions(JSON.parse(cleanJson(text)));
        } catch (error) {
          console.warn("AI claim-question generation unavailable; using safe fallback questions:", error.message);
        }

        if (questions.length !== 3) {
          questions = [
            "Describe any scratches, damage, wear or marks that should be on your item.",
            "Describe any case, accessory, attachment, sticker or customisation that belongs with your item.",
            "What distinctive logo, text, engraving, pattern or other detail would you expect to see on your item?",
          ];
        }
        return sendJson(res, 200, { questions });
      }

      // =====================================================
      // CLAIM ANSWER VERIFICATION
      // Expected evidence stays on the server; only pass/fail and
      // per-question feedback are returned.
      // =====================================================
      if (req.method === "POST" && req.url === "/api/ai/verify-claim-answers") {
        const { foundItem = {}, searchItem = {}, questions = [], answers = [], privateOwnerBaseline = [] } = await readJson(req);
        if (!foundItem?.id || !Array.isArray(questions) || !Array.isArray(answers) || questions.length !== answers.length || questions.length < 1) {
          return sendJson(res, 400, { error: "Found item, questions and answers are required." });
        }
        if (answers.some((answer) => !String(answer || "").trim())) {
          return sendJson(res, 400, { error: "Please answer every ownership question." });
        }

        try {
          const prompt = `Evaluate ownership-verification answers against a protected found-item record.
Return ONLY valid JSON in this shape:
{
  "correctAnswers": 0,
  "totalQuestions": 3,
  "requiredCorrect": 2,
  "passed": false,
  "feedback": ["brief neutral feedback for answer 1", "brief neutral feedback for answer 2", "brief neutral feedback for answer 3"]
}

Rules:
- Be strict enough to reduce false claims but allow sensible wording differences.
- A correct answer must be genuinely consistent with evidence in the protected found record.
- Do NOT reveal the expected answer, exact location/date, hidden text, serial numbers or distinctive details in feedback.
- Feedback may only say things like "consistent with the record", "not enough detail", or "not consistent with the record".
- Require at least 2 of 3 answers to be correct when there are 3 questions.
- Never use passwords, PINs, financial data, authentication codes or biometric data.

User search: ${JSON.stringify(searchItem)}
Protected found record: ${JSON.stringify(foundItem)}
Original private owner evidence from the lost report, if available: ${JSON.stringify(privateOwnerBaseline)}
Current verification questions and claimant answers: ${JSON.stringify(questions.map((q, i) => ({ question: q, answer: answers[i] })))}

Important comparison rule:
- If original private owner evidence is supplied, compare each current answer primarily against the corresponding original private owner answer from the lost report. Allow normal wording differences, abbreviations and small memory variations.
- Use the protected found record only as supporting evidence.
- Never reveal the original/reference answer in feedback.
`;
          const text = await callOpenAI(prompt, "Verify lost-property ownership answers conservatively. Return only valid JSON.", 900);
          const parsed = JSON.parse(cleanJson(text));
          const total = questions.length;
          const required = total >= 3 ? 2 : total;
          const correct = Math.max(0, Math.min(total, Number(parsed.correctAnswers) || 0));
          return sendJson(res, 200, {
            correctAnswers: correct,
            totalQuestions: total,
            requiredCorrect: required,
            passed: correct >= required,
            feedback: Array.isArray(parsed.feedback) ? parsed.feedback.slice(0, total).map((x) => String(x).slice(0, 120)) : [],
            method: "openai",
          });
        } catch (error) {
          console.warn("AI ownership verification unavailable; using conservative local fallback:", error.message);
          const foundEvidence = [
            foundItem.title, foundItem.description, foundItem.category, foundItem.location,
            foundItem.aiAnalysis?.brand, foundItem.aiAnalysis?.condition, foundItem.aiAnalysis?.visibleText,
            ...(foundItem.aiAnalysis?.distinctiveFeatures || []), ...(foundItem.aiAnalysis?.secondaryColours || [])
          ].filter(Boolean).join(" ").toLowerCase();
          const stop = new Set(["the","and","with","this","that","item","have","has","was","are","for","from","your","mine","its","there","about","very","some"]);
          function tokens(value) {
            return [...new Set((String(value || "").toLowerCase().match(/[a-z0-9]+/g) || []).filter((t) => t.length >= 3 && !stop.has(t)))];
          }
          function compareToReference(answer, reference) {
            const a = tokens(answer);
            const r = tokens(reference);
            if (!a.length || !r.length) return false;
            const shared = a.filter((t) => r.includes(t)).length;
            return shared >= Math.max(1, Math.ceil(Math.min(a.length, r.length) * 0.45));
          }
          function compareToFound(answer) {
            const useful = tokens(answer);
            if (!useful.length) return false;
            return useful.filter((t) => foundEvidence.includes(t)).length >= Math.min(2, useful.length);
          }
          const hasBaseline = Array.isArray(privateOwnerBaseline) && privateOwnerBaseline.length === answers.length;
          const checks = answers.map((answer, index) => hasBaseline
            ? compareToReference(answer, privateOwnerBaseline[index]?.answer)
            : compareToFound(answer));
          const correct = checks.filter(Boolean).length;
          const total = questions.length;
          const required = total >= 3 ? 2 : total;
          return sendJson(res, 200, {
            correctAnswers: correct,
            totalQuestions: total,
            requiredCorrect: required,
            passed: correct >= required,
            feedback: checks.map((ok) => ok ? "Answer is consistent with the protected ownership evidence." : "Answer is not sufficiently consistent with the protected ownership evidence."),
            method: "local",
          });
        }
      }

      // =====================================================
      // AI IMAGE ANALYSIS
      // =====================================================

      if (
        req.method === "POST" &&
        req.url === "/api/ai/analyse-item"
      ) {
        const {
          imageDataUrl,
          item = {},
          reportType = "lost",
        } = await readJson(req);

        if (
          !imageDataUrl?.startsWith(
            "data:image/"
          )
        ) {
          return sendJson(res, 400, {
            error:
              "A valid image is required.",
          });
        }

        const prompt = `
Analyse this ${reportType}-item photo and the user's details.

Return ONLY valid JSON with exactly this shape:

{
  "category":"",
  "object":"",
  "primaryColour":"",
  "secondaryColours":[],
  "brand":"",
  "material":"",
  "visibleText":"",
  "distinctiveFeatures":[],
  "condition":"",
  "searchDescription":"",
  "suggestedTitle":"",
  "privateVerificationQuestions":[]
}

Rules:
- Be conservative.
- Do not invent brands, text, damage, or features that are not visible.
- Use empty strings or arrays when uncertain.
- Produce a clear searchDescription suitable for database matching.
- Produce a concise suggestedTitle.
- For a lost-item report, private ownership verification uses exactly 3 moderately specific questions.
- For a found-item report, return an empty privateVerificationQuestions array.
- Never request passwords, banking data, full ID numbers, authentication codes, or biometric data.

User details:
${JSON.stringify(item)}
`;

        const text =
          await callOpenAI(
            [
              {
                role: "user",
                content: [
                  {
                    type: "input_text",
                    text: prompt,
                  },
                  {
                    type: "input_image",
                    image_url:
                      imageDataUrl,
                  },
                ],
              },
            ],
            "You analyse lost-property photographs accurately and conservatively. Return only valid JSON.",
            1200
          );

        let analysis;

        try {
          analysis = JSON.parse(
            cleanJson(text)
          );
        } catch {
          analysis = {
            category: "",
            object: "",
            primaryColour: "",
            secondaryColours: [],
            brand: "",
            material: "",
            visibleText: "",
            distinctiveFeatures: [],
            condition: "",
            searchDescription: text,
            suggestedTitle: "",
            privateVerificationQuestions:
              [],
          };
        }

        if (reportType === "lost") {
          analysis.privateVerificationQuestions = sanitiseVerificationQuestions(analysis.privateVerificationQuestions);
        } else {
          analysis.privateVerificationQuestions = [];
        }

        return sendJson(res, 200, {
          analysis,
        });
      }

      // =====================================================
      // AI MATCHING
      // =====================================================

      if (
        req.method === "POST" &&
        req.url === "/api/ai/match-items"
      ) {
        const { lostItem, foundItems = [], searchQuery = "" } = await readJson(req);

        if (
          !lostItem ||
          !Array.isArray(foundItems)
        ) {
          return sendJson(res, 400, {
            error:
              "lostItem and foundItems are required.",
          });
        }

        if (!foundItems.length) {
          return sendJson(res, 200, {
            matches: [],
            matchingMethod: "none",
          });
        }

        const candidates =
          foundItems
            .slice(0, 50)
            .map((item) => ({
              id: item.id,
              title: item.title,
              description:
                item.description,
              category:
                item.category,
              location:
                item.location,
              dateFound:
                item.dateFound,
              aiAnalysis:
                item.aiAnalysis,
            }));

        // ---------------------------------------------------
        // Try OpenAI first
        // ---------------------------------------------------

        try {
          const prompt = `
Compare one lost item against found-item candidates.

Consider, in this order:
- title/object-type alignment (this is mandatory for a strong match)
- description meaning and distinctive details
- category
- colours
- brand
- material
- visible text
- distinctive marks
- condition
- location
- date proximity

Return ONLY valid JSON as an array sorted best-first:

[
  {
    "candidateId":"",
    "score":0,
    "confidence":"low|medium|high",
    "matchingFeatures":[],
    "differences":[],
    "reason":""
  }
]

Rules:
- Score from 0 to 100.
- If the item title/object type conflicts, cap the score below 60 even when generic words overlap.
- A 60+ score requires both the title/object type AND the description to be reasonably consistent.
- Include every candidate with score 20 or higher.
- High confidence requires several specific agreements.
- Clearly state important differences.
- This is only a potential match.
- Ownership still requires private-question verification and admin approval.
- matchingFeatures and differences may describe general comparison attributes such as item type, colour, brand family, material and condition, but must not reveal exact location/date, serial numbers, unique codes, full visible text, or hidden owner-verification details.
- reason must be a short professional explanation of why the title and description appear similar.

Lost item:
${JSON.stringify({ ...lostItem, manualSearchQuery: String(searchQuery || "").trim() })}

Found candidates:
${JSON.stringify(candidates)}
`;

          const text =
            await callOpenAI(
              prompt,
              "You are a careful lost-property matching assistant. Reduce false positives, avoid unsupported certainty, and return only valid JSON.",
              1800
            );

          let matches = [];

          try {
            const parsed =
              JSON.parse(
                cleanJson(text)
              );

            matches = Array.isArray(
              parsed
            )
              ? parsed
              : [];
          } catch {
            matches = [];
          }

          const protectedMatches = matches.map((m) => ({
            candidateId: m.candidateId,
            score: Number(m.score) || 0,
            confidence: m.confidence || "low",
            safeSummary: String(m.reason || "The title and description are consistent with a protected office record.").slice(0, 260),
            similarities: Array.isArray(m.matchingFeatures) ? m.matchingFeatures.slice(0, 5).map((x) => String(x).replace(/location|date|serial|code/gi, "protected detail").slice(0, 140)) : [],
            differences: Array.isArray(m.differences) ? m.differences.slice(0, 4).map((x) => String(x).replace(/location|date|serial|code/gi, "protected detail").slice(0, 140)) : [],
          }));
          return sendJson(res, 200, { matches: protectedMatches, matchingMethod: "openai", fallback: false });
        } catch (openAIError) {
          // -------------------------------------------------
          // OpenAI failed — use local matcher
          // -------------------------------------------------

          console.warn(
            "OpenAI matching unavailable. Using local matching fallback:",
            openAIError.message
          );

          const matches = localMatchItems({ ...lostItem, manualSearchQuery: String(searchQuery || "").trim() }, foundItems).map((m) => ({
            candidateId: m.candidateId,
            score: Number(m.score) || 0,
            confidence: m.confidence || "low",
            safeSummary: "The title and description share multiple characteristics with a protected office record.",
            similarities: Array.isArray(m.matchingFeatures) ? m.matchingFeatures.slice(0, 5).map((x) => String(x).slice(0, 140)) : [],
            differences: Array.isArray(m.differences) ? m.differences.slice(0, 4).map((x) => String(x).slice(0, 140)) : [],
          }));

          return sendJson(res, 200, {
            matches,
            matchingMethod: "local",
            fallback: true,
            message:
              "OpenAI matching was unavailable, so local rule-based matching was used.",
          });
        }
      }

      // =====================================================
      // VERIFIED MATCH EXPLANATION
      // =====================================================

      if (
        req.method === "POST" &&
        req.url === "/api/ai/explain-verified-match"
      ) {
        const { lostItem, foundItem } = await readJson(req);

        if (!lostItem || !foundItem) {
          return sendJson(res, 400, {
            error: "lostItem and foundItem are required.",
          });
        }

        try {
          const prompt = `
The user has already passed ownership verification for a potential lost-and-found match.
Explain the comparison clearly and professionally.

Return ONLY valid JSON in this structure:
{
  "summary": "2-3 sentence explanation",
  "similarities": ["specific similarity", "specific similarity"],
  "differences": ["specific difference", "specific difference"]
}

Rules:
- Be factual and concise.
- Compare object type, colour, brand, material, condition, visible features and other available details.
- Do not claim final ownership; admin review is still required.
- Do not include passwords, financial information or unrelated personal data.
- If there are no meaningful differences, return an empty differences array.

Lost report:
${JSON.stringify(lostItem)}

Verified potential found item:
${JSON.stringify(foundItem)}
`;

          const text = await callOpenAI(
            prompt,
            "You explain verified lost-and-found comparisons accurately and concisely. Return only valid JSON.",
            900
          );

          let explanation;
          try {
            explanation = JSON.parse(cleanJson(text));
          } catch {
            explanation = null;
          }

          if (!explanation || typeof explanation !== "object") {
            throw new Error("Could not parse AI explanation.");
          }

          return sendJson(res, 200, {
            summary: String(explanation.summary || "This item has several characteristics in common with your lost report. Final ownership still requires administrator review."),
            similarities: Array.isArray(explanation.similarities) ? explanation.similarities.slice(0, 6) : [],
            differences: Array.isArray(explanation.differences) ? explanation.differences.slice(0, 6) : [],
            method: "openai",
          });
        } catch (openAIError) {
          console.warn(
            "OpenAI verified explanation unavailable. Using local comparison:",
            openAIError.message
          );

          const local = similarityScore(lostItem, foundItem);
          return sendJson(res, 200, {
            summary: local.reason || "This item has several characteristics in common with your lost report. Final ownership still requires administrator review.",
            similarities: Array.isArray(local.matchingFeatures) ? local.matchingFeatures.slice(0, 6) : [],
            differences: Array.isArray(local.differences) ? local.differences.slice(0, 6) : [],
            method: "local",
          });
        }
      }

      // =====================================================
      // MATCH ALERT EMAIL
      // =====================================================

      if (
        req.method === "POST" &&
        req.url === "/api/notify/match-alert"
      ) {
        const {
          to,
          lostItem,
          foundItem,
          score,
          reason,
        } = await readJson(req);

        if (!to) {
          return sendJson(res, 400, {
            error:
              "A recipient email (to) is required.",
          });
        }

        if (!lostItem || !foundItem) {
          return sendJson(res, 400, {
            error:
              "lostItem and foundItem are required.",
          });
        }

        const {
          subject,
          html,
        } =
          matchAlertEmail({
            lostItem,
            foundItem,
            score,
            reason,
          });

        const result =
          await sendMail({
            to,
            subject,
            html,
          });

        return sendJson(res, 200, {
          sent: true,
          messageId:
            result?.messageId || null,
        });
      }

      // =====================================================
      // CLAIM SUBMITTED EMAIL
      // =====================================================

      if (
        req.method === "POST" &&
        req.url === "/api/notify/claim-submitted"
      ) {
        const {
          to,
          claim = {},
          lostItem,
          foundItem,
        } = await readJson(req);

        if (!to) {
          return sendJson(res, 400, {
            error:
              "A recipient email (to) is required.",
          });
        }

        if (!claim?.id) {
          return sendJson(res, 400, {
            error: "A claim is required.",
          });
        }

        const {
          subject,
          html,
        } =
          claimSubmittedEmail({
            claim,
            lostItem,
            foundItem,
          });

        const result =
          await sendMail({
            to,
            subject,
            html,
          });

        return sendJson(res, 200, {
          sent: true,
          messageId:
            result?.messageId || null,
        });
      }

      // =====================================================
      // CLAIM STATUS EMAIL
      // =====================================================

      if (
        req.method === "POST" &&
        req.url === "/api/notify/claim-status"
      ) {
        const {
          to,
          status,
          claim = {},
          lostItem,
          foundItem,
        } = await readJson(req);

        if (!to) {
          return sendJson(res, 400, {
            error:
              "A recipient email (to) is required.",
          });
        }

        if (!status) {
          return sendJson(res, 400, {
            error:
              "A claim status is required.",
          });
        }

        const {
          subject,
          html,
        } =
          claimStatusEmail({
            status,
            claim,
            lostItem,
            foundItem,
          });

        const result =
          await sendMail({
            to,
            subject,
            html,
          });

        return sendJson(res, 200, {
          sent: true,
          messageId:
            result?.messageId || null,
        });
      }

      // =====================================================
      // ADMIN LOST REPORT EMAIL
      // =====================================================

      if (
        req.method === "POST" &&
        req.url ===
          "/api/notify/admin-lost-report"
      ) {
        const {
          to,
          lostItem,
        } = await readJson(req);

        if (!to) {
          return sendJson(res, 400, {
            error:
              "Admin recipient email is required.",
          });
        }

        if (!lostItem) {
          return sendJson(res, 400, {
            error:
              "lostItem is required.",
          });
        }

        const {
          subject,
          html,
        } =
          adminLostReportEmail(
            lostItem
          );

        const result =
          await sendMail({
            to,
            subject,
            html,
          });

        return sendJson(res, 200, {
          sent: true,
          messageId:
            result?.messageId || null,
        });
      }

      // =====================================================
      // ADMIN CLAIM SUBMITTED EMAIL
      // =====================================================

      if (
        req.method === "POST" &&
        req.url ===
          "/api/notify/admin-claim-submitted"
      ) {
        const {
          to,
          claim = {},
          lostItem,
          foundItem,
        } = await readJson(req);

        if (!to) {
          return sendJson(res, 400, {
            error:
              "Admin recipient email is required.",
          });
        }

        if (!claim?.id) {
          return sendJson(res, 400, {
            error:
              "A claim is required.",
          });
        }

        const {
          subject,
          html,
        } =
          adminClaimSubmittedEmail({
            claim,
            lostItem,
            foundItem,
          });

        const result =
          await sendMail({
            to,
            subject,
            html,
          });

        return sendJson(res, 200, {
          sent: true,
          messageId:
            result?.messageId || null,
        });
      }

      // =====================================================
      // TEST EMAIL
      // =====================================================

      if (
        req.method === "POST" &&
        req.url ===
          "/api/notify/test-email"
      ) {
        const { to } =
          await readJson(req);

        if (!to) {
          return sendJson(res, 400, {
            error:
              "Recipient email is required.",
          });
        }

        const result =
          await testEmail({ to });

        return sendJson(res, 200, {
          sent: true,
          messageId:
            result?.messageId || null,
        });
      }

      // =====================================================
      // UNKNOWN ROUTE
      // =====================================================

      return sendJson(res, 404, {
        error: "Route not found.",
      });
    } catch (error) {
      console.error(
        "Server error:",
        error
      );

      return sendJson(
        res,
        error.status || 500,
        {
          error:
            error.message ||
            "Unexpected server error.",
        }
      );
    }
  }
);

// =========================================================
// SERVER ERRORS
// =========================================================

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(
      `Port ${PORT} is already in use. Stop the existing server or change PORT in .env.`
    );

    process.exit(1);
  }

  console.error(
    "Server failed to start:",
    error
  );

  process.exit(1);
});

// =========================================================
// START SERVER
// =========================================================

server.listen(PORT, () => {
  console.log(
    `AI backend running at http://localhost:${PORT}`
  );

  console.log(
    `OpenAI configured: ${
      OPENAI_API_KEY ? "Yes" : "No"
    }`
  );

  console.log(
    `OpenAI model: ${OPENAI_MODEL}`
  );

  console.log(
    `Email notifications configured: ${
      emailConfigured
        ? "Yes"
        : "No - set EMAIL_USER / EMAIL_APP_PASSWORD in .env"
    }`
  );
});