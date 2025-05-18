import {v2 as cloudinary} from "cloudinary"
import fs from "fs"

cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET 
});

const videoUploader = async (localFilePath) => {
    try {
        if(!localFilePath) return null;

        const uploadOptions = {
            resource_type: "video",
            folder: "course_videos",
            chunk_size: 6000000,
            eager: [{
                format: "mp4",
                transformation: [
                    { quality: "auto" },
                    { fetch_format: "auto" }
                ]
            }],
            eager_async: true
        };

        const response = await cloudinary.uploader.upload(localFilePath, uploadOptions);
        
        // Clean up local file after successful upload
        fs.unlinkSync(localFilePath);
        
        return {
            url: response.secure_url,
            public_id: response.public_id,
            duration: response.duration,
            format: response.format
        };

    } catch (error) {
        // Clean up local file if upload fails
        if(fs.existsSync(localFilePath)) {
            fs.unlinkSync(localFilePath);
        }
        console.error('Video Upload Error:', error);
        return null;
    }
};

export { videoUploader };