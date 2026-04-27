function parseMaybeJson(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!trimmed.startsWith("[") && !trimmed.startsWith("{")) return null;

  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}

export function getImageUrl(source) {
  if (!source) return "";

  if (typeof source === "string") {
    const trimmed = source.trim();
    if (!trimmed || trimmed === "[object Object]") return "";

    const parsed = parseMaybeJson(trimmed);
    if (parsed !== null) {
      return getImageUrl(parsed);
    }

    return trimmed.replace(/^http:\/\//, "https://");
  }

  if (Array.isArray(source)) {
    for (const item of source) {
      const url = getImageUrl(item);
      if (url) return url;
    }
    return "";
  }

  if (typeof source === "object") {
    const preferredKeys = [
      "url",
      "src",
      "image",
      "thumbnail",
      "thumbnail_url",
      "cover",
      "path",
      "uri",
      "link",
      "secure_url",
      "originalUrl",
      "fileUrl",
    ];

    for (const key of preferredKeys) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        const url = getImageUrl(source[key]);
        if (url) return url;
      }
    }
  }

  return "";
}
