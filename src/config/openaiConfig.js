const dotenv = require('dotenv');
dotenv.config();

// DeepSeek API configuration
module.exports = {
  // API key from .env file
  apiKey: process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY,

  // Default model to use
  defaultModel: 'deepseek-chat',

  // Alternative models available
  models: {
    standard: 'deepseek-chat',
    premium: 'deepseek-chat',
    creative: 'deepseek-chat',
    efficient: 'deepseek-chat',
  },

  // Max tokens for responses
  maxTokens: 350, // Increased for more detailed and natural responses

  // Temperature setting (higher values mean more creative responses)
  temperature: 1.5, // Maximum for more unpredictable and human-like responses

  // Top_p parameter for more authentic text (default is 1.0)
  topP: 0.95, // Slightly reduced for more focused outputs while still maintaining variety

  // Penalty for repeating the same content
  frequencyPenalty: 0.7, // Increased to reduce repetitive language

  // Penalty for using tokens that have already appeared
  presencePenalty: 0.7, // Increased to encourage more diverse vocabulary and phrases

  // Base URL for DeepSeek API
  baseUrl: 'https://api.deepseek.com',

  // API request headers to avoid content filtering when needed
  requestHeaders: {
    // No content filtering for uncensored mode
    uncensored: {
      'Content-Type': 'application/json',
    },
    // Default headers for censored mode
    default: {
      'Content-Type': 'application/json',
    },
  },

  // Helper function to validate API key
  isValidApiKey: (key) => {
    return key && key.length > 20;
  },
};
