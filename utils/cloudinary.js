import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

export const uploadToCloudinary = async (buffer, folder) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folder,
        resource_type: 'auto'
      },
      (error, result) => {
        if (error) reject(error);
        resolve(result);
      }
    );

    uploadStream.end(buffer);
  });
};

const getCenterName = (tutor) => {
  if (!tutor || !tutor.assignedCenter) return "Unknown Center";
  const center = centers?.find(c => c._id === tutor.assignedCenter);
  return center ? center.name : "Unknown Center";
};

const tutorsWithCenterName = tutors.map(tutor => ({
  ...tutor,
  centerName: centers?.find(c => c._id === tutor.assignedCenter)?.name || "Unknown Center"
}));