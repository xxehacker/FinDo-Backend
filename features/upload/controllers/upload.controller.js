import path from "path";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { ApiResponse } from "../../../utils/ApiResponse.js";

const handleUploadFile = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, "No file uploaded"));
  }

  const fileUrl = `/temp/${req.file.filename}`;

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        url: fileUrl,
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
      },
      "File uploaded successfully"
    )
  );
});

export { handleUploadFile };
