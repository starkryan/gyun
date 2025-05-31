const dotenv = require('dotenv');
dotenv.config();

module.exports = {
  // Access key for Bunny Storage API
  storageAccessKey: process.env.BUNNY_API_KEY,

  // Storage zone name - you might want to update this with your actual zone name
  storageZoneName: 'leome',

  // Region (optional, leave empty for default region)
  region: '',

  // Base URL for Bunny storage API (including protocol)
  storageBaseUrl: 'https://storage.bunnycdn.com',

  // Base URLs for accessing the files from the CDN (including protocol)
  // This would typically be your pull zone URL
  cdnBaseUrl: 'https://leome.b-cdn.net',

  // Default content type for uploaded images
  defaultContentType: 'image/webp',
};
