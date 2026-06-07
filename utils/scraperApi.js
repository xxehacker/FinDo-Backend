import puppeteerExtra from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import axios from "axios";

puppeteerExtra.use(StealthPlugin());

const SCRAPER_API_BASE = "http://api.scraperapi.com";

// ── Puppeteer browser singleton ──────────────────────────────────────────────
// Reuses one browser instance across requests to avoid the startup cost.
let _browser = null;

const getBrowser = async () => {
  if (_browser && _browser.isConnected()) return _browser;
  _browser = await puppeteerExtra.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--window-size=1366,768",
    ],
    defaultViewport: { width: 1366, height: 768 },
  });
  return _browser;
};

/**
 * Fetches a fully JS-rendered page using a real headless Chromium browser.
 * Bypasses bot detection on Flipkart, Meesho, Myntra.
 * Reuses the same browser instance for speed.
 *
 * @param {string} url
 * @returns {Promise<string>} Fully rendered HTML
 */
const fetchWithPuppeteer = async (url) => {
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    // Spoof navigator properties to look like a real user
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => undefined });
      Object.defineProperty(navigator, "plugins", { get: () => [1, 2, 3] });
      Object.defineProperty(navigator, "languages", {
        get: () => ["en-IN", "en", "hi"],
      });
    });

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    );

    await page.setExtraHTTPHeaders({
      "Accept-Language": "en-IN,en;q=0.9",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    });

    // Navigate and wait until network is idle (all XHR/fetch calls done)
    await page.goto(url, {
      waitUntil: "networkidle2",
      timeout: 45000,
    });

    // Extra wait for JS hydration (price elements loaded by React)
    await new Promise((r) => setTimeout(r, 2500));

    const html = await page.content();
    return html;
  } finally {
    await page.close(); // always close the page, never the browser
  }
};

/**
 * Fetches rendered HTML via ScraperAPI (JS-rendered).
 * Use for Amazon — ScraperAPI's plan covers it reliably.
 *
 * @param {string} url
 * @param {object} options - Optional param overrides
 * @returns {Promise<string>} Raw HTML
 */
const fetchWithScraperApi = async (url, options = {}) => {
  const SCRAPER_API_KEY = process.env.SCRAPER_API_KEY;
  if (!SCRAPER_API_KEY) {
    throw new Error("SCRAPER_API_KEY is not set in environment variables");
  }

  const response = await axios.get(SCRAPER_API_BASE, {
    params: {
      api_key: SCRAPER_API_KEY,
      url,
      render: true,
      country_code: "in",
      ...options,
    },
    timeout: 60000,
    headers: { "Accept-Encoding": "gzip" },
  });

  return response.data;
};

/**
 * Fetches HTML directly with realistic browser headers.
 * Works for sites with minimal bot protection (e.g. some Myntra pages).
 *
 * @param {string} url
 * @returns {Promise<string>} Raw HTML
 */
const fetchDirect = async (url) => {
  const USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  ];
  const ua = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

  const config = {
    timeout: 30000,
    maxRedirects: 10,
    headers: {
      "User-Agent": ua,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-IN,en;q=0.9",
      "Accept-Encoding": "gzip, deflate, br",
      Connection: "keep-alive",
      "Upgrade-Insecure-Requests": "1",
      "Cache-Control": "max-age=0",
    },
  };

  try {
    const response = await axios.get(url, config);
    return response.data;
  } catch (err) {
    if (err.response?.status >= 500 || err.code === "ECONNABORTED") {
      await new Promise((r) => setTimeout(r, 1500));
      const response = await axios.get(url, config);
      return response.data;
    }
    throw err;
  }
};

/**
 * Fetches HTML using ScraperAPI Proxy.
 * Highly effective for sites that block standard requests like Meesho and Myntra.
 *
 * @param {string} url
 * @returns {Promise<string>} Raw HTML
 */
const fetchWithScraperProxy = async (url) => {
  const SCRAPER_API_KEY = process.env.SCRAPER_API_KEY;
  if (!SCRAPER_API_KEY) {
    throw new Error("SCRAPER_API_KEY is not set in environment variables");
  }

  // Globally disable TLS rejectUnauthorized for Node proxy tunneling if not already disabled
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

  const config = {
    method: "GET",
    proxy: {
      host: "proxy-server.scraperapi.com",
      port: 8001,
      auth: {
        username: "scraperapi.device_type=desktop.country_code=in",
        password: SCRAPER_API_KEY,
      },
      protocol: "http",
    },
    timeout: 45000,
  };

  try {
    const response = await axios.get(url, config);
    return response.data;
  } catch (err) {
    if (err.response?.status >= 500 || err.code === "ECONNABORTED") {
      await new Promise((r) => setTimeout(r, 1500));
      const response = await axios.get(url, config);
      return response.data;
    }
    throw err;
  }
};

export { fetchWithPuppeteer, fetchWithScraperApi, fetchDirect, fetchWithScraperProxy };
