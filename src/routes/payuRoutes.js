const express = require('express');
const router = express.Router();
const payuController = require('../controllers/payuController');

// Route for generating PayU hash
router.post('/generate-hash', payuController.generatePayuHash);

// Routes for PayU success and failure callbacks
router.post('/success', payuController.handlePayuSuccess);
router.post('/failure', payuController.handlePayuFailure);

// PayU might also send GET requests for SURL/FURL in some cases,
// or for initial redirection. It's good practice to handle both.
router.get('/success', payuController.handlePayuSuccess);
router.get('/failure', payuController.handlePayuFailure);

module.exports = router;
