import multer from "multer";
import path from "path";
import fs from "fs";

// Ensure upload directory exists
const uploadDir = "./public/temp/uploads";
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    if (file.fieldname === 'thumbnail' || file.fieldname === 'profileImage') {
        if (!file.mimetype.match(/^image\/(jpeg|jpg|png|webp)$/)) {
            return cb(new Error('Only JPEG, JPG, PNG, and WEBP images are allowed for thumbnail'));
        }
    } else if (file.fieldname === 'previewVideo' || file.fieldname === 'videos') {
        if (!file.mimetype.match(/^video\/(mp4|mpeg|quicktime|x-msvideo)$/)) {
            return cb(new Error('Only MP4, MPEG, MOV, and AVI videos are allowed'));
        }
    }
    cb(null, true);
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 100 * 1024 * 1024 // 100MB limit for all files
    }
});

export { upload };