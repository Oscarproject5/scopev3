/**
 * Seed wrapper script - loads .env before running TypeScript seed
 */

const dotenv = require('dotenv');
const { execSync } = require('child_process');
const path = require('path');

// Load .env file
const envPath = path.join(__dirname, '..', '.env');
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.error('❌ Error loading .env file:', result.error);
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in .env file');
  process.exit(1);
}

console.log('✓ Environment loaded from .env');
console.log(`✓ Database: ${process.env.DATABASE_URL.substring(0, 50)}...\n`);

// Run the TypeScript seed script with environment variables
try {
  execSync('npx tsx src/lib/db/seed-templates.ts', {
    cwd: path.join(__dirname, '..'),
    env: process.env,
    stdio: 'inherit'
  });
} catch (error) {
  console.error('Seed script failed:', error.message);
  process.exit(1);
}
