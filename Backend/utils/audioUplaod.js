import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "./cloudinary.js";

const postStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    if (file.fieldname === "audio") {
      return {
        folder: "musicconnect/audio",
        resource_type: "video",
        allowed_formats: ["mp3", "wav", "m4a"],
      };
    }
    if (file.fieldname === "cover") {
      return {
        folder: "musicconnect/covers",
        resource_type: "image",
        allowed_formats: ["jpg", "jpeg", "png", "webp"],
      };
    }
    return {
      folder: "musicconnect",
    };
  },
});

const audioUpload = multer({ storage: postStorage });

export default audioUpload;