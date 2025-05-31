const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const characterController = require('../controllers/characterController');

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    // Ensure the directory exists
    const tempDir = path.join(__dirname, '../../uploads/temp');
    const fs = require('fs');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    cb(null, tempDir);
  },
  filename: function(req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

// Create uploads/temp directory if it doesn't exist
const fs = require('fs');
const tempDir = path.join(__dirname, '../../uploads/temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// File filter to only allow images
const fileFilter = (req, file, cb) => {
  console.log('Processing file:', file.fieldname, file.originalname);
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// Debug middleware to inspect form data before multer processes it
router.use((req, res, next) => {
  if (req.method === 'POST' || req.method === 'PUT') {
    console.log('Form data received in routes:', {
      contentType: req.headers['content-type'],
      body: req.body,
    });
  }
  next();
});

// Upload middleware for character images
const characterUpload = upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'backgroundImage', maxCount: 1 },
]);

// Character routes
router.get('/', characterController.getAllCharacters);
router.get('/featured', characterController.getFeaturedCharacters);
router.get('/:id', characterController.getCharacterById);

// New routes to serve images directly from the database

// Add debug middleware before character creation
router.post('/', (req, res, next) => {
  console.log('CHARACTER CREATE - Pre-multer:', {
    contentType: req.headers['content-type'],
    body: req.body,
    files: req.files,
  });
  next();
}, characterUpload, (req, res, next) => {
  console.log('CHARACTER CREATE - Post-multer:', {
    body: req.body,
    files: req.files,
  });
  next();
}, characterController.createCharacter);

router.put('/:id', characterUpload, characterController.updateCharacter);
router.delete('/:id', characterController.deleteCharacter);
router.delete('/:id/permanent', characterController.permanentDeleteCharacter);

module.exports = router;
