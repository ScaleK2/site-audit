const NOISE_PROTOCOLS = new Set(["mailto:", "tel:", "javascript:", "data:"]);
const STATIC_EXTENSIONS =
  /\.(?:avif|bmp|css|csv|doc|docx|gif|ico|jpeg|jpg|js|json|mp3|mp4|pdf|png|svg|txt|webm|webp|xls|xlsx|xml|zip)$/i;

function normaliseUrl(raw, baseUrl) {
  if (!raw) return null;

  try {
    const u = new URL(raw, baseUrl);
    if (NOISE_PROTOCOLS.has(u.protocol)) return null;
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;

    u.hash = "";

    const paramsToDelete = [];
    for (const key of u.searchParams.keys()) {
      if (/^(utm_|fbclid$|gclid$|gbraid$|wbraid$|mc_)/i.test(key))
        paramsToDelete.push(key);
    }
    for (const key of paramsToDelete) u.searchParams.delete(key);

    if (u.pathname.length > 1 && u.pathname.endsWith("/")) {
      u.pathname = u.pathname.replace(/\/+$/g, "");
    }

    return u.toString();
  } catch {
    return null;
  }
}

function isLikelyPageUrl(rawUrl) {
  try {
    const u = new URL(rawUrl);
    return !STATIC_EXTENSIONS.test(u.pathname);
  } catch {
    return false;
  }
}

function stableUrlSort(a, b) {
  return (
    a.url.localeCompare(b.url) ||
    String(a.text || "").localeCompare(String(b.text || ""))
  );
}

module.exports = {
  isLikelyPageUrl,
  normaliseUrl,
  stableUrlSort,
};
