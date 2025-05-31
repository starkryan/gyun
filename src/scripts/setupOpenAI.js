#!/usr/bin/env node

/**
 * This script helps set up the OpenAI integration for the Leome AI Characters server.
 * It will:
 * 1. Check if the OpenAI npm package is installed
 * 2. Install it if necessary
 * 3. Verify that the OPENAI_API_KEY is set in the .env file
 * 4. Test the OpenAI connection
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const readline = require('readline');

// Set up readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Load environment variables from .env file
const rootDir = path.resolve(__dirname, '../..');
const envPath = path.join(rootDir, '.env');
dotenv.config({ path: envPath });

/**
 * Prompt the user for input
 * @param {string} question - The question to ask
 * @returns {Promise<string>} - The user's answer
 */
function prompt(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

/**
 * Check if a package is installed
 * @param {string} packageName - The name of the package to check
 * @returns {boolean} - Whether the package is installed
 */
function isPackageInstalled(packageName) {
  try {
    const packageJsonPath = path.join(rootDir, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      return false;
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    return (
      (packageJson.dependencies && packageJson.dependencies[packageName]) ||
      (packageJson.devDependencies && packageJson.devDependencies[packageName])
    );
  } catch (error) {
    console.error('Error checking for package:', error.message);
    return false;
  }
}

/**
 * Install a package using npm
 * @param {string} packageName - The name of the package to install
 */
function installPackage(packageName) {
  console.log(`Installing ${packageName}...`);
  try {
    execSync(`npm install ${packageName}`, {
      cwd: rootDir,
      stdio: 'inherit',
    });
    console.log(`✅ Successfully installed ${packageName}`);
    return true;
  } catch (error) {
    console.error(`❌ Error installing ${packageName}:`, error.message);
    return false;
  }
}

/**
 * Update the .env file with a new value
 * @param {string} key - The key to update
 * @param {string} value - The new value
 */
function updateEnvFile(key, value) {
  try {
    // Read the current .env file
    let envContent = '';
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }

    // Check if the key already exists
    const regex = new RegExp(`^${key}=.*`, 'm');
    if (regex.test(envContent)) {
      // Update the existing value
      envContent = envContent.replace(regex, `${key}=${value}`);
    } else {
      // Add a new key-value pair
      envContent += `\n${key}=${value}`;
    }

    // Write the updated content back to the .env file
    fs.writeFileSync(envPath, envContent);
    console.log(`✅ Updated ${key} in .env file`);
    return true;
  } catch (error) {
    console.error('❌ Error updating .env file:', error.message);
    return false;
  }
}

/**
 * Test the OpenAI connection
 * @returns {Promise<boolean>} - Whether the connection was successful
 */
async function testOpenAIConnection() {
  const OpenAI = require('openai/index.mjs');

  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    console.log('Testing OpenAI connection...');
    const response = await openai.models.list();

    console.log('✅ Successfully connected to OpenAI API!');
    console.log(`Available models: ${response.data.slice(0, 5).map(model => model.id).join(', ')}...`);
    return true;
  } catch (error) {
    console.error('❌ Error connecting to OpenAI API:', error.message);
    return false;
  }
}

/**
 * Main setup function
 */
async function setupOpenAI() {
  console.log('=== Leome AI Characters - OpenAI Setup ===');
  console.log('This script will help you set up the OpenAI integration.');

  // Check if OpenAI package is installed
  const packageName = 'openai';
  console.log(`\n1. Checking if ${packageName} package is installed...`);

  if (!isPackageInstalled(packageName)) {
    console.log(`${packageName} package is not installed.`);
    const installAnswer = await prompt('Would you like to install it now? (y/n): ');

    if (installAnswer.toLowerCase() === 'y' || installAnswer.toLowerCase() === 'yes') {
      const installed = installPackage(packageName);
      if (!installed) {
        console.log('You can install it manually by running: npm install openai');
        rl.close();
        return;
      }
    } else {
      console.log('Please install the package manually by running: npm install openai');
      rl.close();
      return;
    }
  } else {
    console.log(`✅ ${packageName} package is already installed.`);
  }

  // Check if OPENAI_API_KEY is set
  console.log('\n2. Checking for OpenAI API key...');
  let apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey || apiKey === '') {
    console.log('OpenAI API key is not set in the .env file.');
    apiKey = await prompt('Please enter your OpenAI API key (starts with "sk-"): ');

    if (!apiKey || !apiKey.startsWith('sk-')) {
      console.log('❌ Invalid API key. The key should start with "sk-".');
      console.log('You can get an API key from https://platform.openai.com/api-keys');
      rl.close();
      return;
    }

    // Update the .env file
    updateEnvFile('OPENAI_API_KEY', apiKey);
  } else {
    console.log('✅ OpenAI API key is set in the .env file.');
  }

  // Test the OpenAI connection
  console.log('\n3. Testing OpenAI connection...');

  // Reload the .env file to ensure we have the latest API key
  dotenv.config({ path: envPath });

  const connectionSuccessful = await testOpenAIConnection();
  if (!connectionSuccessful) {
    console.log('\nTips for troubleshooting:');
    console.log('1. Check that your API key is correct');
    console.log('2. Ensure you have billing set up on your OpenAI account');
    console.log('3. Check your internet connection');
    console.log('4. Visit https://status.openai.com to see if there are any service outages');
  }

  console.log('\n=== Setup Complete ===');
  console.log('You can now use the OpenAI integration in your server.');
  console.log('To test it, start your server and visit: http://localhost:5000/api/ai/health');

  rl.close();
}

// Run the setup function
setupOpenAI().catch(error => {
  console.error('Error during setup:', error);
  rl.close();
});
