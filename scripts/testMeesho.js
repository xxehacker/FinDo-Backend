import * as dotenv from "dotenv";
dotenv.config();

import { scrapesMeesho } from "../utils/scraper/meesho.js";
import { scrapeMyntra } from "../utils/scraper/myntra.js";

const meeshoUrl = "https://www.meesho.com/belgium-designer-beautiful-womens-flipflops-1902-khaki/p/77wlt9";
const myntraUrl = "https://www.myntra.com/shirts/roadster/roadster-men-blue-cotton-pure-denim-shirt/1364628/buy";

const test = async () => {
  console.log("=== TESTING MEESHO SCRAPER ===");
  try {
    const meeshoResult = await scrapesMeesho(meeshoUrl);
    console.log("Meesho Result:", JSON.stringify(meeshoResult, null, 2));
  } catch (err) {
    console.error("Meesho Error:", err.message);
  }

  console.log("\n=== TESTING MYNTRA SCRAPER ===");
  try {
    const myntraResult = await scrapeMyntra(myntraUrl);
    console.log("Myntra Result:", JSON.stringify(myntraResult, null, 2));
  } catch (err) {
    console.error("Myntra Error:", err.message);
  }
};

test();
