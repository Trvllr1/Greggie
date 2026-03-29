const http = require("http");
const fs = require("fs");

const log = (msg) => {
  const line = `${new Date().toISOString()} ${msg}\n`;
  process.stdout.write(line);
  fs.appendFileSync("seed_ig.log", line);
};

// Current public Instagram posts/reels from major accounts
const URLS = [
  "https://www.instagram.com/reel/DG_bpIhSELq/",
  "https://www.instagram.com/reel/DHCtqgySXhN/",
  "https://www.instagram.com/reel/DG7lN1ayD3V/",
  "https://www.instagram.com/reel/DHFcOgJyO6b/",
  "https://www.instagram.com/reel/DG4v3BjSOOd/",
  "https://www.instagram.com/p/DHHr2TdSbgK/",
  "https://www.instagram.com/reel/DG1VKZ8yekV/",
  "https://www.instagram.com/reel/DHKuE8uyYpd/",
  "https://www.instagram.com/p/DGyQf4vSuFz/",
  "https://www.instagram.com/reel/DHNq7PayG9W/",
];

async function ingest(url) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ url });
    const req = http.request(
      {
        hostname: "localhost",
        port: 8080,
        path: "/api/v1/ingest",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(data),
        },
        timeout: 15000,
      },
      (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          if (res.statusCode === 201) {
            const item = JSON.parse(body);
            log(`OK ${item.content.caption || url}`);
            resolve(item);
          } else {
            log(`FAIL ${url} -> ${res.statusCode}: ${body}`);
            reject(new Error(body));
          }
        });
      }
    );
    req.on("error", (err) => {
      log(`ERR ${url} -> ${err.message}`);
      reject(err);
    });
    req.write(data);
    req.end();
  });
}

(async () => {
  fs.writeFileSync("seed_ig.log", "");
  log(`Seeding ${URLS.length} Instagram posts/reels...`);
  let ok = 0;
  for (const url of URLS) {
    try {
      await ingest(url);
      ok++;
    } catch {
      // continue with next
    }
  }
  log(`Done: ${ok}/${URLS.length} ingested.`);
})();
