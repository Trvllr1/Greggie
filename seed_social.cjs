const http = require("http");
const fs = require("fs");

const log = (msg) => {
  const line = `${new Date().toISOString()} ${msg}\n`;
  process.stdout.write(line);
  fs.appendFileSync("seed_social.log", line);
};

// Non-video content: Reddit posts + Facebook public posts
const URLS = [
  // Reddit - popular text/image posts from large subreddits
  "https://www.reddit.com/r/technology/comments/1bu4jkl/openai_announces_gpt5/",
  "https://www.reddit.com/r/AskReddit/comments/1bq0iqz/what_is_the_most_useful_website_you_know/",
  "https://www.reddit.com/r/todayilearned/comments/1bs2mva/til_that_honey_never_expires/",
  "https://www.reddit.com/r/science/comments/1bp9dkf/new_study_finds_regular_exercise_boosts_memory/",
  "https://www.reddit.com/r/worldnews/comments/1bt8lnp/climate_scientists_warn_of_accelerating_ice_loss/",
  // Facebook - public pages/posts
  "https://www.facebook.com/NASA/posts/pfbid02ABC123xyz",
  "https://www.facebook.com/NationalGeographic/posts/pfbid02DEF456abc",
  "https://www.facebook.com/BBCNews/posts/pfbid02GHI789def",
  "https://www.facebook.com/TED/posts/pfbid02JKL012ghi",
  "https://www.facebook.com/NPR/posts/pfbid02MNO345jkl",
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
            log(`OK [${item.source.platform}] ${item.content.caption || url}`);
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
  fs.writeFileSync("seed_social.log", "");
  log(`Seeding ${URLS.length} Reddit + Facebook posts...`);
  let ok = 0;
  for (const url of URLS) {
    try {
      await ingest(url);
      ok++;
    } catch {
      // continue
    }
  }
  log(`Done: ${ok}/${URLS.length} ingested.`);
})();
