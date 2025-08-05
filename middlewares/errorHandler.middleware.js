import { ApiError } from "../utils/ApiError.js";

const errorHandler = (err, req, res, next) => {
  let error = err;

  //! Processing the error (validation error, unique constraint error, etc.)
  if (error.name === "ValidationError") {
    //! For Mongoose validation errors
    const errors = Object.keys(error.errors).reduce((acc, key) => {
      acc[key] = error.errors[key].message;
      return acc;
    }, {});
    error = new ApiError(400, "Validation error occurred", errors);
  } else if (error.code === 11000) {
    //! For MongoDB unique constraint errors
    const field = Object.keys(error.keyValue);
    const message = `An item already exists with the same ${field}`;
    error = new ApiError(409, "Unique constraint error", { [field]: message });
  } else if (!(error instanceof ApiError)) {
    //! Convert other types of errors to ApiError if they aren't already
    const statusCode = error.statusCode || 500;
    const message = error.message || "Internal Server Error";
    error = new ApiError(statusCode, message, { detail: error.message });
  }

  //! Send the error response
  res.status(error.statusCode).json({
    message: error.message,
    errors: error.errors,
  });
};

export default errorHandler;
