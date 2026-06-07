import { asyncHandler } from "../../../utils/asyncHandler.js";
import { ApiResponse } from "../../../utils/ApiResponse.js";
import WishlistProduct from "../models/wishlistProduct.model.js";
import { scrapeProduct, detectSite } from "../../../utils/scraper/index.js";
import Category from "../../category/models/category.model.js";
import Transaction from "../../transaction/models/transaction.model.js";
import updateDayWiseSummary from "../../transaction/utils/updateDayWiseSummary.js";

const getUserId = (req) => req.user?._id || req.user?.id;

/**
 * Validates and cleans a URL string.
 */
const isValidUrl = (str) => {
  try {
    const url = new URL(str);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

/**
 * POST /api/v1/wishlist
 * Add a new product by URL — scrapes immediately.
 */
const handleAddProduct = asyncHandler(async (req, res) => {
  const { url } = req.body;
  const userId = getUserId(req);

  if (!url?.trim()) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, "Product URL is required"));
  }

  const trimmedUrl = url.trim();

  if (!isValidUrl(trimmedUrl)) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, "Please provide a valid product URL"));
  }

  const site = detectSite(trimmedUrl);
  if (site === "unknown") {
    return res.status(400).json(
      new ApiResponse(
        400,
        null,
        "Unsupported site. Please use a Flipkart, Amazon India, Meesho, or Myntra link"
      )
    );
  }

  // Check for duplicate URL for this user
  const existing = await WishlistProduct.findOne({
    user: userId,
    url: trimmedUrl,
  }).lean();

  if (existing) {
    return res.status(409).json(
      new ApiResponse(409, existing, "This product is already in your tracker")
    );
  }

  // Scrape product info
  let scraped;
  try {
    scraped = await scrapeProduct(trimmedUrl);
  } catch (err) {
    return res.status(502).json(
      new ApiResponse(
        502,
        null,
        `Failed to fetch product info: ${err.message}`
      )
    );
  }

  // Guard: if scraper returned no title and no price the page didn't render
  if (!scraped.title && !scraped.currentPrice) {
    return res.status(502).json(
      new ApiResponse(
        502,
        null,
        "Could not extract product details from the page. The site may have blocked the request — please try again in a moment."
      )
    );
  }

  const product = await WishlistProduct.create({
    user: userId,
    url: trimmedUrl,
    site: scraped.site,
    title: scraped.title,
    image: scraped.image,
    currentPrice: scraped.currentPrice,
    originalPrice: scraped.originalPrice,
    buyLink: trimmedUrl,
    currency: scraped.currency || "INR",
    isAvailable: scraped.isAvailable,
    lastCheckedAt: new Date(),
    priceHistory: [
      {
        price: scraped.currentPrice,
        recordedAt: new Date(),
      },
    ],
  });

  return res
    .status(201)
    .json(new ApiResponse(201, product, "Product added to tracker successfully"));
});

/**
 * GET /api/v1/wishlist
 * Get all tracked products for current user.
 */
const handleGetAllProducts = asyncHandler(async (req, res) => {
  const products = await WishlistProduct.find({ user: getUserId(req) })
    .sort({ createdAt: -1 })
    .lean();

  // Return priceHistory as-is (lightweight for card sparklines)
  return res.status(200).json(
    new ApiResponse(
      200,
      products,
      products.length ? "Products found" : "No products tracked yet"
    )
  );
});

/**
 * GET /api/v1/wishlist/:id
 * Get single product with full price history.
 */
const handleGetProductById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = getUserId(req);

  const product = await WishlistProduct.findOne({
    _id: id,
    user: userId,
  }).lean();

  if (!product) {
    return res
      .status(404)
      .json(new ApiResponse(404, null, "Product not found"));
  }

  return res
    .status(200)
    .json(new ApiResponse(200, product, "Product found"));
});

/**
 * DELETE /api/v1/wishlist/:id
 * Remove a tracked product.
 */
const handleDeleteProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = getUserId(req);

  const deleted = await WishlistProduct.findOneAndDelete({
    _id: id,
    user: userId,
  });

  if (!deleted) {
    return res
      .status(404)
      .json(new ApiResponse(404, null, "Product not found"));
  }

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Product removed from tracker"));
});

/**
 * POST /api/v1/wishlist/:id/refresh
 * Manually re-scrape product and update price history if price changed.
 */
const handleRefreshProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = getUserId(req);

  const product = await WishlistProduct.findOne({ _id: id, user: userId });

  if (!product) {
    return res
      .status(404)
      .json(new ApiResponse(404, null, "Product not found"));
  }

  // Re-scrape
  let scraped;
  try {
    scraped = await scrapeProduct(product.url);
  } catch (err) {
    return res.status(502).json(
      new ApiResponse(
        502,
        null,
        `Failed to refresh product: ${err.message}`
      )
    );
  }

  const oldPrice = product.currentPrice;
  const newPrice = scraped.currentPrice;
  const priceChanged = oldPrice !== newPrice;

  // Always update lastCheckedAt and current info
  product.currentPrice = newPrice;
  product.originalPrice = scraped.originalPrice || product.originalPrice;
  product.title = scraped.title || product.title;
  product.image = scraped.image || product.image;
  product.isAvailable = scraped.isAvailable;
  product.lastCheckedAt = new Date();

  // Only append to priceHistory if price changed
  if (priceChanged) {
    product.priceHistory.push({
      price: newPrice,
      recordedAt: new Date(),
    });
  }

  await product.save();

  const priceDelta = newPrice - oldPrice;

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        product: product.toObject(),
        priceChanged,
        priceDelta,
        oldPrice,
        newPrice,
      },
      priceChanged
        ? `Price updated! ${priceDelta > 0 ? "↑" : "↓"} ₹${Math.abs(priceDelta).toFixed(2)}`
        : "Price unchanged since last check"
    )
  );
});

/**
 * POST /api/v1/wishlist/toggle-purchased/:id
 * Toggle the buyed status of a tracked product.
 */
const handleTogglePurchasedProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = getUserId(req);
  const { bankAccountId, transactionMethod, autoExpense } = req.body;

  const product = await WishlistProduct.findOne({ _id: id, user: userId });

  if (!product) {
    return res
      .status(404)
      .json(new ApiResponse(404, null, "Product not found"));
  }

  product.buyed = !product.buyed;
  product.purchasedDate = product.buyed ? new Date() : null;

  if (product.buyed && autoExpense !== false) {
    let category = await Category.findOne({
      createdBy: userId,
      type: "expense",
      status: "active",
      name: /Shopping|Bills|EMI/i,
    });

    if (!category) {
      category = await Category.findOne({
        createdBy: userId,
        type: "expense",
        status: "active",
      });
    }

    if (!category) {
      category = await Category.create({
        name: "Shopping",
        description: "Default category for Price Tracker purchases",
        type: "expense",
        status: "active",
        createdBy: userId,
      });
    }

    const transaction = await Transaction.create({
      type: "expense",
      amount: product.currentPrice,
      description: `Purchased - ${product.title.slice(0, 50)}`,
      category: category._id,
      date: new Date(),
      bankAccount: bankAccountId || null,
      transactionMethod: transactionMethod || "googlepay",
      transactionStatus: "successful",
      notes: `Wishlist item marked as purchased (Full Payment). Linked to WishlistProduct ID: ${product._id}`,
      user: userId,
    });

    if (transaction.isDayWise) {
      await updateDayWiseSummary(transaction, "create");
    }
  }

  await product.save();

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        product,
        product.buyed
          ? "Product marked as purchased!"
          : "Product returned back to wishlist"
      )
    );
});

export {
  handleAddProduct,
  handleGetAllProducts,
  handleGetProductById,
  handleDeleteProduct,
  handleRefreshProduct,
  handleTogglePurchasedProduct,
};
