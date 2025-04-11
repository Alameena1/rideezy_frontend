import { v2 as cloudinary } from "cloudinary";

export default cloudinary;

export type CloudinaryUploadResponse = {
  secure_url: string;
  error?: { message: string };
};