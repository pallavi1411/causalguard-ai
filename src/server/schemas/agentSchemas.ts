import { z } from 'zod';

/**
 * Zod Schemas for CausalGuard AI validation and OpenAI Structured Outputs
 */

export const ProposedChangeSchema = z.object({
  id: z.string(),
  serviceName: z.string(),
  endpoint: z.string(),
  changeType: z.enum(['FIELD_RENAME', 'FIELD_REMOVAL', 'TYPE_MUTATION', 'OPTIONAL_TO_REQUIRED']),
  originalField: z.string(),
  newField: z.string().optional(),
  description: z.string(),
  author: z.string(),
  prNumber: z.number(),
});

export const HypothesisSchema = z.object({
  id: z.string(),
  title: z.string(),
  affectedService: z.string(),
  brokenField: z.string(),
  failureMechanism: z.string(),
  likelihood: z.enum(['HIGH', 'MEDIUM', 'LOW']),
  severity: z.enum(['CATASTROPHIC', 'HIGH', 'MEDIUM', 'LOW']),
  testableAssertion: z.string(),
});

export const HypothesesGenerationSchema = z.object({
  hypotheses: z.array(HypothesisSchema).min(2).max(4),
  rationale: z.string(),
});

// Tool Call Argument Schemas
export const GetDependencyGraphArgsSchema = z.object({
  serviceName: z.string().describe('The primary service where the change is being introduced'),
  targetField: z.string().describe('The field undergoing rename or modification'),
});

export const RunContractTestArgsSchema = z.object({
  serviceName: z.string().describe('Target service emitting the contract payload'),
  consumerName: z.string().describe('Downstream consumer to validate contract against'),
  payloadVariant: z.enum(['PROPOSED_UNPATCHED', 'SANDBOX_PATCHED']).describe('Whether to test original proposed change or sandboxed patch'),
});

export const GetAffectedServicesArgsSchema = z.object({
  serviceName: z.string().describe('The service undergoing change'),
  fieldName: z.string().describe('The field being renamed or modified'),
});

export const ApplyCompatibilityPatchArgsSchema = z.object({
  serviceName: z.string().describe('The service where patch will be applied in sandbox'),
  strategy: z.enum(['DUAL_WRITE_ALIAS', 'SCHEMA_ADAPTER', 'REVERT_CHANGE']).describe('The chosen backward compatibility strategy'),
  originalField: z.string(),
  newField: z.string(),
});

export const RunVerificationArgsSchema = z.object({
  serviceName: z.string().describe('Service to verify under sandbox conditions'),
  consumers: z.array(z.string()).describe('List of consumers to execute end-to-end contract verification for'),
});

export const SelectInterventionSchema = z.object({
  chosenStrategy: z.enum(['DUAL_WRITE_ALIAS', 'SCHEMA_ADAPTER', 'REVERT_CHANGE']),
  justification: z.string(),
  backwardCompatibilityVerified: z.boolean(),
  riskScore: z.number().min(0).max(10),
});

export const AnalyzeRequestSchema = z.object({
  scenarioId: z.string().optional().default('employee-id-rename'),
  customChange: ProposedChangeSchema.optional(),
  githubPrUrl: z.string().optional(),
  githubToken: z.string().optional(),
});
