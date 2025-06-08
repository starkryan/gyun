const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');

/**
 * @route POST /api/ai/character/response
 * @description Generate a response from a character
 * @access Public
 * @body {
 *  characterId: string,
 *  message: string,
 *  conversation: array (optional)
 * }
 * @query {
 *  uncensored: boolean (default: true)
 * }
 */
router.post('/character/response', aiController.generateCharacterResponse);



/**
 * @route GET /api/ai/character/:characterId/system-message
 * @description Get the system message for a character
 * @access Public
 * @param {
 *  characterId: string
 * }
 * @query {
 *  uncensored: boolean (default: true)
 * }
 */
router.get('/character/:characterId/system-message', aiController.getSystemMessage);

/**
 * @route GET /api/ai/health
 * @description Check the health of the OpenAI API connection
 * @access Public
 */
router.get('/health', aiController.checkHealth);

module.exports = router;
