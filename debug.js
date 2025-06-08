console.log('Starting debug script...');

// Try to load dependencies one by one
const dependencies = [
  'express',
  'mongoose',
  'cors',
  'dotenv',
  'openai',
  'cookie-parser',
];

dependencies.forEach(dep => {
  try {
    console.log(`Attempting to require '${dep}'...`);
    require(dep);
    console.log(`✅ Successfully loaded '${dep}'`);
  } catch (error) {
    console.error(`❌ Error loading '${dep}':`, error.message);
  }
});

console.log('\nChecking for critical environment variables:');
console.log('- MONGODB_URI:', process.env.MONGODB_URI ? '✅ Set' : '❌ Not set');
console.log('- OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? '✅ Set' : '❌ Not set');
console.log('- PORT:', process.env.PORT ? `✅ Set to ${process.env.PORT}` : '❌ Not set (will use default 5000)');

console.log('\nDebug script completed.');
