import User from "../models/user.model.js";
import { ApiResponse } from "@/../../utils/ApiResponse.js";
import { asyncHandler } from "@/../../utils/asyncHandler.js";
import bcrypt from "bcryptjs";

const handleSignup = asyncHandler(async (req, res) => {
  const { username, email, password, phone } = req.body;
  console.log(req.body);

  if (!username || !email || !password) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, "Missing required fields"));
  }

  try {
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res
        .status(409)
        .json(new ApiResponse(409, null, "Email already exists"));
    }

    const existingPhone = await User.findOne({ phone });
    if (existingPhone) {
      return res
        .status(409)
        .json(new ApiResponse(409, null, "Phone number already exists"));
    }

    //! hashing password
    const solt = await bcrypt.genSalt(10);
    const hashPassword = await bcrypt.hash(password, solt);

    const signUpUser = new User({
      username,
      email,
      password: hashPassword,
      phone: phone || null,
    });

    await signUpUser.save();

    res.status(201).json({
      message: `User registration successfullly completed for ${username}`,
    });
  } catch (error) {
    console.error("Signup error:", error);

    //! Return Mongoose validation error clearly
    if (error.name === "ValidationError") {
      return res.status(400).json(new ApiResponse(400, null, error.message));
    }

    //! Return duplicate key error (unique constraints)
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res
        .status(409)
        .json(
          new ApiResponse(
            409,
            null,
            `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`
          )
        );
    }
    //! Return other errors
    return res
      .status(500)
      .json(new ApiResponse(500, null, "Internal Server Error"));
  }
});

const handleLogin = asyncHandler(async (req, res) => {
  res.status(200).json({
    message: "Login successfull",
  });
});

export { handleSignup, handleLogin };
