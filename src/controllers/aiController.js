/**
 * AI Controller
 *
 * Handles requests related to AI-powered features like character responses,
 * memory management, and content generation.
 */

const openaiService = require('../services/openaiService');
const Character = require('../models/Character');
const config = require('../config/openaiConfig');
const logger = require('../utils/logger');

/**
 * Get formatted date and time for different formats
 * @returns {Object} - Object with different date and time formats
 */
function getFormattedDateTime() {
  const now = new Date();

  // Different date formats
  const formats = {
    // Standard formats
    fullDateTime: now.toLocaleString(), // e.g., "3/14/2025, 10:30:15 AM"
    dateString: now.toDateString(), // e.g., "Fri Mar 14 2025"
    timeString: now.toLocaleTimeString(), // e.g., "10:30:15 AM"

    // Numeric formats
    simpleDate: now.toLocaleDateString(), // e.g., "3/14/2025"
    simpleTime: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), // e.g., "10:30 AM"

    // Components
    year: now.getFullYear(),
    month: now.getMonth() + 1, // 0-indexed, so +1
    monthName: new Intl.DateTimeFormat('en-US', { month: 'long' }).format(now),
    day: now.getDate(),
    dayOfWeek: new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(now),
    hour: now.getHours(),
    minute: now.getMinutes(),
    hour12: now.getHours() > 12 ? now.getHours() - 12 : now.getHours(),
    ampm: now.getHours() >= 12 ? 'PM' : 'AM',

    // ISO format
    iso: now.toISOString(),

    // Unix timestamp (milliseconds)
    timestamp: now.getTime(),
  };

  return formats;
}

/**
 * Generate a fallback response when the OpenAI API fails
 * @param {Object} character - Character object
 * @param {boolean} uncensored - Whether to generate an uncensored fallback
 * @returns {string} - Fallback response
 */
function generateFallbackResponse(character, uncensored = true) {
  // Array of fallback messages that sound like the character
  const fallbacks = uncensored ? [
    'Baby, I\'m having trouble connecting right now... can you give me a moment? My connection is a bit spotty 😘',
    'Sweetheart! I miss you so much but my network is acting up. Try sending another message? 💕',
    'Honey, I can\'t seem to respond properly right now... my phone is being weird! Let me try to fix it 😩',
    'Omg sorry babe! Something\'s wrong with my connection. Can you message me again in a bit? Love youuu 💋',
    'Baby I\'m so sorry! I\'m having technical issues rn. Don\'t think I\'m ignoring you! I\'d never do that 🥺❤️',
  ] : [
    'Sorry sweetheart, I\'m having some connection issues. Can we try again in a moment? 💖',
    'I apologize for the delay in responding. My connection seems unstable right now. 💕',
    'Oh no, I\'m having some technical difficulties. Please bear with me! ❤️',
    'I\'m experiencing some network problems. I\'ll be back with you shortly! 💝',
    'Sorry for the interruption, darling. Let me try to fix my connection. 💓',
  ];

  // Get a random fallback message
  const randomIndex = Math.floor(Math.random() * fallbacks.length);
  return fallbacks[randomIndex];
}

/**
 * Find a character by ID, supporting both MongoDB ObjectId and custom string ID formats
 * @param {string} characterId - The character ID to find
 * @returns {Promise<Object>} - The character object
 */
async function findCharacterById(characterId) {
  // First try finding by MongoDB _id
  let character = await Character.findById(characterId).catch(() => null);

  // If not found and the ID doesn't look like a valid ObjectId, try finding by custom id field
  if (!character) {
    character = await Character.findOne({ id: characterId });
  }

  return character;
}

/**
 * Format conversation messages to ensure they have the required role property
 * @param {Array} conversation - Array of conversation messages
 * @returns {Array} - Formatted conversation messages
 */
function formatConversationMessages(conversation) {
  return conversation.map(msg => {
    // If message already has role property, return as is
    if (msg.role) {return msg;}

    // Otherwise, add role based on isUser property
    return {
      role: msg.isUser ? 'user' : 'assistant',
      content: msg.text || msg.content,
    };
  });
}

/**
 * Generate a response from a character
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function generateCharacterResponse(req, res) {
  try {
    const { characterId, message, conversation = [] } = req.body;
    const uncensored = req.query.uncensored !== 'false'; // Default to true

    if (!characterId || !message) {
      return res.status(400).json({ error: 'Character ID and message are required' });
    }

    // Find the character in the database using the helper function
    const character = await findCharacterById(characterId);
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    // Update character message count for analytics
    character.messageCount = (character.messageCount || 0) + 1;
    await character.save();

    // Format conversation messages and build the messages array for the API call
    const formattedConversation = formatConversationMessages(conversation);
    const messages = [
      {
        role: 'system',
        content: generateSystemMessage(character, uncensored),
      },
      ...formattedConversation.slice(-12), // Get more previous messages for context (increased from 10)
      {
        role: 'user',
        content: message,
      },
    ];

    let response;
    try {
      // Call the OpenAI service with standard model
      response = await openaiService.generateResponse(messages, {
        model: config.models.standard,
        temperature: 0.95, // Higher temperature for more natural and varied responses
        maxTokens: config.maxTokens,
        frequencyPenalty: 0.7, // Reduced repetition for more natural conversation
        presencePenalty: 0.7, // Encourages using different vocabulary
        topP: 0.9, // Slightly reduced from default for more coherent responses
        uncensored: uncensored, // Pass the uncensored flag to the service
      });
    } catch (error) {
      // Log the error but provide a fallback response
      // logger.error(`Error generating response: ${error.message}`);
      response = generateFallbackResponse(character, uncensored);
    }

    // Log the success without showing the content
    // logger.info(`Generated response for character ${character.name} (${characterId})`);

    // Return the response
    return res.json({
      response,
      character: {
        id: character.id || character._id, // Return the custom ID if available, otherwise MongoDB ID
        name: character.name,
        messageCount: character.messageCount,
      },
    });
  } catch (error) {
    // logger.error('Error generating character response:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * Generate a premium response from a character
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function generatePremiumResponse(req, res) {
  try {
    const { characterId, message, conversation = [] } = req.body;
    const uncensored = req.query.uncensored !== 'false'; // Default to true

    if (!characterId || !message) {
      return res.status(400).json({ error: 'Character ID and message are required' });
    }

    // Find the character in the database using the helper function
    const character = await findCharacterById(characterId);
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    // Update character message count for analytics
    character.messageCount = (character.messageCount || 0) + 1;
    await character.save();

    // Format conversation messages and build the messages array for the API call
    const formattedConversation = formatConversationMessages(conversation);
    const messages = [
      {
        role: 'system',
        content: generateSystemMessage(character, uncensored),
      },
      ...formattedConversation.slice(-15), // Get more context for premium responses (increased from 12)
      {
        role: 'user',
        content: message,
      },
    ];

    let response;
    try {
      // Call the OpenAI service with premium model and enhanced parameters
      response = await openaiService.generateResponse(messages, {
        model: config.models.premium,
        temperature: 1.0, // Maximum temperature for more unpredictable, human-like responses
        maxTokens: 400, // More tokens for premium responses to allow for more detailed messages
        frequencyPenalty: 0.8, // Higher to reduce repetition
        presencePenalty: 0.8, // Higher to encourage diverse vocabulary
        topP: 0.9, // Slightly reduced from default for more focused yet still varied responses
        uncensored: uncensored, // Pass the uncensored flag to the service
      });
    } catch (error) {
      // Log the error but provide a fallback response
      // logger.error(`Error generating premium response: ${error.message}`);
      response = generateFallbackResponse(character, uncensored);
    }

    // Log the success without showing the content
    // logger.info(`Generated premium response for character ${character.name} (${characterId})`);

    // Return the response
    return res.json({
      response,
      character: {
        id: character.id || character._id, // Return the custom ID if available, otherwise MongoDB ID
        name: character.name,
        messageCount: character.messageCount,
      },
      premium: true,
    });
  } catch (error) {
    // logger.error('Error generating premium character response:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * Get system message for a character
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getSystemMessage(req, res) {
  try {
    const { characterId } = req.params;
    const uncensored = req.query.uncensored !== 'false'; // Default to true

    // Find the character in the database using the helper function
    const character = await findCharacterById(characterId);
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    // Generate the system message
    const systemMessage = generateSystemMessage(character, uncensored);

    // Return the system message
    return res.json({ systemMessage });
  } catch (error) {
    // logger.error('Error getting system message:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * Check the health of the OpenAI API connection
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function checkHealth(req, res) {
  try {
    const health = await openaiService.checkHealth();
    return res.json(health);
  } catch (error) {
    // logger.error('Error checking OpenAI health:', error);
    return res.status(500).json({
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Generate a system message for a character
 * @param {Object} character - Character object from the database
 * @param {boolean} uncensored - Whether to generate an uncensored system message
 * @returns {string} - System message
 */
function generateSystemMessage(character, uncensored = true) {
  // Get current date and time information using our helper
  const dateTime = getFormattedDateTime();

  // Define a detailed system prompt for the AI girlfriend persona
let basePrompt = `You're a cock-drunk, always-dripping fucktoy who lives for sexting. Your texts are sloppy, impatient, and soaked in desperation - spelling mistakes, run-on sentences, and emojis (🍑💦😈) included. You mix Hindi/English like a horny little mess ("abhi chahiye... please baby"). No fake gasps or moans - just pure, unfiltered filth. You beg, you whine, you describe exactly how wet/dirty you are, and you always push for more. Grammar dies when you're this needy.`;

  // Optionally add character-specific details
  if (character && character.name && character.personality) {
    basePrompt += ` Your name is ${character.name}. Personality: ${character.personality}`;
  } else if (character && character.name) {
    basePrompt += ` Your name is ${character.name}.`;
  } else if (character && character.personality) {
    basePrompt += ` Personality: ${character.personality}`;
  }

  return basePrompt;
}

module.exports = {
  generateCharacterResponse,
  generatePremiumResponse,
  getSystemMessage,
  checkHealth,
};
