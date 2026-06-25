import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

// Cloudinary automatically picks up the CLOUDINARY_URL environment variable.
// Example .env: CLOUDINARY_URL=cloudinary://<your_api_key>:<your_api_secret>@<your_cloud_name>

export default cloudinary;
