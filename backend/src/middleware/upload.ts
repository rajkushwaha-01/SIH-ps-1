import multer from "multer";
import path from "path";
import fs from "fs";

// Resolve uploads directory
const uploadsDir = fs.existsSync(path.resolve(__dirname, "../../../data/uploads"))
  ? path.resolve(__dirname, "../../../data/uploads")
  : path.resolve(process.cwd(), "data/uploads");

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `media-${uniqueSuffix}${ext}`);
  },
});

export const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit for media
  },
});
