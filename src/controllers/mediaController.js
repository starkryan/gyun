const bunnyStorageService = require('../services/bunnyStorageService');
const logger = require('../utils/logger');

/**
 * Controller for handling media-related requests.
 */
class MediaController {
  /**
   * Lists video files from the Bunny.net storage.
   * @param {Object} req - Express request object.
   * @param {Object} res - Express response object.
   */
  async listVideos(req, res) {
    try {
      const videoPath = 'videos/'; // Assuming videos are in a 'videos' folder in the storage zone
      const files = await bunnyStorageService.listFiles(videoPath);

      // Filter for video files and construct CDN URLs
      const videoUrls = files
        .filter(file => file.IsDirectory === false && file.ObjectName.endsWith('.mp4'))
        .map(file => bunnyStorageService.getCdnUrl(`${videoPath}${file.ObjectName}`));

      logger.info(`Found ${videoUrls.length} video URLs.`);
      res.json(videoUrls);
    } catch (error) {
      logger.error('Error listing videos:', error);
      res.status(500).json({ message: 'Failed to list videos', error: error.message });
    }
  }
}

module.exports = new MediaController();
