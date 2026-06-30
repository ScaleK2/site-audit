function stripWww(hostname) {
  return String(hostname || "").replace(/^www\./i, "");
}

function cleanScopePath(pathname) {
  let p = String(pathname || "/");
  if (!p.startsWith("/")) p = `/${p}`;
  p = p.replace(/\/+$/g, "");
  if (!p || p === "/") return "";
  return p;
}

const COMPOUND_PUBLIC_SUFFIXES = new Set([
  "ac.uk",
  "co.nz",
  "co.uk",
  "com.au",
  "edu.au",
  "gov.au",
  "net.au",
  "org.au",
]);

function siteHostFromHostname(hostname) {
  const host = stripWww(hostname).toLowerCase();
  const parts = host.split(".").filter(Boolean);
  if (parts.length <= 2) return host;

  const suffix = parts.slice(-2).join(".");
  if (COMPOUND_PUBLIC_SUFFIXES.has(suffix) && parts.length >= 3) {
    return parts.slice(-3).join(".");
  }

  return parts.slice(-2).join(".");
}

function auditKeyFromParts(hostname, scopePath = "") {
  const host = stripWww(hostname);
  const scope = cleanScopePath(scopePath);
  if (!scope) return host;

  const suffix = scope
    .replace(/^\/+/g, "")
    .split("/")
    .filter(Boolean)
    .map((part) =>
      part.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, ""),
    )
    .filter(Boolean)
    .join("__");

  return suffix ? `${host}__${suffix}` : host;
}

function parseAuditInput(input, opts = {}) {
  if (!input) return null;

  try {
    const raw = /^https?:\/\//i.test(input) ? input : `https://${input}`;
    const u = new URL(raw);

    const cliScope = opts.scopePath !== undefined ? opts.scopePath : null;
    const inferredScope = opts.global ? "" : cleanScopePath(u.pathname);
    const scopePath = cleanScopePath(
      cliScope !== null ? cliScope : inferredScope,
    );
    const scopeMode = scopePath ? opts.scopeMode || "soft" : "global";

    return {
      input,
      origin: u.origin,
      host: stripWww(u.hostname),
      hostname: u.hostname,
      siteHost: siteHostFromHostname(u.hostname),
      allowSubdomains: Boolean(opts.allowSubdomains),
      scopePath,
      scopeMode,
      auditKey: auditKeyFromParts(u.hostname, scopePath),
      homeUrl: new URL(scopePath || "/", u.origin)
        .toString()
        .replace(/\/$/, scopePath ? "" : "/"),
    };
  } catch {
    return null;
  }
}

module.exports = {
  auditKeyFromParts,
  cleanScopePath,
  parseAuditInput,
  siteHostFromHostname,
  stripWww,
};
