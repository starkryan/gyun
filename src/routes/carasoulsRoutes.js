const express = require('express');
const router = express.Router();
const carasoulController = require('../controllers/carasoulController');

// Route to list all image files for carousels from Bunny.net storage
router.get('/', carasoulController.listImages);

module.exports = router;
