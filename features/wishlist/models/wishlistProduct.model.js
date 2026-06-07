import mongoose from "mongoose";

const priceHistorySchema = new mongoose.Schema(
  {
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    recordedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const wishlistProductSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    url: {
      type: String,
      required: true,
      trim: true,
    },
    site: {
      type: String,
      enum: ["flipkart", "amazon", "meesho", "myntra", "unknown"],
      required: true,
    },
    title: {
      type: String,
      trim: true,
      default: "",
    },
    image: {
      type: String,
      trim: true,
      default: "",
    },
    currentPrice: {
      type: Number,
      default: 0,
      min: 0,
    },
    originalPrice: {
      type: Number,
      default: 0,
      min: 0,
    },
    buyLink: {
      type: String,
      trim: true,
      default: "",
    },
    currency: {
      type: String,
      default: "INR",
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    lastCheckedAt: {
      type: Date,
      default: Date.now,
    },
    isPurchased: {
      type: Boolean,
      default: false,
    },
    purchasedDate: {
      type: Date,
      default: null,
    },
    emi: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EMI",
      default: null,
    },
    priceHistory: {
      type: [priceHistorySchema],
      default: [],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual getter/setter for backward compatibility
wishlistProductSchema.virtual("buyed")
  .get(function () {
    return this.isPurchased;
  })
  .set(function (val) {
    this.isPurchased = val;
  });

// Compound index: one URL per user
wishlistProductSchema.index({ user: 1, url: 1 }, { unique: true });

const WishlistProduct = mongoose.model(
  "WishlistProduct",
  wishlistProductSchema
);
export default WishlistProduct;
