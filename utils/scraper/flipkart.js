import * as cheerio from "cheerio";
import { fetchWithPuppeteer } from "../../utils/scraperApi.js";

/**
 * Scrapes product data from Flipkart using a real headless browser.
 * Direct HTTP fetch and ScraperAPI both get redirected to Flipkart's
 * homepage — only a real browser gets through.
 *
 * @param {string} url - Flipkart product page URL
 * @returns {Promise<object>} - Normalized product data
 */
const scrapeFlipkart = async (url) => {
  const html = await fetchWithPuppeteer(url);
  const $ = cheerio.load(html);

  // ── 1. JSON-LD structured data ────────────────────────────────────────────
  let jsonLd = null;
  $('script[type="application/ld+json"]').each((_, el) => {
    if (jsonLd) return;
    try {
      const parsed = JSON.parse($(el).html());
      if (parsed["@type"] === "Product") jsonLd = parsed;
      else if (Array.isArray(parsed["@graph"])) {
        jsonLd = parsed["@graph"].find((n) => n["@type"] === "Product") || null;
      }
    } catch { /* ignore */ }
  });

  let title = "";
  let currentPrice = 0;
  let originalPrice = 0;
  let image = "";
  let isAvailable = true;

  if (jsonLd) {
    title = jsonLd.name || "";
    image = (Array.isArray(jsonLd.image) ? jsonLd.image[0] : jsonLd.image) || "";
    const offer = Array.isArray(jsonLd.offers) ? jsonLd.offers[0] : jsonLd.offers;
    if (offer) {
      currentPrice = parseFloat(offer.price) || 0;
      originalPrice = parseFloat(offer.highPrice || offer.price) || currentPrice;
      isAvailable = offer.availability
        ? offer.availability.toLowerCase().includes("instock")
        : true;
    }
  }

  // ── 2. Open Graph / meta fallbacks ───────────────────────────────────────
  if (!title) {
    title =
      $('meta[property="og:title"]').attr("content") ||
      $('meta[name="title"]').attr("content") ||
      $("title").text().trim() ||
      "";
    title = title.replace(/\s*[-|].*?(flipkart|buy).*$/i, "").trim();
  }
  if (!image) {
    image =
      $('meta[property="og:image"]').attr("content") ||
      $('meta[name="twitter:image"]').attr("content") ||
      "";
  }

  // ── 3. CSS selector fallbacks ─────────────────────────────────────────────
  if (!title) {
    title =
      $("h1.VU-ZEz span").first().text().trim() ||
      $("h1.yhB1nd").first().text().trim() ||
      $('span[class*="B_NuCI"]').first().text().trim() ||
      $("h1").first().text().trim() ||
      "";
  }

  if (!currentPrice) {
    const raw =
      $("div.Nx9bqj.CxhGGd").first().text().trim() ||
      $("div.Nx9bqj").first().text().trim() ||
      $('div[class*="_30jeq3"]').first().text().trim() ||
      $('[class*="price"]').first().text().trim() ||
      $('[class*="Price"]').first().text().trim() ||
      "";
    currentPrice = parsePrice(raw);
  }

  // Last resort: first leaf node starting with ₹
  if (!currentPrice) {
    $("*").each((_, el) => {
      if (currentPrice) return false;
      const text = $(el).children().length === 0 ? $(el).text().trim() : "";
      if (text.startsWith("₹") && text.length < 15) {
        currentPrice = parsePrice(text);
      }
    });
  }

  if (!originalPrice) {
    const raw =
      $("div.yRaY8j").first().text().trim() ||
      $('div[class*="_3I9_wc"]').first().text().trim() ||
      "";
    originalPrice = parsePrice(raw) || currentPrice;
  }

  if (!image) {
    image =
      $("img.DByuf4").first().attr("src") ||
      $("img._396cs4").first().attr("src") ||
      $('img[class*="_2r_T1I"]').first().attr("src") ||
      "";
  }

  if (!jsonLd) {
    isAvailable = !$("div._16FRp0").length && !$("div.PRCCY").length;
  }

  return {
    site: "flipkart",
    title: title.trim(),
    image,
    currentPrice,
    originalPrice: originalPrice || currentPrice,
    isAvailable,
    currency: "INR",
  };
};

const parsePrice = (raw) => {
  if (!raw) return 0;
  const cleaned = raw.replace(/[₹,\s]/g, "").trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
};

export { scrapeFlipkart };
