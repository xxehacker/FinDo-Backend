import dotenv from "dotenv";
import mongoose from "mongoose";
import connectDB from "../db/index.js";
import User from "../features/auth/models/user.model.js";
import { importSalaryHistory } from "../features/transaction/services/importSalaryHistory.js";

dotenv.config({ path: "./.env" });

const email = process.env.USER_EMAIL;

if (!email) {
  console.error("Set USER_EMAIL to the account that should receive salary entries.");
  console.error("Example: USER_EMAIL=you@example.com node scripts/seedSalaryHistory.js");
  process.exit(1);
}

await connectDB();

const user = await User.findOne({ email: email.trim().toLowerCase() });
if (!user) {
  console.error(`No user found with email: ${email}`);
  await mongoose.disconnect();
  process.exit(1);
}

const result = await importSalaryHistory(user._id);
console.log("Salary history seed complete:");
console.log(JSON.stringify(result, null, 2));

await mongoose.disconnect();
process.exit(0);
