import { pgTable, foreignKey, uuid, text, timestamp, integer, jsonb, numeric, unique, boolean } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const contextNotes = pgTable("context_notes", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	projectId: uuid("project_id").notNull(),
	content: text().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "context_notes_project_id_projects_id_fk"
		}).onDelete("cascade"),
]);

export const documentUploads = pgTable("document_uploads", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	filename: text().notNull(),
	fileType: text("file_type").notNull(),
	fileSize: integer("file_size").notNull(),
	storageUrl: text("storage_url").notNull(),
	extractedData: jsonb("extracted_data"),
	extractionConfidence: numeric("extraction_confidence", { precision: 5, scale:  4 }),
	linkedProjectId: uuid("linked_project_id"),
	uploadedAt: timestamp("uploaded_at", { mode: 'string' }).defaultNow().notNull(),
	processedAt: timestamp("processed_at", { mode: 'string' }),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "document_uploads_user_id_users_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.linkedProjectId],
			foreignColumns: [projects.id],
			name: "document_uploads_linked_project_id_projects_id_fk"
		}).onDelete("set null"),
]);

export const actualCosts = pgTable("actual_costs", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	requestId: uuid("request_id").notNull(),
	actualHours: numeric("actual_hours", { precision: 10, scale:  2 }),
	actualLaborCost: numeric("actual_labor_cost", { precision: 10, scale:  2 }),
	actualMaterialCost: numeric("actual_material_cost", { precision: 10, scale:  2 }),
	actualTotalCost: numeric("actual_total_cost", { precision: 10, scale:  2 }).notNull(),
	estimatedCost: numeric("estimated_cost", { precision: 10, scale:  2 }).notNull(),
	variance: numeric({ precision: 10, scale:  4 }),
	varianceReason: text("variance_reason"),
	wasBufferSufficient: boolean("was_buffer_sufficient"),
	bufferUtilization: numeric("buffer_utilization", { precision: 5, scale:  4 }),
	completedAt: timestamp("completed_at", { mode: 'string' }).defaultNow().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.requestId],
			foreignColumns: [requests.id],
			name: "actual_costs_request_id_requests_id_fk"
		}).onDelete("cascade"),
	unique("actual_costs_request_id_unique").on(table.requestId),
]);

export const industryTemplates = pgTable("industry_templates", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	industry: text().notNull(),
	defaultOverhead: numeric("default_overhead", { precision: 5, scale:  4 }).notNull(),
	defaultProfitMargin: numeric("default_profit_margin", { precision: 5, scale:  4 }).notNull(),
	baseBuffer: numeric("base_buffer", { precision: 5, scale:  4 }).notNull(),
	simpleBuffer: numeric("simple_buffer", { precision: 5, scale:  4 }).notNull(),
	moderateBuffer: numeric("moderate_buffer", { precision: 5, scale:  4 }).notNull(),
	complexBuffer: numeric("complex_buffer", { precision: 5, scale:  4 }).notNull(),
	complexityIndicators: jsonb("complexity_indicators"),
	typicalHourlyRates: jsonb("typical_hourly_rates"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("industry_templates_industry_unique").on(table.industry),
]);

export const users = pgTable("users", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	email: text().notNull(),
	name: text(),
	image: text(),
	stripeAccountId: text("stripe_account_id"),
	stripeCustomerId: text("stripe_customer_id"),
	onboardingComplete: boolean("onboarding_complete").default(false),
	currentTier: integer("current_tier").default(1),
	projectsCompleted: integer("projects_completed").default(0),
	pricingAccuracy: numeric("pricing_accuracy", { precision: 5, scale:  2 }),
	hourlyRate: numeric("hourly_rate", { precision: 10, scale:  2 }),
	industry: text(),
	overhead: numeric({ precision: 5, scale:  4 }).default('0.2000'),
	profitMargin: numeric("profit_margin", { precision: 5, scale:  4 }).default('0.1500'),
	customBuffers: jsonb("custom_buffers"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	location: text(),
	specializations: jsonb(),
	typicalContractValue: numeric("typical_contract_value", { precision: 10, scale:  2 }),
	competitivePositioning: text("competitive_positioning").default('mid-market'),
	companyName: text("company_name"),
	companyLogo: text("company_logo"),
	companyAddress: text("company_address"),
	companyEmail: text("company_email"),
	companyPhone: text("company_phone"),
	companyWebsite: text("company_website"),
	taxId: text("tax_id"),
}, (table) => [
	unique("users_email_unique").on(table.email),
]);

export const projects = pgTable("projects", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	name: text().notNull(),
	slug: text().notNull(),
	description: text(),
	clientName: text("client_name"),
	clientEmail: text("client_email"),
	isActive: boolean("is_active").default(true),
	requireApproval: boolean("require_approval").default(false),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "projects_user_id_users_id_fk"
		}).onDelete("cascade"),
	unique("projects_slug_unique").on(table.slug),
]);

export const projectRules = pgTable("project_rules", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	projectId: uuid("project_id").notNull(),
	hourlyRate: numeric("hourly_rate", { precision: 10, scale:  2 }),
	currency: text().default('USD'),
	deliverables: jsonb().default([]),
	revisionsIncluded: integer("revisions_included").default(2),
	revisionsUsed: integer("revisions_used").default(0),
	workingHours: jsonb("working_hours"),
	excludedDays: jsonb("excluded_days").default([]),
	customRules: jsonb("custom_rules").default([]),
	contractText: text("contract_text"),
	contractFileName: text("contract_file_name"),
	rulesSummary: text("rules_summary"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	originalContractPrice: numeric("original_contract_price", { precision: 10, scale:  2 }),
	projectType: text("project_type"),
	clientLocation: text("client_location"),
	projectTimeline: text("project_timeline"),
}, (table) => [
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "project_rules_project_id_projects_id_fk"
		}).onDelete("cascade"),
]);

export const pricingAccuracyLogs = pgTable("pricing_accuracy_logs", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	projectsCompleted: integer("projects_completed").notNull(),
	tier: integer().notNull(),
	averageVariance: numeric("average_variance", { precision: 10, scale:  4 }),
	underestimateRate: numeric("underestimate_rate", { precision: 5, scale:  4 }),
	overestimateRate: numeric("overestimate_rate", { precision: 5, scale:  4 }),
	acceptanceRate: numeric("acceptance_rate", { precision: 5, scale:  4 }),
	bufferSufficiencyRate: numeric("buffer_sufficiency_rate", { precision: 5, scale:  4 }),
	calculatedAt: timestamp("calculated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "pricing_accuracy_logs_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const requests = pgTable("requests", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	projectId: uuid("project_id").notNull(),
	clientName: text("client_name"),
	clientEmail: text("client_email"),
	requestText: text("request_text").notNull(),
	status: text().default('pending').notNull(),
	isInScope: boolean("is_in_scope"),
	aiAnalysis: jsonb("ai_analysis"),
	estimatedHours: numeric("estimated_hours", { precision: 10, scale:  2 }),
	laborCost: numeric("labor_cost", { precision: 10, scale:  2 }),
	overheadCost: numeric("overhead_cost", { precision: 10, scale:  2 }),
	profitAmount: numeric("profit_amount", { precision: 10, scale:  2 }),
	baseSubtotal: numeric("base_subtotal", { precision: 10, scale:  2 }),
	bufferPercentage: numeric("buffer_percentage", { precision: 5, scale:  4 }),
	bufferAmount: numeric("buffer_amount", { precision: 10, scale:  2 }),
	bufferReasoning: text("buffer_reasoning"),
	tierAtQuote: integer("tier_at_quote").default(1),
	quotedPrice: numeric("quoted_price", { precision: 10, scale:  2 }),
	finalPrice: numeric("final_price", { precision: 10, scale:  2 }),
	stripePaymentIntentId: text("stripe_payment_intent_id"),
	paidAt: timestamp("paid_at", { mode: 'string' }),
	freelancerApproved: boolean("freelancer_approved"),
	freelancerApprovedAt: timestamp("freelancer_approved_at", { mode: 'string' }),
	clientApproved: boolean("client_approved"),
	clientApprovedAt: timestamp("client_approved_at", { mode: 'string' }),
	freelancerModifiedPrice: boolean("freelancer_modified_price").default(false),
	priceModificationReason: text("price_modification_reason"),
	pricingAccuracyScore: numeric("pricing_accuracy_score", { precision: 5, scale: 2 }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	pricingReasoning: text("pricing_reasoning"),
	marketResearchData: jsonb("market_research_data"),
	pricingContextUsed: jsonb("pricing_context_used"),
}, (table) => [
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "requests_project_id_projects_id_fk"
		}).onDelete("cascade"),
]);
