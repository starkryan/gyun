/**
 * Test OpenAI Integration
 *
 * This script tests the OpenAI service to ensure it can generate
 * character responses properly.
 */

const openaiService = require('../services/openaiService');
const mongoose = require('mongoose');
const Character = require('../models/Character');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Test character (in case we can't connect to DB)
const testCharacter = {
  id: 'test-char-123',
  name: 'Sophia',
  description: 'Life coach and wellness expert. I\'ll help you achieve balance and personal growth.',
  personality: 'Supportive, nurturing, and wise',
  traits: ['Empathetic', 'Patient', 'Knowledgeable'],
  interests: ['Wellness', 'Meditation', 'Personal Development'],
};

// Test message
const testMessage = 'Hello! How are you today? I\'m feeling a bit stressed about work.';

// Test conversation history
const testConversation = [
  { role: 'user', content: 'Hi there! I\'m new here.' },
  { role: 'assistant', content: 'Hello darling! I\'m Sophia, so happy to meet you! How can I help you today? 💖' },
];

// Main test function
async function testOpenAI() {
  console.log('=== Testing OpenAI Integration ===');

  let mongoConnected = false;
  let realCharacter = null;

  // Try to connect to MongoDB
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
    });

    console.log('✅ Connected to MongoDB');
    mongoConnected = true;

    // Try to get a real character
    const characters = await Character.find().limit(1);
    if (characters.length > 0) {
      realCharacter = characters[0];
      console.log(`✅ Found character: ${realCharacter.name} (ID: ${realCharacter.id})`);
    } else {
      console.log('⚠️ No characters found in database, using test character');
    }
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error.message);
    console.log('⚠️ Continuing with test character');
  }

  try {
    // Use a real character if available, otherwise use test character
    const character = realCharacter || testCharacter;

    console.log(`\nGenerating response for character: ${character.name}`);
    console.log(`Message: "${testMessage}"`);

    // Test without conversation history
    console.log('\n--- Test 1: Generate response without history ---');
    const response1 = await openaiService.generateCharacterResponse(
      character,
      testMessage,
      []
    );

    console.log('\nResponse:');
    console.log(response1);

    // Test with conversation history
    console.log('\n--- Test 2: Generate response with history ---');
    const response2 = await openaiService.generateCharacterResponse(
      character,
      testMessage,
      testConversation
    );

    console.log('\nResponse:');
    console.log(response2);

    console.log('\n=== Test Results ===');
    console.log('✅ OpenAI integration is working!');

  } catch (error) {
    console.error('\n❌ OpenAI test failed:', error.message);

    // Troubleshooting help
    console.log('\n=== Troubleshooting ===');
    console.log('1. Check if your OpenAI API key is correct in .env file');
    console.log('2. Verify the OpenAI API is not experiencing outages');
    console.log('3. Make sure you have sufficient credits in your OpenAI account');
    console.log('4. Check if the API key has proper permissions');
  } finally {
    // Disconnect from MongoDB if connected
    if (mongoConnected) {
      console.log('\nDisconnecting from MongoDB...');
      await mongoose.disconnect();
      console.log('✅ Disconnected from MongoDB');
    }

    process.exit(0);
  }
}

// Run the test
testOpenAI();
