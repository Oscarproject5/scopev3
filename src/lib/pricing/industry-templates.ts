/**
 * Industry Templates Configuration
 *
 * These templates provide default pricing configurations for different industries.
 * Used for seeding the database with initial industry templates.
 */

import type { NewIndustryTemplate } from '@/lib/db/schema';

export interface IndustryConfig {
  industry: string;
  displayName: string;
  defaultOverhead: number;
  defaultProfitMargin: number;
  baseBuffer: number;
  simpleBuffer: number;
  moderateBuffer: number;
  complexBuffer: number;
  reasoning: string;
  complexityIndicators: {
    simple: string[];
    moderate: string[];
    complex: string[];
  };
  typicalHourlyRates: {
    min: number;
    max: number;
    median: number;
  };
}

export const INDUSTRY_TEMPLATES: Record<string, IndustryConfig> = {
  'software-development': {
    industry: 'software-development',
    displayName: 'Software Development',
    defaultOverhead: 0.20,
    defaultProfitMargin: 0.15,
    baseBuffer: 0.35,
    simpleBuffer: 0.25,
    moderateBuffer: 0.35,
    complexBuffer: 0.50,
    reasoning: 'Software projects have high hidden integration costs and scope creep. Technical debt, testing requirements, and edge cases are consistently underestimated.',
    complexityIndicators: {
      simple: [
        'bug fix', 'minor update', 'text change', 'css styling',
        'simple form', 'typo', 'ui tweak', 'quick fix'
      ],
      moderate: [
        'new feature', 'api integration', 'database', 'authentication',
        'form validation', 'search', 'filter', 'pagination', 'upload'
      ],
      complex: [
        'architecture', 'migration', 'refactor', 'real-time',
        'payment', 'security', 'performance', 'scalability',
        'third-party', 'webhook', 'cron', 'background job'
      ]
    },
    typicalHourlyRates: {
      min: 50,
      max: 200,
      median: 125
    }
  },

  'design-creative': {
    industry: 'design-creative',
    displayName: 'Design & Creative',
    defaultOverhead: 0.18,
    defaultProfitMargin: 0.15,
    baseBuffer: 0.40,
    simpleBuffer: 0.30,
    moderateBuffer: 0.40,
    complexBuffer: 0.55,
    reasoning: 'Revision cycles and stakeholder feedback create unpredictable scope expansion. "Just one more change" compounds quickly.',
    complexityIndicators: {
      simple: [
        'color change', 'resize', 'crop', 'export', 'file format',
        'minor edit', 'tweak', 'adjust', 'quick fix'
      ],
      moderate: [
        'logo', 'branding', 'layout', 'mockup', 'illustration',
        'icon set', 'social media', 'presentation', 'infographic'
      ],
      complex: [
        'campaign', 'brand strategy', 'multi-platform', 'motion graphics',
        'video', 'animation', 'interactive', 'stakeholder', 'multiple rounds'
      ]
    },
    typicalHourlyRates: {
      min: 50,
      max: 175,
      median: 100
    }
  },

  'construction-trades': {
    industry: 'construction-trades',
    displayName: 'Construction & Trades',
    defaultOverhead: 0.20,
    defaultProfitMargin: 0.15,
    baseBuffer: 0.25,
    simpleBuffer: 0.15,
    moderateBuffer: 0.25,
    complexBuffer: 0.40,
    reasoning: 'Material costs volatile, but labor estimates more predictable than software. Change orders average 10-25% of contract value.',
    complexityIndicators: {
      simple: [
        'repair', 'install', 'replace', 'patch', 'fix',
        'maintenance', 'inspection', 'cleanup'
      ],
      moderate: [
        'renovation', 'remodel', 'custom', 'build', 'upgrade',
        'electrical', 'plumbing', 'hvac', 'drywall', 'painting'
      ],
      complex: [
        'structural', 'addition', 'permit', 'code', 'foundation',
        'demolition', 'excavation', 'framing', 'load-bearing', 'engineering'
      ]
    },
    typicalHourlyRates: {
      min: 50,
      max: 150,
      median: 85
    }
  },

  'consulting-services': {
    industry: 'consulting-services',
    displayName: 'Consulting & Professional Services',
    defaultOverhead: 0.22,
    defaultProfitMargin: 0.18,
    baseBuffer: 0.30,
    simpleBuffer: 0.20,
    moderateBuffer: 0.30,
    complexBuffer: 0.45,
    reasoning: 'Scope creep through informal advice and expanded deliverables. "Quick question" emails add up.',
    complexityIndicators: {
      simple: [
        'review', 'audit', 'assessment', 'report', 'analysis',
        'recommendation', 'defined deliverable'
      ],
      moderate: [
        'strategy', 'research', 'market analysis', 'competitive analysis',
        'process improvement', 'advisory', 'multiple stakeholders'
      ],
      complex: [
        'transformation', 'implementation', 'change management',
        'multi-phase', 'ongoing', 'board level', 'c-suite', 'roadmap'
      ]
    },
    typicalHourlyRates: {
      min: 100,
      max: 350,
      median: 200
    }
  },

  'marketing-services': {
    industry: 'marketing-services',
    displayName: 'Marketing & Advertising',
    defaultOverhead: 0.20,
    defaultProfitMargin: 0.15,
    baseBuffer: 0.35,
    simpleBuffer: 0.25,
    moderateBuffer: 0.35,
    complexBuffer: 0.50,
    reasoning: 'Performance expectations and iteration cycles create scope pressure. "Try this version too" is common.',
    complexityIndicators: {
      simple: [
        'social post', 'email', 'ad copy', 'landing page',
        'blog post', 'single channel', 'one-time'
      ],
      moderate: [
        'campaign', 'content calendar', 'seo', 'email sequence',
        'multi-channel', 'analytics', 'a/b testing', 'optimization'
      ],
      complex: [
        'strategy', 'full funnel', 'automation', 'attribution',
        'ongoing management', 'performance marketing', 'brand positioning'
      ]
    },
    typicalHourlyRates: {
      min: 60,
      max: 200,
      median: 120
    }
  },

  'writing-content': {
    industry: 'writing-content',
    displayName: 'Writing & Content Creation',
    defaultOverhead: 0.15,
    defaultProfitMargin: 0.15,
    baseBuffer: 0.30,
    simpleBuffer: 0.20,
    moderateBuffer: 0.30,
    complexBuffer: 0.45,
    reasoning: 'Revision requests and "just a few more edits" expand scope. Research depth often underestimated.',
    complexityIndicators: {
      simple: [
        'blog post', 'article', 'social copy', 'product description',
        'email', 'simple content', 'editing'
      ],
      moderate: [
        'white paper', 'case study', 'ebook', 'guide',
        'landing page copy', 'sales copy', 'technical writing'
      ],
      complex: [
        'documentation', 'book', 'research paper', 'thought leadership',
        'ghostwriting', 'interview-based', 'multiple reviewers'
      ]
    },
    typicalHourlyRates: {
      min: 40,
      max: 150,
      median: 75
    }
  },

  'other': {
    industry: 'other',
    displayName: 'Other / General Freelance',
    defaultOverhead: 0.20,
    defaultProfitMargin: 0.15,
    baseBuffer: 0.35,
    simpleBuffer: 0.25,
    moderateBuffer: 0.35,
    complexBuffer: 0.50,
    reasoning: 'Conservative default for unspecified industries. Better to protect profit margins than undercharge.',
    complexityIndicators: {
      simple: ['simple', 'quick', 'minor', 'small', 'basic', 'straightforward'],
      moderate: ['moderate', 'standard', 'typical', 'normal', 'regular'],
      complex: ['complex', 'advanced', 'large', 'multi', 'comprehensive', 'detailed']
    },
    typicalHourlyRates: {
      min: 50,
      max: 200,
      median: 100
    }
  }
};

/**
 * Convert template to database insert format
 */
export function templateToInsert(template: IndustryConfig): NewIndustryTemplate {
  return {
    industry: template.industry,
    defaultOverhead: template.defaultOverhead.toString(),
    defaultProfitMargin: template.defaultProfitMargin.toString(),
    baseBuffer: template.baseBuffer.toString(),
    simpleBuffer: template.simpleBuffer.toString(),
    moderateBuffer: template.moderateBuffer.toString(),
    complexBuffer: template.complexBuffer.toString(),
    complexityIndicators: template.complexityIndicators,
    typicalHourlyRates: template.typicalHourlyRates
  };
}

/**
 * Get all templates formatted for database seeding
 */
export function getAllTemplatesForSeeding(): NewIndustryTemplate[] {
  return Object.values(INDUSTRY_TEMPLATES).map(templateToInsert);
}
