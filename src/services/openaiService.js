/**
 * DeepSeek API Service
 *
 * Handles API calls to DeepSeek for AI-generated character responses
 * using the OpenAI compatible API
 */

let OpenAI;
(async () => {
  try {
    // Don't log that we're importing OpenAI
    const openaiModule = await import('openai');
    OpenAI = openaiModule.default;

    // Initialize the client after successful import
    initializeOpenAIClient();
  } catch (error) {
    console.error('Error importing AI module');
    // Provide a mock implementation to prevent crashes
    setupMockOpenAI();
  }
})();

// Function to setup mock OpenAI if import fails
function setupMockOpenAI() {
  console.warn('Using mock AI implementation');
  OpenAI = class MockOpenAI {
    constructor() {
      // No logging constructor creation
    }

    chat = {
      completions: {
        create: async () => {
          return {
            choices: [{
              message: {
                content: "I'm having trouble connecting right now. Please try again later.",
              },
            }],
            usage: {
              prompt_tokens: 0,
              completion_tokens: 0,
              total_tokens: 0,
            },
          };
        },
      },
    };

    models = {
      list: async () => {
        return {
          data: [],
        };
      },
    };

    images = {
      generate: async () => {
        return {
          data: [{
            url: 'https://placehold.co/600x400?text=Image+Generation+Failed',
          }],
        };
      },
    };
  };

  // Initialize the client with mock OpenAI
  initializeOpenAIClient();
}

// Try to load other dependencies with similar error handling
let logger;
try {
  logger = require('../utils/logger');
} catch (error) {
  console.error('Error loading logger:', error.message);
  // Create a simple logger if the real one fails to load
  logger = {
    error: console.error,
    warn: console.warn,
    info: console.info,
    debug: console.debug,
  };
}

let config;
try {
  config = require('../config/openaiConfig');
} catch (error) {
  console.error('Error loading config:', error.message);
  // Provide default configuration if loading fails
  config = {
    apiKey: process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY,
    defaultModel: 'deepseek-chat',
    maxTokens: 150,
    temperature: 0.7,
    topP: 1.0,
    frequencyPenalty: 0,
    presencePenalty: 0,
  };
}

// Create an instance of the OpenAI client with DeepSeek base URL
let openai;

function initializeOpenAIClient() {
  try {
    openai = new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY,
      baseURL: 'https://api.deepseek.com',
    });
    logger.info('AI client initialized');
  } catch (error) {
    logger.error('Failed to initialize AI client');
    // Create a mock client
    openai = {
      chat: {
        completions: {
          create: async () => {
            return {
              choices: [{
                message: {
                  content: "I'm having trouble connecting right now. Please try again later.",
                },
              }],
              usage: {
                prompt_tokens: 0,
                completion_tokens: 0,
                total_tokens: 0,
              },
            };
          },
        },
      },
      models: {
        list: async () => {
          return {
            data: [],
          };
        },
      },
      images: {
        generate: async () => {
          return {
            data: [{
              url: 'https://placehold.co/600x400?text=Image+Generation+Failed',
            }],
          };
        },
      },
    };
  }
}

/**
 * Message object for OpenAI API
 * @typedef {Object} Message
 * @property {'system'|'user'|'assistant'} role - The role of the message sender
 * @property {string} content - The content of the message
 */

/**
 * Character object (simplified from the frontend model)
 * @typedef {Object} Character
 * @property {string} id - Character ID
 * @property {string} name - Character name
 * @property {string} description - Character description
 * @property {string} personality - Character personality traits
 */

/**
 * OpenAI API response
 * @typedef {Object} OpenAIResponse
 * @property {string} id - Response ID
 * @property {string} object - Object type
 * @property {number} created - Creation timestamp
 * @property {string} model - Model used
 * @property {Array<Object>} choices - Response choices
 * @property {Object} usage - Token usage information
 */

/**
 * Mask sensitive content for logging
 * @param {string} content - Content to mask
 * @returns {string} - Masked content
 */
function maskSensitiveContent(content) {
  if (!content) {return '[empty]';}
  if (typeof content !== 'string') {return '[non-string content]';}

  // Return the first 10 characters followed by "..."
  if (content.length <= 10) {return content;}
  return content.substring(0, 10) + '...';
}

/**
 * Generate a response from OpenAI based on the provided messages and options
 * @param {Array} messages - The conversation messages array
 * @param {Object} options - Configuration options for the request
 * @returns {Promise<string>} The generated response
 */
async function generateResponse(messages, options = {}) {
  try {
    // Get the model from options or use the default
    const model = options.model || config.defaultModel;

    // Set up completion parameters
    const completionParams = {
      model: model,
      messages: messages,
      max_tokens: options.maxTokens || config.maxTokens,
      temperature: options.temperature || config.temperature,
      top_p: options.topP || config.topP,
      frequency_penalty: options.frequencyPenalty || config.frequencyPenalty,
      presence_penalty: options.presencePenalty || config.presencePenalty,
    };

    // No verbose API logging - just log that a request is being made
    logger.info('Making AI request');

    // Check if uncensored mode is enabled
    const useUncensoredMode = options.uncensored !== false; // Default to true

    // Apply the appropriate headers based on mode
    const headers = useUncensoredMode ? config.requestHeaders.uncensored : config.requestHeaders.default;

    // Make the API call to OpenAI with appropriate headers
    const completion = await openai.chat.completions.create(completionParams, { headers });

    // Only log minimal information - no token counts
    logger.info('AI request completed successfully');

    // Return the text of the first response
    return completion.choices[0].message.content;
  } catch (error) {
    logger.error('Error in AI request');

    // Re-throw the error to be handled by the caller
    throw error;
  }
}

/**
 * Check the health of the AI API connection
 * @returns {Promise<Object>} Health status information
 */
async function checkHealth() {
  try {
    // Simple request to test the API
    const response = await openai.models.list();

    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    logger.error('AI health check failed');

    return {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Get the list of available models
 * @returns {Promise<Array>} List of available models
 */
async function getAvailableModels() {
  try {
    const response = await openai.models.list();
    return response.data.map(model => ({
      id: model.id,
      created: model.created,
    }));
  } catch (error) {
    logger.error('Error fetching AI models');
    throw new Error('Failed to fetch available models');
  }
}

/**
 * Generate an image from the provided prompt
 * @param {string} prompt - The image description
 * @returns {Promise<string>} The URL of the generated image
 */
async function generateImage(prompt) {
  try {
    const response = await openai.images.generate({
      prompt: prompt,
      n: 1,
      size: '1024x1024',
      response_format: 'url',
    });

    return response.data[0].url;
  } catch (error) {
    logger.error('Error generating image');
    throw new Error('Failed to generate image');
  }
}

module.exports = {
  generateResponse,
  checkHealth,
  getAvailableModels,
  generateImage,
};
