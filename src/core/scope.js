const { cleanScopePath, stripWww } = require("./audit-key");

function isSameRegistrableHostCandidate(url, audit) {
  return (
    stripWww(url.hostname).toLowerCase() ===
    String(audit.host || "").toLowerCase()
  );
}

function isWithinScope(rawUrl, audit) {
  try {
    const u = new URL(rawUrl);
    if (!isSameRegistrableHostCandidate(u, audit)) return false;

    const scope = cleanScopePath(audit.scopePath);
    if (!scope || audit.scopeMode === "global") return true;

    const p = u.pathname.replace(/\/+$/g, "") || "/";
    if (audit.scopeMode === "strict")
      return p === scope || p.startsWith(`${scope}/`);

    return true;
  } catch {
    return false;
  }
}

module.exports = {
  isWithinScope,
};
