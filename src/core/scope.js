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

function evaluateScope(rawUrl, audit = {}) {
  const auditHost = String(audit.host || "").toLowerCase();
  const siteHost = String(audit.siteHost || siteHostFromHostname(auditHost))
    .toLowerCase();
  const allowSubdomains = Boolean(audit.allowSubdomains);

  try {
    const u = new URL(rawUrl);
    const host = stripWww(u.hostname).toLowerCase();
    const sameHost = host === auditHost;
    const sameSite = sameHost || host === siteHost || host.endsWith(`.${siteHost}`);

    return {
      host,
      audit_host: auditHost,
      site_host: siteHost,
      allow_subdomains: allowSubdomains,
      same_host: sameHost,
      same_site: sameSite,
      in_scope: sameHost || (allowSubdomains && sameSite),
    };
  } catch {
    return {
      host: "",
      audit_host: auditHost,
      site_host: siteHost,
      allow_subdomains: allowSubdomains,
      same_host: false,
      same_site: false,
      in_scope: false,
    };
  }
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
  evaluateScope,
  isSameRegistrableHostCandidate,
  isWithinScope,
};
