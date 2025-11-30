/**
 * Verify database setup
 */

const dotenv = require('dotenv');
const path = require('path');

// Load .env
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const { neon } = require('@neondatabase/serverless');

async function verifyDatabase() {
  const sql = neon(process.env.DATABASE_URL);

  console.log('🔍 Verifying database setup...\n');

  try {
    // Check if new tier pricing tables exist
    console.log('Checking tables...');

    const tables = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `;

    console.log('\n✓ Tables found:');
    tables.forEach(t => console.log(`  - ${t.table_name}`));

    // Check industry templates
    console.log('\n📊 Industry Templates:');
    const templates = await sql`SELECT industry, simple_buffer, moderate_buffer, complex_buffer FROM industry_templates ORDER BY industry`;

    if (templates.length === 0) {
      console.log('  ⚠️  No industry templates found!');
    } else {
      templates.forEach(t => {
        console.log(`  ✓ ${t.industry}: ${(parseFloat(t.simple_buffer) * 100).toFixed(0)}%-${(parseFloat(t.complex_buffer) * 100).toFixed(0)}% buffers`);
      });
    }

    // Check users table structure
    console.log('\n👤 Users table columns:');
    const userCols = await sql`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'users'
      AND column_name IN ('current_tier', 'projects_completed', 'pricing_accuracy', 'hourly_rate', 'industry')
      ORDER BY column_name;
    `;

    if (userCols.length === 0) {
      console.log('  ⚠️  Tier pricing columns not found in users table!');
    } else {
      userCols.forEach(c => console.log(`  ✓ ${c.column_name} (${c.data_type})`));
    }

    // Check requests table structure
    console.log('\n📝 Requests table buffer columns:');
    const requestCols = await sql`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'requests'
      AND column_name IN ('buffer_percentage', 'buffer_amount', 'buffer_reasoning', 'tier_at_quote')
      ORDER BY column_name;
    `;

    if (requestCols.length === 0) {
      console.log('  ⚠️  Buffer tracking columns not found in requests table!');
    } else {
      requestCols.forEach(c => console.log(`  ✓ ${c.column_name} (${c.data_type})`));
    }

    console.log('\n✅ Database verification complete!');
    console.log('\nDatabase is ready for tier-based pricing system.');

  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    process.exit(1);
  }
}

verifyDatabase();
