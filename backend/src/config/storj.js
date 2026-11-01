
import "dotenv/config";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Storj configuration
const requiredEnv = [
  "STORJ_ACCESS_KEY",
  "STORJ_SECRET_KEY",
  "STORJ_ENDPOINT",
  "STORJ_BUCKET",
];

for (const key of requiredEnv) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

export const STORJ_BUCKET = process.env.STORJ_BUCKET;

export const storjClient = new S3Client({
  endpoint: process.env.STORJ_ENDPOINT,
  region: process.env.STORJ_REGION || "us-east-1",
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.STORJ_ACCESS_KEY,
    secretAccessKey: process.env.STORJ_SECRET_KEY,
  },
});

// Upload image to Storj
export const uploadToStorj = async ({
  key,
  buffer,
  contentType,
}) => {
  if (!key || !buffer || !contentType) {
    throw new Error("Missing required image upload parameters");
  }

  const command = new PutObjectCommand({
    Bucket: STORJ_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  });

  return await storjClient.send(command);
};

// Generate temporary URL for displaying image
export const getStorjImageUrl = async (key) => {
  if (!key) return null;

  const command = new GetObjectCommand({
    Bucket: STORJ_BUCKET,
    Key: key,
  });

  return await getSignedUrl(storjClient, command, {
    expiresIn: 3600,
  });
};

// Delete image from Storj
export const deleteFromStorj = async (key) => {
  if (!key) return;

  const command = new DeleteObjectCommand({
    Bucket: STORJ_BUCKET,
    Key: key,
  });

  return await storjClient.send(command);
};
