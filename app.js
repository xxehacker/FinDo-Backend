/*
Date: 05.08.2025
Author: Mridupawan Bordoloi
Description: Backend for findo app
Version: 1.0
*/

//! import package
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import errorHandler from "./middlewares/errorHandler.middleware.js";
import routes from "./features/index.js";

//! initialize app
const app = express();

//! load environment variables
dotenv.config();
const allowedOrigins = process.env.CORS_ORIGIN.split(",");

//! middleware
app.use(
  cors({
    origin: function (origin, callback) {
      //! Allow requests with no origin (like mobile apps or curl)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn(`Blocked by CORS: ${origin}`);
        callback(null, false); //! Don't throw error, just deny
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
  })
);

app.use(
  express.json({
    limit: "50kb",
  })
);

app.use(
  express.urlencoded({
    limit: "50kb",
    extended: true,
  })
);
app.use(express.static("public"));
app.use(cookieParser());
app.use(helmet());

//! routes declaration
app.get("/", (req, res) => {
  res.send("Welcome To Findo API");
});
app.use("/api/v1", routes);
app.use(errorHandler);

export default app;
