const { cleanScopePath, siteHostFromHostname, stripWww } = require("./audit-key");

function isSameRegistrableHostCandidate(url, audit) {
  const candidateHost = stripWww(url.hostname).toLowerCase();
  const auditHost = String(audit.host || "").toLowerCase();

  if (candidateHost === auditHost) return true;
  if (!audit.allowSubdomains) return false;

  const siteHost = String(audit.siteHost || siteHostFromHostname(auditHost))
    .toLowerCase();
  return candidateHost === siteHost || candidateHost.endsWith(`.${siteHost}`);
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
  isSameRegistrableHostCandidate,
  isWithinScope,
};
