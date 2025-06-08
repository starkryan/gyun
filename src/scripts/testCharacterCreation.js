/**
 * Test Character Creation API
 *
 * This script tests the entire character creation process
 * including image uploads to Bunny.net
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
const sharp = require('sharp');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Server URL
const SERVER_URL = 'http://localhost:5000';

// Generate a test image
async function createTestImage(filename, color) {
  const width = 400;
  const height = 400;
  const testImagePath = path.join(__dirname, filename);

  console.log(`Creating test image: ${filename}`);

  // Create a simple colored square
  const testImageBuffer = await sharp({
    create: {
      width: width,
      height: height,
      channels: 4,
      background: color || { r: 255, g: 0, b: 0, alpha: 1 },
    },
  })
  .png()
  .toBuffer();

  fs.writeFileSync(testImagePath, testImageBuffer);
  console.log(`Test image created at: ${testImagePath}`);

  return testImagePath;
}

// Test character creation
async function testCharacterCreation() {
  try {
    console.log('=== Testing Character Creation API ===');

    // Create test images
    const profileImagePath = await createTestImage('test-profile.png', { r: 0, g: 100, b: 200, alpha: 1 });
    const backgroundImagePath = await createTestImage('test-background.png', { r: 200, g: 100, b: 50, alpha: 1 });

    // Create form data
    const formData = new FormData();

    // Add character fields
    formData.append('name', 'Test Character');
    formData.append('description', 'This is a test character created by script');
    formData.append('personality', 'Friendly, helpful, and very technical');
    formData.append('age', '25');
    formData.append('location', 'Test Land');
    formData.append('responseTime', '< 1 min');
    formData.append('accentColor', '#4287f5');
    formData.append('textColor', '#ffffff');
    formData.append('traits', JSON.stringify(['Technical', 'Friendly', 'Precise']));
    formData.append('interests', JSON.stringify(['Coding', 'Testing', 'Debugging']));

    // Add image files
    formData.append('image', fs.createReadStream(profileImagePath));
    formData.append('backgroundImage', fs.createReadStream(backgroundImagePath));

    console.log('Sending character creation request...');

    // Make API request
    const response = await axios.post(`${SERVER_URL}/api/characters`, formData, {
      headers: {
        ...formData.getHeaders(),
      },
    });

    console.log('\n=== Character Creation Response ===');
    console.log('Status:', response.status, response.statusText);
    console.log('Character ID:', response.data.id);
    console.log('Profile Image URL:', response.data.image.uri);
    console.log('Background Image URL:', response.data.backgroundImage.uri);

    // Verify the images are accessible
    console.log('\nVerifying image URLs...');

    const profileCheck = await axios.head(response.data.image.uri);
    console.log(`Profile image check: ${profileCheck.status} ${profileCheck.statusText}`);

    const backgroundCheck = await axios.head(response.data.backgroundImage.uri);
    console.log(`Background image check: ${backgroundCheck.status} ${backgroundCheck.statusText}`);

    console.log('\n✅ Character creation test completed successfully!');

    // Clean up
    fs.unlinkSync(profileImagePath);
    fs.unlinkSync(backgroundImagePath);
    console.log('Test images cleaned up');

  } catch (error) {
    console.error('❌ Test failed:', error.message);

    if (error.response) {
      console.error('Response Status:', error.response.status);
      console.error('Response Data:', error.response.data);
    }

    // Clean up
    try {
      if (fs.existsSync(path.join(__dirname, 'test-profile.png'))) {
        fs.unlinkSync(path.join(__dirname, 'test-profile.png'));
      }
      if (fs.existsSync(path.join(__dirname, 'test-background.png'))) {
        fs.unlinkSync(path.join(__dirname, 'test-background.png'));
      }
      console.log('Test images cleaned up');
    } catch (err) {
      console.log('Error cleaning up:', err.message);
    }
  }
}

// Run the test
testCharacterCreation();
