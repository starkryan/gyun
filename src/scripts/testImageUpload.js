/**
 * Test image upload to Bunny.net
 *
 * This script attempts to upload a test image to Bunny.net using our service
 * and verifies the entire process works correctly.
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const sharp = require('sharp');
const bunnyStorage = require('../services/bunnyStorageService');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Create a test image (1x1 pixel transparent PNG)
async function createTestImage() {
  // Create a 100x100 test image with solid color
  const width = 100;
  const height = 100;
  const testImagePath = path.join(__dirname, 'test-image.png');

  console.log('Creating test image...');

  // Create a simple colored square
  const testImageBuffer = await sharp({
    create: {
      width: width,
      height: height,
      channels: 4,
      background: { r: 255, g: 0, b: 0, alpha: 1 },
    },
  })
  .png()
  .toBuffer();

  fs.writeFileSync(testImagePath, testImageBuffer);
  console.log(`Test image created at: ${testImagePath}`);

  return testImagePath;
}

// Main test function
async function testImageUpload() {
  console.log('=== Testing Image Upload to Bunny.net ===');
  console.log('Storage Zone:', bunnyStorage.storageZoneName);
  console.log('API Key:', bunnyStorage.storageApiKey.substring(0, 5) + '...');

  try {
    // Create test image
    const testImagePath = await createTestImage();

    // Generate a unique ID for testing
    const testId = `test-${Date.now()}`;

    // Test profile image upload
    console.log('\n--- Testing profile image upload ---');
    const profileUrl = await bunnyStorage.processAndUploadCharacterImage(
      testImagePath,
      testId,
      false,
      { width: 400, height: 400 }
    );

    console.log('✅ Profile image upload successful!');
    console.log('Profile URL:', profileUrl);

    // Test background image upload with different settings
    console.log('\n--- Testing background image upload ---');
    const backgroundUrl = await bunnyStorage.processAndUploadCharacterImage(
      testImagePath,
      testId,
      true,
      { width: 1200, height: 800 }
    );

    console.log('✅ Background image upload successful!');
    console.log('Background URL:', backgroundUrl);

    // Clean up test image
    fs.unlinkSync(testImagePath);
    console.log('\nTest image removed.');

    console.log('\n=== Test Results ===');
    console.log('✅ All tests passed!');
    console.log('Profile image:', profileUrl);
    console.log('Background image:', backgroundUrl);
    console.log('\nYou can verify these images by opening the URLs in your browser.');

  } catch (error) {
    console.error('❌ Test failed:', error.message);

    // Provide troubleshooting help
    console.log('\n=== Troubleshooting ===');
    console.log('1. Check if your Bunny.net API key is correct (in .env file)');
    console.log('2. Verify the storage zone name is correct (in bunnyConfig.js)');
    console.log('3. Ensure your Bunny.net account has proper permissions');
    console.log('4. Check if your network allows connections to Bunny.net');

    // Cleanup
    try {
      const testImagePath = path.join(__dirname, 'test-image.png');
      if (fs.existsSync(testImagePath)) {
        fs.unlinkSync(testImagePath);
        console.log('\nTest image removed.');
      }
    } catch (err) {
      console.log('Error cleaning up:', err.message);
    }
  }
}

// Run the test
testImageUpload();
