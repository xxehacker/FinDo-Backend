import * as dotenv from "dotenv";
dotenv.config();

import axios from "axios";
import * as cheerio from "cheerio";

const SCRAPER_API_KEY = process.env.SCRAPER_API_KEY;

const testUrl =
  process.argv[2] ||
  "https://www.flipkart.com/indiclub-relaxed-men-brown-trousers/p/itmdf5rqnnrnqkxs?pid=TRSGNMHTYZDCFTNA";

async function tryFetch(label, params) {
  console.log(`\n--- ${label} ---`);
  try {
    const res = await axios.get("http://api.scraperapi.com", {
      params: { api_key: SCRAPER_API_KEY, url: testUrl, ...params },
      timeout: 60000,
    });
    const $ = cheerio.load(res.data);
    const title = $("title").text().trim();
    const ogTitle = $('meta[property="og:title"]').attr("content");
    const ldCount = $('script[type="application/ld+json"]').length;
    let priceNodes = 0;
    $("*").each((_, el) => {
      const t = $(el).children().length === 0 ? $(el).text().trim() : "";
      if (t.includes("₹") && t.length < 30) priceNodes++;
    });
    console.log("  title:", title.slice(0, 80));
    console.log("  og:title:", ogTitle);
    console.log("  JSON-LD count:", ldCount);
    console.log("  ₹ nodes:", priceNodes);
    console.log("  HTML length:", res.data.length);
    if (priceNodes > 0 || ogTitle) {
      console.log("  ✓ SUCCESS — got product page!");
      return res.data;
    }
  } catch (e) {
    console.log("  ERROR:", e.response?.status, e.message);
  }
  return null;
}

(async () => {
  // Try 1: render=false (static)
  await tryFetch("render=false, country_code=in", { render: false, country_code: "in" });

  // Try 2: render=true (JS)
  await tryFetch("render=true, country_code=in", { render: true, country_code: "in" });

  // Try 3: render=true + session (simulate returning user)
  await tryFetch("render=true + session_number=42", { render: true, country_code: "in", session_number: 42 });

  // Try 4: render=false + premium
  await tryFetch("render=false + premium=true", { render: false, country_code: "in", premium: true });
})();
