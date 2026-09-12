import http from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

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

// Directly fallback to your Neon connection string if .env is not detected
const databaseUrl =
  process.env.DATABASE_URL ||
  "postgresql://neondb_owner:npg_tfSTrOl5vRG3@ep-delicate-field-aesfymxp-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require";

const databasePool = new pg.Pool({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
});

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
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS", // Added PUT here
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
// VERIFICATION QUESTIONS
// =========================================================

function simpleVerificationQuestions() {
  return [
    "What is the main colour and one secondary colour of your item?",
    "What brand, logo, or visible text is on the item? If none, type none.",
    "Name one distinctive feature of the item (for example a scratch, pattern, strap, sticker, case, or special mark).",
  ];
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
      res.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
      });
      return res.end();
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
          databaseConfigured: Boolean(databasePool),
        });
      }

      // =====================================================
      // STATE SYNC (DATABASE)
      // =====================================================

      if (
        req.method === "PUT" &&
        req.url === "/api/state"
      ) {
        const body = await readJson(req);
        sendJson(res, 200, { success: true, state: body });
        return;
      }

      // =====================================================
      // USER REGISTRATION
      // =====================================================

      if (
        req.method === "POST" &&
        req.url === "/api/auth/register"
      ) {
        if (!databasePool) {
          return sendJson(res, 503, { error: "Database not configured." });
        }

        const { name, email, password } = await readJson(req);
        const normalizedEmail = String(email || "").trim().toLowerCase();

        if (!name?.trim() || !normalizedEmail || !password) {
          return sendJson(res, 400, { error: "Name, email, and password are required." });
        }

        try {
          const result = await databasePool.query(
            `INSERT INTO users (id, full_name, email, password_hash, created_at)
             VALUES (gen_random_uuid(), $1, $2, $3, NOW())
             RETURNING id, full_name AS name, email, created_at`,
            [name.trim(), normalizedEmail, String(password)]
          );

          return sendJson(res, 201, result.rows[0]);
        } catch (error) {
          if (error.code === "23505") {
            return sendJson(res, 409, { error: "An account with this email already exists." });
          }
          console.error("Database insert error:", error);
          return sendJson(res, 500, { error: "Database error: " + error.message });
        }
      }
     // =====================================================
      // USER LOGIN
      // =====================================================

      if (
        req.method === "POST" &&
        (req.url === "/api/auth/login" || req.url === "/api/login")
      ) {
        if (!databasePool) {
          return sendJson(res, 503, { error: "Database not configured." });
        }

        const { email, password } = await readJson(req);
        const normalizedEmail = String(email || "").trim().toLowerCase();

        if (!normalizedEmail || !password) {
          return sendJson(res, 400, { error: "Email and password are required." });
        }

        const result = await databasePool.query(
          `SELECT id, full_name AS name, email, password_hash, created_at 
           FROM users WHERE LOWER(email) = $1 LIMIT 1`,
          [normalizedEmail]
        );

        if (result.rows.length === 0) {
          return sendJson(res, 401, { error: "Invalid email or password." });
        }

        const user = result.rows[0];

        if (user.password_hash !== String(password)) {
          return sendJson(res, 401, { error: "Invalid email or password." });
        }

        return sendJson(res, 200, {
          id: user.id,
          name: user.name,
          email: user.email,
          role: "user", // Default fallback since role is not in the DB table
          createdAt: user.created_at,
        });
      }

    // =====================================================
      // POST A NEW FOUND ITEM
      // =====================================================

      if (
        req.method === "POST" &&
        req.url === "/api/found-items"
      ) {
        if (!databasePool) {
          return sendJson(res, 503, { error: "Database not configured." });
        }

        const body = await readJson(req);
        const {
          title,
          description = "",
          category,
          location,
          dateFound,
          imageDataUrl = "",
          status: itemStatus,
          dropoffReference,
        } = body;

        if (!title?.trim() || !category?.trim() || !location?.trim() || !dateFound) {
          return sendJson(res, 400, { error: "Title, category, location, and dateFound are required." });
        }

        const result = await databasePool.query(
          `INSERT INTO found_items (title, description, category, location, date_found, status, dropoff_reference, image_data_url)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           RETURNING id, title, description, category, location, date_found AS "dateFound", status, dropoff_reference AS "dropoffReference", image_data_url AS "imageDataUrl", created_at AS "createdAt"`,
          [title.trim(), String(description).trim(), category.trim(), location.trim(), dateFound, itemStatus || "Awaiting Drop-off", dropoffReference || null, imageDataUrl]
        );

        return sendJson(res, 201, result.rows[0]);
      }

      // =====================================================
      // GET ALL FOUND ITEMS (DATABASE)
      // =====================================================

      if (
        req.method === "GET" &&
        req.url === "/api/found-items"
      ) {
        if (!databasePool) {
          return sendJson(res, 503, { error: "Database not configured." });
        }

        const result = await databasePool.query(
          `SELECT id, title, description, category, location, date_found AS "dateFound", 
                  status, dropoff_reference AS "dropoffReference", image_data_url AS "imageDataUrl", created_at AS "createdAt"
           FROM found_items ORDER BY created_at DESC`
        );

        return sendJson(res, 200, result.rows);
      }
// =====================================================
      // CLAIMS (DATABASE)
      // =====================================================

      if (req.method === "GET" && req.url === "/api/claims") {
        if (!databasePool) return sendJson(res, 503, { error: "Database not configured." });
        const result = await databasePool.query(
          `SELECT c.id, c.claimant_id AS "claimantId", c.claimant_email AS "claimantEmail",
                  c.lost_item_id AS "lostItemId", c.found_item_id AS "foundItemId",
                  c.score, c.reason, c.verification_passed AS "verificationPassed",
                  c.status, c.created_at AS "createdAt"
           FROM claims c ORDER BY c.created_at DESC`
        );
        return sendJson(res, 200, result.rows);
      }

      if (req.method === "POST" && req.url === "/api/claims") {
        if (!databasePool) return sendJson(res, 503, { error: "Database not configured." });
        const body = await readJson(req);
        const { claimantId, claimantEmail, lostItemId, foundItemId, score = 0, reason = "", verificationPassed = true, correctAnswers = 0, totalQuestions = 0 } = body;

        const result = await databasePool.query(
          `INSERT INTO claims (claimant_id, claimant_email, lost_item_id, found_item_id, score, reason, verification_passed, correct_answers, total_questions, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'Pending Admin Review')
           RETURNING id, status, created_at AS "createdAt"`,
          [claimantId || null, claimantEmail || null, lostItemId, foundItemId, score, reason, verificationPassed, correctAnswers, totalQuestions]
        );
        return sendJson(res, 201, result.rows[0]);
      }
      // =====================================================
      // POST A NEW LOST ITEM (DATABASE)
      // =====================================================

      if (
        req.method === "POST" &&
        req.url === "/api/lost-items"
      ) {
        if (!databasePool) {
          return sendJson(res, 503, { error: "Database not configured." });
        }

        const body = await readJson(req);
        const {
          title,
          description = "",
          category,
          location,
          dateLost,
          date_found,
          imageDataUrl = "",
          status: itemStatus,
          reporterEmail,
          userId,
        } = body;

        const resolvedDateLost = dateLost || date_found;

        if (!title?.trim() || !category?.trim() || !location?.trim() || !resolvedDateLost) {
          return sendJson(res, 400, { error: "Title, category, location, and dateLost are required." });
        }

        const result = await databasePool.query(
          `INSERT INTO lost_items (user_id, title, description, category, location, date_lost, status, image_data_url, reporter_email)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           RETURNING id, user_id, title, description, category, location, date_lost, status, image_data_url, created_at`,
          [
            userId || null,
            title.trim(),
            String(description).trim(),
            category.trim(),
            location.trim(),
            resolvedDateLost,
            itemStatus || "Lost",
            imageDataUrl,
            reporterEmail || null
          ]
        );

        const saved = result.rows[0];
        return sendJson(res, 201, {
          id: saved.id,
          userId: saved.user_id,
          title: saved.title,
          description: saved.description,
          category: saved.category,
          location: saved.location,
          dateLost: saved.date_lost,
          imageDataUrl: saved.image_data_url || "",
          status: saved.status,
          createdAt: saved.created_at,
        });
      }

      // =====================================================
      // GET ALL LOST ITEMS (DATABASE)
      // =====================================================

      if (
        req.method === "GET" &&
        req.url === "/api/lost-items"
      ) {
        if (!databasePool) {
          return sendJson(res, 503, { error: "Database not configured." });
        }

        const result = await databasePool.query(
          `SELECT * FROM lost_items ORDER BY created_at DESC`
        );
        
        return sendJson(res, 200, result.rows);
      }

      // =====================================================
      // DELETE LOST ITEM (DATABASE)
      // =====================================================

      if (
        req.method === "DELETE" &&
        req.url.startsWith("/api/lost-items/")
      ) {
        if (!databasePool) {
          return sendJson(res, 503, { error: "Database not configured." });
        }

        const id = req.url.split("/").pop();

        if (!id) {
          return sendJson(res, 400, { error: "Item ID is required." });
        }

        const result = await databasePool.query(
          `DELETE FROM lost_items WHERE id = $1 RETURNING id`,
          [id]
        );

        if (result.rowCount === 0) {
          return sendJson(res, 404, { error: "Item not found or already deleted." });
        }

        return sendJson(res, 200, { message: "Item deleted successfully." });
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
          analysis.privateVerificationQuestions =
            simpleVerificationQuestions(
              analysis
            );
        } else {
          analysis.privateVerificationQuestions =
            [];
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
        const {
          lostItem,
          foundItems = [],
        } = await readJson(req);

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

        try {
          const prompt = `
Compare one lost item against found-item candidates.

Consider:
- object type
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
- Include every candidate with score 20 or higher.
- High confidence requires several specific agreements.
- Clearly state important differences.
- This is only a potential match.
- Ownership still requires private-question verification and admin approval.

Lost item:
${JSON.stringify(lostItem)}

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

          return sendJson(res, 200, {
            matches,
            matchingMethod: "openai",
            fallback: false,
          });
        } catch (openAIError) {
          const matches =
            localMatchItems(
              lostItem,
              foundItems
            );

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
    `Database connected: YES (Neon PostgreSQL)`
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