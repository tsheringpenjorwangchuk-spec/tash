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
  matchItems: (lostItem, foundItems) =>
    post("/api/ai/match-items", { lostItem, foundItems }),
  registerUser: (user) => post("/api/auth/register", user),
  createLostItem: (item) => post("/api/lost-items", item),
};

export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error("No image was selected."));
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result;

      if (
        typeof result !== "string" ||
        !result.startsWith("data:image/")
      ) {
        reject(
          new Error("The selected file is not a valid image.")
        );
        return;
      }

      resolve(result);
    };

    reader.onerror = () => {
      reject(new Error("Could not read the selected image."));
    };

    reader.onabort = () => {
      reject(new Error("Image reading was cancelled."));
    };

    reader.readAsDataURL(file);
  });
}
