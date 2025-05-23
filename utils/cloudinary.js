import {v2 as cloudinary} from "cloudinary"
import { response } from "express";
import fs from "fs"

// import {v2 as cloudinary} from 'cloudinary';
          
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET 
});

const fileuploader = async (localFilePath)=>{
    try {
        //if file is not present then
      if(!localFilePath) return null
        //ifthe file is present then
        const response =  await cloudinary.uploader.upload(localFilePath,{
            resource_type:"auto"
        })
        // console.log("file is present",response.url);
        fs.unlinkSync(localFilePath)
        return response

    } catch (error) {
        fs.unlinkSync(localFilePath)
        return null
    }
}
// console.log(response);
export {fileuploader}