/**
 * Test Bunny.net with curl
 * This script uses the node child_process to run curl commands to test Bunny.net directly
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const bunnyConfig = require('../config/bunnyConfig');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Extract configuration
const STORAGE_ZONE = bunnyConfig.storageZoneName;
const REGION = bunnyConfig.region;
const API_KEY = process.env.BUNNY_API_KEY;
const BASE_URL = 'storage.bunnycdn.com';
const HOSTNAME = REGION ? `${REGION}.${BASE_URL}` : BASE_URL;

// Create a test file
const TEST_FILE_PATH = path.join(__dirname, 'test-file.txt');
const TEST_FILE_CONTENT = 'This is a test file for Bunny.net upload.';

console.log('=== Bunny.net Curl Test ===');
console.log('Configuration:');
console.log(`Storage Zone: ${STORAGE_ZONE}`);
console.log(`API Key (masked): ${API_KEY ? API_KEY.substring(0, 5) + '...' + API_KEY.substring(API_KEY.length - 4) : 'Not found'}`);
console.log(`Region: ${REGION || 'Default'}`);
console.log(`Hostname: ${HOSTNAME}`);
console.log('\nCreating test file...');

// Write test file
fs.writeFileSync(TEST_FILE_PATH, TEST_FILE_CONTENT);

// Generate a unique filename for the upload
const FILENAME = `test-${Date.now()}.txt`;
const FULL_URL = `https://${HOSTNAME}/${STORAGE_ZONE}/${FILENAME}`;

console.log(`Uploading to: ${FULL_URL}`);

// Format the curl command to upload the file
const curlCommand = `curl --request PUT \\
  --url "${FULL_URL}" \\
  --header "AccessKey: ${API_KEY}" \\
  --header "Content-Type: application/octet-stream" \\
  --header "accept: application/json" \\
  --data-binary @${TEST_FILE_PATH} \\
  -v`;

// Display the curl command (without the full API key)
const sanitizedCommand = curlCommand.replace(API_KEY, API_KEY.substring(0, 5) + '...' + API_KEY.substring(API_KEY.length - 4));
console.log('\nExecuting curl command:');
console.log(sanitizedCommand);

// Execute the curl command
exec(curlCommand, (error, stdout, stderr) => {
  console.log('\n--- Response ---');

  if (error) {
    console.error(`Error: ${error.message}`);
    console.log('\nCurl stderr output:');
    console.log(stderr);
  }

  if (stdout) {
    console.log('Curl stdout:');
    console.log(stdout);
  }

  // Test file URL access
  console.log('\nTesting file access...');
  const cdnUrl = `${bunnyConfig.cdnBaseUrl}/${FILENAME}`;
  console.log(`CDN URL: ${cdnUrl}`);

  const curlGetCommand = `curl -I "${cdnUrl}"`;
  exec(curlGetCommand, (getError, getStdout, getStderr) => {
    console.log('\n--- CDN Access Response ---');
    if (getError) {
      console.error(`Error: ${getError.message}`);
    }
    if (getStdout) {
      console.log(getStdout);
    }
    if (getStderr) {
      console.log('Stderr:', getStderr);
    }

    // Fix the issue with the API key format
    console.log('\n=== Troubleshooting ===');

    // Check if API key contains malformed hyphens
    if (API_KEY && API_KEY.includes('a')) {
      console.log('⚠️ WARNING: Your API key appears to have formatting issues.');
      console.log('The key may have improper hyphens or formatting errors.');
      console.log('Please ensure it matches the format shown in the Bunny.net dashboard.');

      // Suggest fixed API key format
      const fixedKey = API_KEY.replace(/([0-9a-f]+)a([0-9a-f]+)/, '$1-$2');
      console.log('\nTry updating your .env file with this corrected API key:');
      console.log(`BUNNY_API_KEY=${fixedKey}`);
    }

    // Clean up test file
    fs.unlinkSync(TEST_FILE_PATH);
    console.log('\nTest file removed.');
  });
});
