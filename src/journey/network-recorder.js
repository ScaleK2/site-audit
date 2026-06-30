function createNetworkRecorder(page) {
  let urls = [];

  function onRequest(request) {
    urls.push(request.url());
  }

  page.on("request", onRequest);

  return {
    reset() {
      urls = [];
    },
    urls() {
      return [...urls];
    },
    hosts() {
      return uniqueHosts(urls);
    },
    sample(limit = 200) {
      return [...urls].slice(0, limit);
    },
    dispose() {
      page.off("request", onRequest);
    },
  };
}

function uniqueHosts(urls) {
  const hosts = [];
  const seen = new Set();
  for (const raw of urls || []) {
    try {
      const host = new URL(raw).hostname.toLowerCase();
      if (!seen.has(host)) {
        seen.add(host);
        hosts.push(host);
      }
    } catch {}
  }
  return hosts.sort();
}

module.exports = {
  createNetworkRecorder,
  uniqueHosts,
};
