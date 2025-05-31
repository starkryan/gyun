/**
 * Bunny.net Image Storage Configuration Wizard
 *
 * This script helps set up your Bunny.net configuration for image storage.
 * It guides you through the necessary steps and updates your .env file.
 *
 * Uses Bunny.net only for image storage while keeping all other data in MongoDB.
 *
 * Usage: node src/scripts/configureBunny.js
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Function to prompt for input
function prompt(question) {
  return new Promise(resolve => {
    rl.question(question, answer => resolve(answer.trim()));
  });
}

// Path to .env file
const envPath = path.join(__dirname, '../../.env');

// Function to update .env file
function updateEnvFile(key, value) {
  if (!fs.existsSync(envPath)) {
    console.error('Error: .env file not found at', envPath);
    return false;
  }

  let envContent = fs.readFileSync(envPath, 'utf8');

  // Check if key already exists
  if (envContent.includes(`${key}=`)) {
    // Replace existing key
    envContent = envContent.replace(
      new RegExp(`${key}=.*`),
      `${key}=${value}`
    );
  } else {
    // Add new key
    envContent += `\n${key}=${value}`;
  }

  // Write updated content back to file
  fs.writeFileSync(envPath, envContent);
  return true;
}

// Function to update config file
function updateConfigFile(storageZone, cdnUrl) {
  const configPath = path.join(__dirname, '../config/bunnyConfig.js');

  if (!fs.existsSync(configPath)) {
    console.error('Error: bunnyConfig.js file not found at', configPath);
    return false;
  }

  let configContent = fs.readFileSync(configPath, 'utf8');

  // Update storage zone name
  configContent = configContent.replace(
    /storageZoneName: ['"].*['"]/,
    `storageZoneName: '${storageZone}'`
  );

  // Update CDN base URL
  configContent = configContent.replace(
    /cdnBaseUrl: ['"].*['"]/,
    `cdnBaseUrl: '${cdnUrl}'`
  );

  // Write updated content back to file
  fs.writeFileSync(configPath, configContent);
  return true;
}

// Main function
async function runWizard() {
  console.log('\n=== Bunny.net Image Storage Configuration Wizard ===\n');

  console.log('This wizard will help you set up Bunny.net for storing character images only.');
  console.log('All non-image character data will be stored in MongoDB.');
  console.log('You\'ll need your Bunny.net account and storage zone information.\n');

  console.log('Step 1: Storage API Key');
  console.log('------------------------');
  console.log('1. Log in to your Bunny.net dashboard: https://dash.bunny.net/');
  console.log('2. Go to "Storage" > Your Storage Zone > "FTP & API Access"');
  console.log('3. Copy the "Password/API Key"\n');

  const apiKey = await prompt('Enter your Bunny.net Storage API Key: ');

  if (!apiKey) {
    console.error('Error: API Key cannot be empty');
    process.exit(1);
  }

  console.log('\nStep 2: Storage Zone Information');
  console.log('-----------------------------');
  console.log('Now we need information about your Storage Zone\n');

  const storageZone = await prompt('Enter your Storage Zone name: ');

  if (!storageZone) {
    console.error('Error: Storage Zone name cannot be empty');
    process.exit(1);
  }

  const useCustomCdn = await prompt('Are you using a custom CDN URL? (y/n): ');

  let cdnUrl;
  if (useCustomCdn.toLowerCase() === 'y') {
    cdnUrl = await prompt('Enter your custom CDN URL (including https://): ');
  } else {
    cdnUrl = `https://${storageZone}.b-cdn.net`;
    console.log(`Using default CDN URL: ${cdnUrl}`);
  }

  // Update .env file
  console.log('\nUpdating .env file...');
  const envUpdated = updateEnvFile('BUNNY_API_KEY', apiKey);

  if (envUpdated) {
    console.log('✅ .env file updated successfully');
  } else {
    console.error('❌ Failed to update .env file');
  }

  // Update config file
  console.log('\nUpdating bunnyConfig.js file...');
  const configUpdated = updateConfigFile(storageZone, cdnUrl);

  if (configUpdated) {
    console.log('✅ bunnyConfig.js file updated successfully');
  } else {
    console.error('❌ Failed to update bunnyConfig.js file');
  }

  console.log('\n=== Configuration Complete ===\n');
  console.log('Your Bunny.net configuration has been updated.');
  console.log('To test the configuration, run: node src/scripts/testImageUpload.js');
  console.log('\nReminder: Only images will be stored in Bunny.net. All other character data remains in MongoDB.');

  rl.close();
}

// Run the wizard
runWizard().catch(err => {
  console.error('Error running configuration wizard:', err);
  rl.close();
  process.exit(1);
});
