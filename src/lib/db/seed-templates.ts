/**
 * Seed Industry Templates
 *
 * Run this script to populate the database with default industry templates.
 * These templates provide conservative buffers and pricing defaults for Tier 1 users.
 *
 * Usage:
 *   npx tsx src/lib/db/seed-templates.ts
 */

import * as dotenv from 'dotenv';

// Load environment variables from .env file BEFORE any other imports
dotenv.config({ path: '.env' });

// Verify DATABASE_URL is loaded
if (!process.env.DATABASE_URL) {
  console.error('❌ ERROR: DATABASE_URL not found in environment variables');
  console.error('Please ensure .env file exists with DATABASE_URL set');
  process.exit(1);
}

import { db } from './index';
import { industryTemplates } from './schema';
import { getAllTemplatesForSeeding } from '../pricing/industry-templates';
import { eq } from 'drizzle-orm';

async function seedIndustryTemplates() {
  console.log('🌱 Seeding industry templates...\n');
  console.log(`Database: ${process.env.DATABASE_URL?.substring(0, 50)}...\n`);

  const templates = getAllTemplatesForSeeding();

  for (const template of templates) {
    try {
      // Check if template already exists
      const existing = await db
        .select()
        .from(industryTemplates)
        .where(eq(industryTemplates.industry, template.industry))
        .limit(1);

      if (existing.length > 0) {
        // Update existing template
        await db
          .update(industryTemplates)
          .set(template)
          .where(eq(industryTemplates.industry, template.industry));

        console.log(`✓ Updated: ${template.industry}`);
      } else {
        // Insert new template
        await db.insert(industryTemplates).values(template);
        console.log(`✓ Created: ${template.industry}`);
      }
    } catch (error) {
      console.error(`✗ Error seeding ${template.industry}:`, error);
    }
  }

  console.log('\n✅ Industry templates seeded successfully!');
}

// Run if called directly
if (require.main === module) {
  seedIndustryTemplates()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Seed failed:', error);
      process.exit(1);
    });
}

export { seedIndustryTemplates };
