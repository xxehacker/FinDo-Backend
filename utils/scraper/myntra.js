import * as cheerio from "cheerio";
import { fetchWithScraperProxy } from "../../utils/scraperApi.js";

/**
 * Scrapes product data from Myntra.
 * Strategy (in order of reliability):
 *  1. JSON-LD structured data (most stable)
 *  2. Open Graph / meta tags
 *  3. Myntra __myx_msid__ inline JSON data
 *  4. CSS selectors (fragile fallback)
 *
 * @param {string} url - Myntra product page URL
 * @returns {Promise<object>} - Normalized product data
 */
const scrapeMyntra = async (url) => {
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
    // Myntra og:title: "Brand Name | Myntra" — strip " | Myntra"
    title = title.replace(/\s*[|]\s*myntra.*$/i, "").trim();
  }

  if (!image) {
    image =
      $('meta[property="og:image"]').attr("content") ||
      $('meta[name="twitter:image"]').attr("content") ||
      "";
  }

  if (!currentPrice) {
    const metaPrice = $('meta[property="product:price:amount"]').attr("content");
    if (metaPrice) currentPrice = parseFloat(metaPrice) || 0;
  }

  // ── 3. Myntra inline __myx_msid__ / window.__myx script data ─────────────
  if (!title || !currentPrice) {
    $("script:not([src])").each((_, el) => {
      const text = $(el).html() || "";
      // Myntra embeds product JSON in window.__myx or similar
      const match = text.match(/"productDisplayName"\s*:\s*"([^"]+)"/);
      if (match && !title) title = match[1];

      const priceMatch = text.match(/"discountedPrice"\s*:\s*(\d+(\.\d+)?)/);
      if (priceMatch && !currentPrice) currentPrice = parseFloat(priceMatch[1]) || 0;

      const mrpMatch = text.match(/"mrp"\s*:\s*(\d+(\.\d+)?)/);
      if (mrpMatch && !originalPrice) originalPrice = parseFloat(mrpMatch[1]) || 0;

      const imgMatch = text.match(/"src"\s*:\s*"(https:\/\/assets\.myntassets[^"]+)"/);
      if (imgMatch && !image) image = imgMatch[1];
    });
  }

  // ── 4. CSS selector fallbacks (last resort) ───────────────────────────────
  if (!title) {
    const brand = $("h1.pdp-title").first().text().trim();
    const name =
      $("h1.pdp-name").first().text().trim() ||
      $("h1.pdp-title").first().text().trim();
    title =
      brand && name && brand !== name ? `${brand} ${name}` : name || brand;
  }

  if (!title) {
    title = $("h1").first().text().trim();
  }

  if (!currentPrice) {
    const raw =
      $("span.pdp-price strong").first().text().trim() ||
      $(".pdp-price").first().text().trim() ||
      $('span[class*="pdp-price"]').first().text().trim() ||
      $('[class*="price"]').first().text().trim() ||
      "";
    currentPrice = parsePrice(raw);
  }

  if (!originalPrice) {
    const raw =
      $("span.pdp-mrp s").first().text().trim() ||
      $(".pdp-mrp").first().text().trim() ||
      "";
    originalPrice = parsePrice(raw) || currentPrice;
  }

  if (!image) {
    image =
      $(".image-grid-image").first().attr("src") ||
      $('img[class*="Carousel"]').first().attr("src") ||
      $(".pdp-main-image").first().attr("src") ||
      "";
  }

  if (!jsonLd) {
    const soldOut = $(".size-buttons-size-meta.sold-out").length > 0;
    isAvailable = !soldOut;
  }

  return {
    site: "myntra",
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
  const cleaned = raw.replace(/[₹Rs.,\s]/g, "").trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
};

export { scrapeMyntra };
