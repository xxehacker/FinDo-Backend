import * as cheerio from "cheerio";
import { fetchWithScraperApi } from "../../utils/scraperApi.js";

/**
 * Scrapes product data from Amazon India.
 * Strategy (in order of reliability):
 *  1. JSON-LD structured data (most stable)
 *  2. Open Graph / meta tags
 *  3. Amazon-specific data attributes & stable IDs
 *  4. CSS class selectors (fragile fallback)
 *
 * @param {string} url - Amazon product page URL
 * @returns {Promise<object>} - Normalized product data
 */
const scrapeAmazon = async (url) => {
  const html = await fetchWithScraperApi(url);
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
  let isAvailable = true;

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
      "";
    title = title.replace(/\s*[:\-|]?\s*(amazon\.in|amazon\.com).*$/i, "").trim();
  }

  if (!image) {
    image =
      $('meta[property="og:image"]').attr("content") ||
      $('meta[name="twitter:image"]').attr("content") ||
      "";
  }

  // ── 3. Amazon stable IDs & data attributes ────────────────────────────────
  if (!title) {
    title = $("#productTitle").first().text().trim();
  }

  if (!currentPrice) {
    const raw =
      // Corebox deal price
      $(".a-price.reinventPricePriceToPayMargin .a-offscreen").first().text().trim() ||
      $(".a-price.apexPriceToPay .a-offscreen").first().text().trim() ||
      // Generic price offscreen (most reliable Amazon pattern)
      $(".a-price .a-offscreen").first().text().trim() ||
      // Whole price (may include comma-separated thousands)
      $("span.a-price-whole").first().text().trim() ||
      // data attribute fallback
      $("[data-asin-price]").first().attr("data-asin-price") ||
      "";
    currentPrice = parsePrice(raw);
  }

  if (!originalPrice) {
    const raw =
      $("span.a-price.a-text-price .a-offscreen").first().text().trim() ||
      $('span[data-a-strike="true"]').first().text().trim() ||
      $(".basisPrice .a-offscreen").first().text().trim() ||
      "";
    originalPrice = parsePrice(raw) || currentPrice;
  }

  if (!image) {
    image =
      $("#landingImage").attr("src") ||
      $("#imgBlkFront").attr("src") ||
      $('img[data-a-image-name="landingImage"]').attr("src") ||
      // data attribute on the image block
      $("#main-image-container img").first().attr("src") ||
      "";
  }

  if (!jsonLd) {
    const availText = $("#availability span").first().text().trim().toLowerCase();
    isAvailable =
      !availText.includes("unavailable") &&
      !availText.includes("out of stock") &&
      !availText.includes("currently unavailable");
  }

  return {
    site: "amazon",
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
  const cleaned = raw.replace(/[₹$,\s]/g, "").trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
};

export { scrapeAmazon };
