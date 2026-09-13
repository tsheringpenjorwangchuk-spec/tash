const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";

async function post(path, body) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Request failed.");
  return data;
}

export const aiApi = {
  chat: (message, history) => post("/api/ai/chat", { message, history }),
  analyseItem: (imageDataUrl, item, reportType = "lost") =>
    post("/api/ai/analyse-item", { imageDataUrl, item, reportType }),
  generateVerificationQuestions: (item, analysis = null) =>
    post("/api/ai/generate-verification-questions", { item, analysis }),
  generateOwnerQuestions: (item, analysis = null) =>
    post("/api/ai/generate-owner-questions", { item, analysis }),
  matchItems: (lostItem, foundItems, searchQuery = "") =>
    post("/api/ai/match-items", { lostItem, foundItems, searchQuery }),
  explainVerifiedMatch: (lostItem, foundItem) =>
    post("/api/ai/explain-verified-match", { lostItem, foundItem }),
  generateClaimVerificationQuestions: (foundItem, searchItem) =>
    post("/api/ai/generate-claim-verification", { foundItem, searchItem }),
  verifyClaimAnswers: (foundItem, searchItem, questions, answers, privateOwnerBaseline = []) =>
    post("/api/ai/verify-claim-answers", { foundItem, searchItem, questions, answers, privateOwnerBaseline }),
};

export function compressImageDataUrl(dataUrl, options = {}) {
  const { maxDimension = 1100, quality = 0.68 } = options;

  return new Promise((resolve, reject) => {
    if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:image/")) {
      reject(new Error("The selected file is not a valid image."));
      return;
    }

    const image = new Image();
    image.onload = () => {
      const largestSide = Math.max(image.width, image.height);
      const scale = largestSide > maxDimension ? maxDimension / largestSide : 1;
      const width = Math.max(1, Math.round(image.width * scale));
      const height = Math.max(1, Math.round(image.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) {
        reject(new Error("Could not prepare the image for storage."));
        return;
      }
      context.drawImage(image, 0, 0, width, height);
      // JPEG is deliberately used for compact prototype storage. PostgreSQL/object
      // storage should hold the original file in production.
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    image.onerror = () => reject(new Error("Could not process the selected image."));
    image.src = dataUrl;
  });
}

export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error("No image was selected."));
      return;
    }

    const reader = new FileReader();

    reader.onload = async () => {
      const result = reader.result;

      if (typeof result !== "string" || !result.startsWith("data:image/")) {
        reject(new Error("The selected file is not a valid image."));
        return;
      }

      try {
        resolve(await compressImageDataUrl(result));
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error("Could not read the selected image."));
    reader.onabort = () => reject(new Error("Image reading was cancelled."));
    reader.readAsDataURL(file);
  });
}
