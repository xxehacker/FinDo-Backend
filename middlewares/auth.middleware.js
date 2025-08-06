import jwt from "jsonwebtoken";
import { ApiResponse } from "../utils/ApiResponse.js";
import User from "../features/auth/models/user.model.js";

const authenticateToken = async (req, res, next) => {
  //! Extract token from Authorization header
  const authHeader = req.headers?.authorization;
  const token =
    authHeader && authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;

  //! Check if token exists
  if (!token) {
    return res
      .status(401)
      .json(new ApiResponse(401, null, "Not authorized, no token provided"));
  }

  try {
    //! Verify the token
    const decoded = jwt.verify(token, process.env.TOKEN_SECRET);

    //! Attach the user to the request object
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(404).json(new ApiResponse(404, null, "User not found"));
    }

    req.user = user; //! Attach user to request
    next();
  } catch (error) {
    console.error("Token verification error:", error);
    return res
      .status(403)
      .json(
        new ApiResponse(403, null, "Not authorized, token invalid or expired")
      );
  }
};

export { authenticateToken };
