import { pgTable, text, timestamp, uuid, jsonb, integer, boolean, decimal } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Users table - Freelancers who use ScopePilot
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name'),
  image: text('image'),
  stripeAccountId: text('stripe_account_id'),
  stripeCustomerId: text('stripe_customer_id'),
  onboardingComplete: boolean('onboarding_complete').default(false),

  // Tier system for progressive intelligence
  currentTier: integer('current_tier').default(1), // 1-4
  projectsCompleted: integer('projects_completed').default(0),
  pricingAccuracy: decimal('pricing_accuracy', { precision: 5, scale: 2 }), // Percentage

  // Freelancer profile for pricing
  hourlyRate: decimal('hourly_rate', { precision: 10, scale: 2 }),
  industry: text('industry'), // software-development, design-creative, etc.
  overhead: decimal('overhead', { precision: 5, scale: 4 }).default('0.2000'), // 20%
  profitMargin: decimal('profit_margin', { precision: 5, scale: 4 }).default('0.1500'), // 15%

  // Custom buffer overrides (optional)
  customBuffers: jsonb('custom_buffers').$type<{
    simple?: number;
    moderate?: number;
    complex?: number;
  }>(),

  // Agentic pricing context fields
  location: text('location'), // e.g., "San Francisco, CA" or "London, UK"
  specializations: jsonb('specializations').$type<string[]>(), // e.g., ["React", "Next.js", "AWS"]
  typicalContractValue: decimal('typical_contract_value', { precision: 10, scale: 2 }),
  competitivePositioning: text('competitive_positioning').default('mid-market'), // budget, mid-market, premium

  // Company/Business branding for invoices and contracts
  companyName: text('company_name'),
  companyLogo: text('company_logo'), // URL to logo
  companyAddress: text('company_address'),
  companyEmail: text('company_email'),
  companyPhone: text('company_phone'),
  companyWebsite: text('company_website'),
  taxId: text('tax_id'), // For invoices (EIN, VAT, etc.)

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Projects - Each freelancer can have multiple projects/clients
export const projects = pgTable('projects', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(), // For public request links
  description: text('description'),
  clientName: text('client_name'),
  clientEmail: text('client_email'),
  isActive: boolean('is_active').default(true),
  requireApproval: boolean('require_approval').default(false), // Freelancer approves quotes first
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Project Rules - The "Rulebook" for each project
export const projectRules = pgTable('project_rules', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),

  // Extracted/configured rules
  hourlyRate: decimal('hourly_rate', { precision: 10, scale: 2 }),
  currency: text('currency').default('USD'),

  // Deliverables included in scope
  deliverables: jsonb('deliverables').$type<string[]>().default([]),

  // Revision limits
  revisionsIncluded: integer('revisions_included').default(2),
  revisionsUsed: integer('revisions_used').default(0),

  // Additional rules as structured data
  workingHours: jsonb('working_hours').$type<{ start: string; end: string; timezone: string }>(),
  excludedDays: jsonb('excluded_days').$type<string[]>().default([]), // e.g., ["Saturday", "Sunday"]

  // Free-form rules the AI should consider
  customRules: jsonb('custom_rules').$type<{ rule: string; description: string }[]>().default([]),

  // Original contract text for context
  contractText: text('contract_text'),
  contractFileName: text('contract_file_name'),

  // AI-generated summary of the rules
  rulesSummary: text('rules_summary'),

  // Agentic pricing context fields
  originalContractPrice: decimal('original_contract_price', { precision: 10, scale: 2 }),
  projectType: text('project_type'), // "website", "mobile app", "design", etc.
  clientLocation: text('client_location'),
  projectTimeline: text('project_timeline'), // "1 week", "1 month", "ongoing"

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Context Notes - Additional context for the AI
export const contextNotes = pgTable('context_notes', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Client Requests - Requests submitted through the intake portal
export const requests = pgTable('requests', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),

  // Client info
  clientName: text('client_name'),
  clientEmail: text('client_email'),

  // The request
  requestText: text('request_text').notNull(),

  // AI Analysis
  status: text('status').notNull().default('pending'), // pending, in_scope, out_of_scope, approved, declined, paid
  isInScope: boolean('is_in_scope'),

  // AI reasoning and pricing
  aiAnalysis: jsonb('ai_analysis').$type<{
    verdict: 'in_scope' | 'out_of_scope' | 'needs_clarification' | 'pending_review';
    reasoning: string;
    relevantRules: string[];
    estimatedHours?: number;
    suggestedPrice?: number;
    revisionCount?: string; // e.g., "Revision 2 of 3"
    confidence?: number;
    complexity?: 'simple' | 'moderate' | 'complex';
    clarificationQuestions?: Array<{
      id: string;
      question: string;
      type: 'text' | 'select' | 'multiselect';
      options?: string[];
    }>;
    clarificationAnswers?: Record<string, string>;
  }>(),

  // Agentic pricing transparency fields
  pricingReasoning: text('pricing_reasoning'), // Educational explanation of how price was calculated
  marketResearchData: jsonb('market_research_data').$type<{
    searchQueries: string[];
    rateRanges: { min: number; max: number; source?: string }[];
    marketInsights: string[];
    searchedAt: string;
  }>(),
  pricingContextUsed: jsonb('pricing_context_used').$type<{
    freelancerLocation?: string;
    freelancerSpecializations?: string[];
    freelancerPositioning?: string;
    projectType?: string;
    originalContractPrice?: number;
    clientLocation?: string;
    hourlyRate?: number;
  }>(),

  // Pricing breakdown (enhanced for buffer tracking)
  estimatedHours: decimal('estimated_hours', { precision: 10, scale: 2 }),
  laborCost: decimal('labor_cost', { precision: 10, scale: 2 }),
  overheadCost: decimal('overhead_cost', { precision: 10, scale: 2 }),
  profitAmount: decimal('profit_amount', { precision: 10, scale: 2 }),

  // Buffer tracking (CRITICAL for profit protection)
  baseSubtotal: decimal('base_subtotal', { precision: 10, scale: 2 }),
  bufferPercentage: decimal('buffer_percentage', { precision: 5, scale: 4 }),
  bufferAmount: decimal('buffer_amount', { precision: 10, scale: 2 }),
  bufferReasoning: text('buffer_reasoning'),
  tierAtQuote: integer('tier_at_quote').default(1),

  quotedPrice: decimal('quoted_price', { precision: 10, scale: 2 }),
  finalPrice: decimal('final_price', { precision: 10, scale: 2 }),

  // Payment
  stripePaymentIntentId: text('stripe_payment_intent_id'),
  paidAt: timestamp('paid_at'),

  // Approval workflow
  freelancerApproved: boolean('freelancer_approved'),
  freelancerApprovedAt: timestamp('freelancer_approved_at'),
  clientApproved: boolean('client_approved'),
  clientApprovedAt: timestamp('client_approved_at'),

  // Pricing feedback tracking (for learning)
  freelancerModifiedPrice: boolean('freelancer_modified_price').default(false),
  priceModificationReason: text('price_modification_reason'),
  pricingAccuracyScore: decimal('pricing_accuracy_score', { precision: 5, scale: 2 }), // 0-100%

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  projects: many(projects),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  user: one(users, {
    fields: [projects.userId],
    references: [users.id],
  }),
  rules: one(projectRules),
  requests: many(requests),
  contextNotes: many(contextNotes),
}));

export const projectRulesRelations = relations(projectRules, ({ one }) => ({
  project: one(projects, {
    fields: [projectRules.projectId],
    references: [projects.id],
  }),
}));

export const contextNotesRelations = relations(contextNotes, ({ one }) => ({
  project: one(projects, {
    fields: [contextNotes.projectId],
    references: [projects.id],
  }),
}));

export const requestsRelations = relations(requests, ({ one }) => ({
  project: one(projects, {
    fields: [requests.projectId],
    references: [projects.id],
  }),
  actualCost: one(actualCosts),
}));

// Industry Templates - Pre-configured defaults by industry
export const industryTemplates = pgTable('industry_templates', {
  id: uuid('id').defaultRandom().primaryKey(),
  industry: text('industry').notNull().unique(),

  // Default values
  defaultOverhead: decimal('default_overhead', { precision: 5, scale: 4 }).notNull(),
  defaultProfitMargin: decimal('default_profit_margin', { precision: 5, scale: 4 }).notNull(),

  // Buffer configuration
  baseBuffer: decimal('base_buffer', { precision: 5, scale: 4 }).notNull(),
  simpleBuffer: decimal('simple_buffer', { precision: 5, scale: 4 }).notNull(),
  moderateBuffer: decimal('moderate_buffer', { precision: 5, scale: 4 }).notNull(),
  complexBuffer: decimal('complex_buffer', { precision: 5, scale: 4 }).notNull(),

  // Complexity patterns for LLM classification
  complexityIndicators: jsonb('complexity_indicators').$type<{
    simple: string[];
    moderate: string[];
    complex: string[];
  }>(),

  // Typical rate ranges (for reference)
  typicalHourlyRates: jsonb('typical_hourly_rates').$type<{
    min: number;
    max: number;
    median: number;
  }>(),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Actual Costs - Track actual outcomes for learning
export const actualCosts = pgTable('actual_costs', {
  id: uuid('id').defaultRandom().primaryKey(),
  requestId: uuid('request_id').notNull().references(() => requests.id, { onDelete: 'cascade' }).unique(),

  // Actual outcomes
  actualHours: decimal('actual_hours', { precision: 10, scale: 2 }),
  actualLaborCost: decimal('actual_labor_cost', { precision: 10, scale: 2 }),
  actualMaterialCost: decimal('actual_material_cost', { precision: 10, scale: 2 }),
  actualTotalCost: decimal('actual_total_cost', { precision: 10, scale: 2 }).notNull(),

  // Variance analysis
  estimatedCost: decimal('estimated_cost', { precision: 10, scale: 2 }).notNull(),
  variance: decimal('variance', { precision: 10, scale: 4 }), // actual / estimated
  varianceReason: text('variance_reason'),

  // Buffer effectiveness
  wasBufferSufficient: boolean('was_buffer_sufficient'),
  bufferUtilization: decimal('buffer_utilization', { precision: 5, scale: 4 }), // % of buffer used

  completedAt: timestamp('completed_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Pricing Accuracy Log - Track accuracy over time
export const pricingAccuracyLogs = pgTable('pricing_accuracy_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

  // Snapshot at time of calculation
  projectsCompleted: integer('projects_completed').notNull(),
  tier: integer('tier').notNull(),

  // Accuracy metrics
  averageVariance: decimal('average_variance', { precision: 10, scale: 4 }),
  underestimateRate: decimal('underestimate_rate', { precision: 5, scale: 4 }),
  overestimateRate: decimal('overestimate_rate', { precision: 5, scale: 4 }),
  acceptanceRate: decimal('acceptance_rate', { precision: 5, scale: 4 }),

  // Buffer effectiveness
  bufferSufficiencyRate: decimal('buffer_sufficiency_rate', { precision: 5, scale: 4 }),

  calculatedAt: timestamp('calculated_at').defaultNow().notNull(),
});

// Document Uploads - For Tier 2 document extraction
export const documentUploads = pgTable('document_uploads', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

  // File metadata
  filename: text('filename').notNull(),
  fileType: text('file_type').notNull(),
  fileSize: integer('file_size').notNull(),
  storageUrl: text('storage_url').notNull(),

  // Extraction results
  extractedData: jsonb('extracted_data'),
  extractionConfidence: decimal('extraction_confidence', { precision: 5, scale: 4 }),

  // Association
  linkedProjectId: uuid('linked_project_id').references(() => projects.id, { onDelete: 'set null' }),

  uploadedAt: timestamp('uploaded_at').defaultNow().notNull(),
  processedAt: timestamp('processed_at'),
});

// Relations for new tables
export const actualCostsRelations = relations(actualCosts, ({ one }) => ({
  request: one(requests, {
    fields: [actualCosts.requestId],
    references: [requests.id],
  }),
}));

export const pricingAccuracyLogsRelations = relations(pricingAccuracyLogs, ({ one }) => ({
  user: one(users, {
    fields: [pricingAccuracyLogs.userId],
    references: [users.id],
  }),
}));

export const documentUploadsRelations = relations(documentUploads, ({ one }) => ({
  user: one(users, {
    fields: [documentUploads.userId],
    references: [users.id],
  }),
  linkedProject: one(projects, {
    fields: [documentUploads.linkedProjectId],
    references: [projects.id],
  }),
}));

// Types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type ProjectRules = typeof projectRules.$inferSelect;
export type NewProjectRules = typeof projectRules.$inferInsert;
export type Request = typeof requests.$inferSelect;
export type NewRequest = typeof requests.$inferInsert;
export type ContextNote = typeof contextNotes.$inferSelect;
export type IndustryTemplate = typeof industryTemplates.$inferSelect;
export type NewIndustryTemplate = typeof industryTemplates.$inferInsert;
export type ActualCost = typeof actualCosts.$inferSelect;
export type NewActualCost = typeof actualCosts.$inferInsert;
export type PricingAccuracyLog = typeof pricingAccuracyLogs.$inferSelect;
export type NewPricingAccuracyLog = typeof pricingAccuracyLogs.$inferInsert;
export type DocumentUpload = typeof documentUploads.$inferSelect;
export type NewDocumentUpload = typeof documentUploads.$inferInsert;
