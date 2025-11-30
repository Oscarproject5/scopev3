import { relations } from "drizzle-orm/relations";
import { projects, contextNotes, users, documentUploads, requests, actualCosts, projectRules, pricingAccuracyLogs } from "./schema";

export const contextNotesRelations = relations(contextNotes, ({one}) => ({
	project: one(projects, {
		fields: [contextNotes.projectId],
		references: [projects.id]
	}),
}));

export const projectsRelations = relations(projects, ({one, many}) => ({
	contextNotes: many(contextNotes),
	documentUploads: many(documentUploads),
	user: one(users, {
		fields: [projects.userId],
		references: [users.id]
	}),
	projectRules: many(projectRules),
	requests: many(requests),
}));

export const documentUploadsRelations = relations(documentUploads, ({one}) => ({
	user: one(users, {
		fields: [documentUploads.userId],
		references: [users.id]
	}),
	project: one(projects, {
		fields: [documentUploads.linkedProjectId],
		references: [projects.id]
	}),
}));

export const usersRelations = relations(users, ({many}) => ({
	documentUploads: many(documentUploads),
	projects: many(projects),
	pricingAccuracyLogs: many(pricingAccuracyLogs),
}));

export const actualCostsRelations = relations(actualCosts, ({one}) => ({
	request: one(requests, {
		fields: [actualCosts.requestId],
		references: [requests.id]
	}),
}));

export const requestsRelations = relations(requests, ({one, many}) => ({
	actualCosts: many(actualCosts),
	project: one(projects, {
		fields: [requests.projectId],
		references: [projects.id]
	}),
}));

export const projectRulesRelations = relations(projectRules, ({one}) => ({
	project: one(projects, {
		fields: [projectRules.projectId],
		references: [projects.id]
	}),
}));

export const pricingAccuracyLogsRelations = relations(pricingAccuracyLogs, ({one}) => ({
	user: one(users, {
		fields: [pricingAccuracyLogs.userId],
		references: [users.id]
	}),
}));