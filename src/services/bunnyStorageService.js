const axios = require('axios');
const sharp = require('sharp');
const path = require('path');
const bunnyConfig = require('../config/bunnyConfig');
const logger = require('../utils/logger');

/**
 * Service for handling file uploads to Bunny.net Storage
 */
class BunnyStorageService {
  constructor() {
    // Store the API key exactly as provided, without any transformations
    this.storageApiKey = bunnyConfig.storageAccessKey;
    this.storageZoneName = bunnyConfig.storageZoneName;
    this.region = bunnyConfig.region;
    this.baseUrl = bunnyConfig.storageBaseUrl;
    this.cdnBaseUrl = bunnyConfig.cdnBaseUrl;

    logger.info('BunnyStorageService initialized with:');
    logger.info(`- Storage Zone: ${this.storageZoneName}`);
    logger.info(`- Base URL: ${this.baseUrl}`);
    logger.info(`- API Key (first 5 chars): ${this.storageApiKey ? this.storageApiKey.substring(0, 5) + '...' : 'Not set'}`);
  }

  /**
   * Get the full storage API URL
   * @param {string} filePath - Path within storage
   * @returns {string} Full storage API URL
   */
  getStorageUrl(filePath) {
    // Remove leading slash if present
    const normalizedPath = filePath.startsWith('/') ? filePath.substring(1) : filePath;
    const url = `${this.baseUrl}/${this.storageZoneName}/${normalizedPath}`;
    return url;
  }

  /**
   * Get the public CDN URL for accessing the file
   * @param {string} filePath - Path within storage
   * @returns {string} Full CDN URL
   */
  getCdnUrl(filePath) {
    // Remove leading slash if present
    const normalizedPath = filePath.startsWith('/') ? filePath.substring(1) : filePath;
    return `${this.cdnBaseUrl}/${normalizedPath}`;
  }

  /**
   * Upload a file buffer to Bunny.net storage
   * @param {Buffer} fileBuffer - The file buffer to upload
   * @param {string} filePath - Path within storage
   * @param {string} contentType - Content type of the file
   * @returns {Promise<string>} URL of the uploaded file
   */
  async uploadFile(fileBuffer, filePath, contentType) {
    try {
      const url = this.getStorageUrl(filePath);

      console.log(`Uploading to Bunny.net URL: ${url}`);
      console.log(`File size: ${fileBuffer.length} bytes`);
      console.log(`Content-Type: ${contentType || bunnyConfig.defaultContentType}`);

      // Use the API key exactly as configured in .env
      // The API key format must be preserved exactly as provided by Bunny.net
      console.log(`Using API key (first 5 chars): ${this.storageApiKey.substring(0, 5)}...`);

      // Upload to Bunny.net Storage using specific Axios options to match curl behavior
      const response = await axios.put(url, fileBuffer, {
        headers: {
          'AccessKey': this.storageApiKey,
          'Content-Type': contentType || bunnyConfig.defaultContentType,
        },
        // Important: these settings better match how curl handles binary data
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        transformRequest: [(data) => {
          // Return the buffer directly without any transformation
          return data;
        }],
      });

      console.log('Bunny.net upload response:', response.status, response.statusText);

      // Return the CDN URL for the uploaded file
      const cdnUrl = this.getCdnUrl(filePath);
      console.log('CDN URL for uploaded file:', cdnUrl);
      return cdnUrl;
    } catch (error) {
      console.error('Error uploading to Bunny.net:', error.message);
      if (error.response) {
        console.error('Status:', error.response.status);
        console.error('Response:', error.response.data);
      }
      throw new Error(`Failed to upload file to Bunny.net: ${error.message}`);
    }
  }

  /**
   * Process and upload an image for a character
   * @param {Buffer|string} image - Image buffer or path to process
   * @param {string} characterId - Character ID
   * @param {boolean} isBackground - Whether this is a background image
   * @param {Object} options - Processing options
   * @returns {Promise<string>} URL of the uploaded image
   */
  async processAndUploadCharacterImage(image, characterId, isBackground = false, options = {}) {
    try {
      // Start with a sharp instance from either a file path or buffer
      let sharpInstance;
      if (typeof image === 'string') {
        sharpInstance = sharp(image);
      } else {
        sharpInstance = sharp(image);
      }

      // Apply image processing based on image type
      if (isBackground) {
        // For background images, maintain aspect ratio but limit dimensions
        sharpInstance = sharpInstance
          .resize({
            width: options.width || 1200,
            height: options.height || 800,
            fit: 'inside',
            withoutEnlargement: true,
          });
      } else {
        // For profile images, create a square image
        sharpInstance = sharpInstance
          .resize({
            width: options.width || 400,
            height: options.height || 400,
            fit: 'cover',
          });
      }

      // Apply final formatting
      const processedImageBuffer = await sharpInstance
        .webp({ quality: options.quality || 85 })
        .toBuffer();

      // Define the path in Bunny storage
      const imageType = isBackground ? 'background' : 'profile';
      const filePath = `characters/${characterId}/${imageType}-${Date.now()}.webp`;

      console.log(`Processing complete. Uploading ${imageType} image for character ${characterId}`);

      // Upload the processed image
      return await this.uploadFile(processedImageBuffer, filePath, 'image/webp');
    } catch (error) {
      console.error('Error processing image:', error);
      throw new Error(`Failed to process and upload image: ${error.message}`);
    }
  }

  /**
   * Delete a file from Bunny.net storage
   * @param {string} filePath - Path within storage
   * @returns {Promise<boolean>} Success status
   */
  async deleteFile(filePath) {
    try {
      const url = this.getStorageUrl(filePath);

      // Use the API key exactly as provided in .env
      await axios.delete(url, {
        headers: {
          'AccessKey': this.storageApiKey,
        },
      });

      return true;
    } catch (error) {
      console.error('Error deleting from Bunny.net:', error.message);
      throw new Error(`Failed to delete file from Bunny.net: ${error.message}`);
    }
  }

  /**
   * List files in a specified path within the Bunny.net storage zone.
   * @param {string} path - The path within the storage zone to list files from (e.g., 'videos/', 'characters/').
   * @returns {Promise<Array<Object>>} An array of file objects from Bunny.net.
   */
  async listFiles(path = '') {
    try {
      const normalizedPath = path.startsWith('/') ? path.substring(1) : path;
      const url = `${this.baseUrl}/${this.storageZoneName}/${normalizedPath}`;

      logger.info(`Listing files from Bunny.net URL: ${url}`);

      const response = await axios.get(url, {
        headers: {
          'AccessKey': this.storageApiKey,
          'Accept': 'application/json', // Ensure we get JSON response
        },
      });

      logger.info('Bunny.net list files response status:', response.status);
      return response.data; // This should be an array of file objects
    } catch (error) {
      logger.error('Error listing files from Bunny.net:', error.message);
      if (error.response) {
        logger.error('Status:', error.response.status);
        logger.error('Response:', error.response.data);
      }
      throw new Error(`Failed to list files from Bunny.net: ${error.message}`);
    }
  }
}

module.exports = new BunnyStorageService();
