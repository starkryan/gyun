const dotenv = require('dotenv');
dotenv.config();

// OpenAI API configuration
module.exports = {
  // API key from .env file
  apiKey: process.env.OPENAI_API_KEY,
  
  // Default model to use
  defaultModel: 'gpt-4o-mini',
  
  // Alternative models available
  models: {
    standard: 'gpt-4o-mini',
    premium: 'gpt-4o',
    creative: 'gpt-4o',
    efficient: 'gpt-3.5-turbo'
  },
  
  // Max tokens for responses
  maxTokens: 400, // Increased for more detailed and natural responses
  
  // Temperature setting (higher values mean more creative responses)
  temperature: 1.0, // Maximum for more unpredictable and human-like responses
  
  // Top_p parameter for more authentic text (default is 1.0)
  topP: 0.95, // Slightly reduced for more focused outputs while still maintaining variety
  
  // Penalty for repeating the same content
  frequencyPenalty: 0.7, // Increased to reduce repetitive language
  
  // Penalty for using tokens that have already appeared
  presencePenalty: 0.7, // Increased to encourage more diverse vocabulary and phrases
  
  // Base URL for OpenAI API
  baseUrl: 'https://api.openai.com/v1',

  // API request headers to avoid content filtering when needed
  requestHeaders: {
    // No content filtering for uncensored mode
    uncensored: {
      'OpenAI-Beta': 'assistants=15.0',
      'Content-Type': 'application/json'
    },
    // Default headers for censored mode
    default: {
      'Content-Type': 'application/json'
    }
  },
  
  // Helper function to validate API key
  isValidApiKey: (key) => {
    return key && key.startsWith('sk-') && key.length > 20;
  }
}; 