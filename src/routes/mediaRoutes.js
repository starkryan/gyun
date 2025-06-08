const express = require('express');
const router = express.Router();
const mediaController = require('../controllers/mediaController');

// Route to list all video files from Bunny.net storage
router.get('/videos', mediaController.listVideos);

module.exports = router;
