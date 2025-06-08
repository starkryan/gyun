/**
 * Local Storage Service
 * Fallback for when Bunny.net is unavailable
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

class LocalStorageService {
  constructor() {
    // Create the local storage directory if it doesn't exist
    this.storageDir = path.join(__dirname, '../../public/images');
    this.storageUrlBase = '/images';

    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
    }
  }

  /**
   * Save a file to local storage
   * @param {Buffer} fileBuffer - The file buffer to save
   * @param {string} filePath - Path within storage (will be converted to local path)
   * @returns {Promise<string>} URL of the saved file
   */
  async saveFile(fileBuffer, filePath) {
    try {
      // Convert the Bunny.net style path to a local path
      const localPath = this.getLocalPath(filePath);

      // Create the directory if it doesn't exist
      const dir = path.dirname(localPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Write the file
      fs.writeFileSync(localPath, fileBuffer);

      // Return the URL
      return this.getPublicUrl(filePath);
    } catch (error) {
      console.error('Error saving file locally:', error.message);
      throw new Error(`Failed to save file locally: ${error.message}`);
    }
  }

  /**
   * Convert a storage path to a local filesystem path
   * @param {string} filePath - Path within storage
   * @returns {string} Local filesystem path
   */
  getLocalPath(filePath) {
    // Remove leading slash if present
    const normalizedPath = filePath.startsWith('/') ? filePath.substring(1) : filePath;
    return path.join(this.storageDir, normalizedPath);
  }

  /**
   * Get the public URL for accessing the file
   * @param {string} filePath - Path within storage
   * @returns {string} Public URL
   */
  getPublicUrl(filePath) {
    // Remove leading slash if present
    const normalizedPath = filePath.startsWith('/') ? filePath.substring(1) : filePath;
    return `${this.storageUrlBase}/${normalizedPath}`;
  }

  /**
   * Process and save an image for a character
   * @param {Buffer|string} image - Image buffer or path to process
   * @param {string} characterId - Character ID
   * @param {boolean} isBackground - Whether this is a background image
   * @param {Object} options - Processing options
   * @returns {Promise<string>} URL of the saved image
   */
  async processAndSaveCharacterImage(image, characterId, isBackground = false, options = {}) {
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

      // Define the path in storage
      const imageType = isBackground ? 'background' : 'profile';
      const filePath = `characters/${characterId}/${imageType}-${Date.now()}.webp`;

      // Save the processed image
      return await this.saveFile(processedImageBuffer, filePath);
    } catch (error) {
      console.error('Error processing image:', error);
      throw new Error(`Failed to process and save image: ${error.message}`);
    }
  }

  /**
   * Delete a file from local storage
   * @param {string} filePath - Path within storage
   * @returns {Promise<boolean>} Success status
   */
  async deleteFile(filePath) {
    try {
      const localPath = this.getLocalPath(filePath);

      if (fs.existsSync(localPath)) {
        fs.unlinkSync(localPath);
      }

      return true;
    } catch (error) {
      console.error('Error deleting file:', error.message);
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }
}

module.exports = new LocalStorageService();
