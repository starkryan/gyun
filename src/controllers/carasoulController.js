const bunnyStorageService = require('../services/bunnyStorageService');
const logger = require('../utils/logger');

/**
 * Controller for handling carousel image-related requests.
 */
class CarasoulController {
  /**
   * Lists image files from the Bunny.net storage for carousels.
   * @param {Object} req - Express request object.
   * @param {Object} res - Express response object.
   */
  async listImages(req, res) {
    try {
      const imagePath = 'carasouls/'; // Assuming images are in a 'carasouls' folder in the storage zone
      const files = await bunnyStorageService.listFiles(imagePath);

      // Filter for image files and construct CDN URLs
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif'];
      const imageUrls = files
        .filter(file => 
          file.IsDirectory === false && 
          imageExtensions.some(ext => file.ObjectName.toLowerCase().endsWith(ext))
        )
        .map(file => bunnyStorageService.getCdnUrl(`${imagePath}${file.ObjectName}`));

      logger.info(`Found ${imageUrls.length} image URLs for carousel.`);
      res.json(imageUrls);
    } catch (error) {
      logger.error('Error listing carousel images:', error);
      res.status(500).json({ message: 'Failed to list carousel images', error: error.message });
    }
  }
}

module.exports = new CarasoulController();
