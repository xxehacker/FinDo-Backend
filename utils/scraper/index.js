import { scrapeFlipkart } from "./flipkart.js";
import { scrapeAmazon } from "./amazon.js";
import { scrapesMeesho } from "./meesho.js";
import { scrapeMyntra } from "./myntra.js";

/**
 * Detects which e-commerce site the URL belongs to.
 * @param {string} url
 * @returns {"flipkart"|"amazon"|"meesho"|"myntra"|"unknown"}
 */
const detectSite = (url) => {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    if (hostname.includes("flipkart.com")) return "flipkart";
    if (hostname.includes("amazon.in") || hostname.includes("amazon.com"))
      return "amazon";
    if (hostname.includes("meesho.com")) return "meesho";
    if (hostname.includes("myntra.com")) return "myntra";
    return "unknown";
  } catch {
    return "unknown";
  }
};

/**
 * Master scrape function — detects site and delegates to correct scraper.
 * @param {string} url - Product page URL
 * @returns {Promise<object>} - Normalized product object
 */
const scrapeProduct = async (url) => {
  const site = detectSite(url);

  let result;
  switch (site) {
    case "flipkart":
      result = await scrapeFlipkart(url);
      break;
    case "amazon":
      result = await scrapeAmazon(url);
      break;
    case "meesho":
      result = await scrapesMeesho(url);
      break;
    case "myntra":
      result = await scrapeMyntra(url);
      break;
    default:
      throw new Error(
        `Unsupported site. Supported: Flipkart, Amazon India, Meesho, Myntra`
      );
  }

  // Debug log — visible in server console
  console.log(`[Scraper] ${site.toUpperCase()} →`, {
    title: result.title || "(empty)",
    currentPrice: result.currentPrice,
    image: result.image ? result.image.slice(0, 60) + "…" : "(empty)",
  });

  return result;
};

export { scrapeProduct, detectSite };
