function prioritiseLinks({ classifiedLinks, maxLinks }) {
  const selected = [];
  const seenStageKeys = new Set();
  const limit = Math.max(0, maxLinks || 0);

  for (const link of classifiedLinks || []) {
    if (selected.length >= limit) break;
    if (link.priority === "noise" || link.priority === "unknown") continue;

    const stageKey = stageDedupeKey(link);
    if (stageKey && seenStageKeys.has(stageKey)) continue;

    selected.push(link);
    if (stageKey) seenStageKeys.add(stageKey);
  }

  if (selected.length < limit) {
    for (const link of classifiedLinks || []) {
      if (selected.length >= limit) break;
      if (link.priority === "noise" || link.priority === "unknown") continue;
      if (selected.some((selectedLink) => selectedLink.url === link.url))
        continue;
      selected.push(link);
    }
  }

  return selected;
}

function stageDedupeKey(link) {
  const profiles = link.classification?.profiles || [];
  const categories = link.classification?.categories || [];
  const stages = link.classification?.stages || [];
  if (!profiles.length && !categories.length && !stages.length) return "";
  return [profiles[0] || "", categories[0] || "", stages[0] || ""].join(":");
}

module.exports = {
  prioritiseLinks,
};
