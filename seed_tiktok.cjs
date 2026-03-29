const http = require("http");
const fs = require("fs");

const log = (msg) => {
  const line = `${new Date().toISOString()} ${msg}\n`;
  process.stdout.write(line);
  fs.appendFileSync("seed.log", line);
};

const URLS = [
  "https://www.tiktok.com/@khloekardashian/video/7395498430025498922",
  "https://www.tiktok.com/@bellapoarch/video/6862153058223197445",
  "https://www.tiktok.com/@zachking/video/6768504823220619526",
  "https://www.tiktok.com/@charlidamelio/video/6985428668894684422",
  "https://www.tiktok.com/@addisonre/video/6864675953530689798",
  "https://www.tiktok.com/@willsmith/video/7062741975590534442",
  "https://www.tiktok.com/@gordonramsayofficial/video/7211070690182895878",
  "https://www.tiktok.com/@therock/video/7044083488253741358",
  "https://www.tiktok.com/@mrbeast/video/7193614868075102506",
  "https://www.tiktok.com/@billieeilish/video/7078006690973683990",
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
  fs.writeFileSync("seed.log", "");
  log(`Seeding ${URLS.length} TikTok videos...`);
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
