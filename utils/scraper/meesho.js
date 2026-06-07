import * as cheerio from "cheerio";
import { fetchWithScraperProxy } from "../../utils/scraperApi.js";

/**
 * Scrapes product data from Meesho.
 * Strategy (in order of reliability):
 *  1. JSON-LD structured data (most stable)
 *  2. Open Graph / meta tags
 *  3. CSS selectors (fragile fallback)
 *
 * @param {string} url - Meesho product page URL
 * @returns {Promise<object>} - Normalized product data
 */
const scrapesMeesho = async (url) => {
  const html = await fetchWithScraperProxy(url);
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
    } catch {
      // ignore
    }
  });

  let title = "";
  let currentPrice = 0;
  let originalPrice = 0;
  let image = "";
  const isAvailable = true; // Meesho rarely shows OOS

  if (jsonLd) {
    title = jsonLd.name || "";
    image =
      (Array.isArray(jsonLd.image) ? jsonLd.image[0] : jsonLd.image) || "";

    const offer = Array.isArray(jsonLd.offers)
      ? jsonLd.offers[0]
      : jsonLd.offers;
    if (offer) {
      currentPrice = parseFloat(offer.price) || 0;
      originalPrice = parseFloat(offer.highPrice || offer.price) || currentPrice;
    }
  }

  // ── 2. Open Graph / meta fallbacks ───────────────────────────────────────
  if (!title) {
    title =
      $('meta[property="og:title"]').attr("content") ||
      $('meta[name="title"]').attr("content") ||
      "";
    // Meesho appends "- Buy ... | Meesho" - strip it
    title = title.replace(/\s*[-|].*?(meesho|buy).*$/i, "").trim();
  }

  if (!image) {
    image =
      $('meta[property="og:image"]').attr("content") ||
      $('meta[name="twitter:image"]').attr("content") ||
      "";
  }

  if (!currentPrice) {
    // og:price:amount is set on some Meesho pages
    const metaPrice = $('meta[property="product:price:amount"]').attr("content");
    if (metaPrice) currentPrice = parseFloat(metaPrice) || 0;
  }

  // ── 3. CSS selector fallbacks (last resort) ───────────────────────────────
  if (!title) {
    title =
      $("p.sc-eDvSVe.eJCiLb").first().text().trim() ||
      $('p[class*="NewProductDescription__"]').first().text().trim() ||
      $("h1").first().text().trim() ||
      "";
  }

  if (!currentPrice) {
    const raw =
      $("h4.sc-eDvSVe").first().text().trim() ||
      $('h4[class*="pdp-price"]').first().text().trim() ||
      $("h4").first().text().trim() ||
      $('[class*="price"]').first().text().trim() ||
      "";
    currentPrice = parsePrice(raw);
  }

  if (!originalPrice) {
    const raw =
      $("p.sc-eDvSVe.jCHevM").first().text().trim() ||
      $('p[class*="strike"]').first().text().trim() ||
      "";
    originalPrice = parsePrice(raw) || currentPrice;
  }

  if (!image) {
    image =
      $('img[class*="ProductImage"]').first().attr("src") ||
      $(".sc-fzoLsD img").first().attr("src") ||
      $("img[srcset]").first().attr("src") ||
      "";
  }

  return {
    site: "meesho",
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

export { scrapesMeesho };
