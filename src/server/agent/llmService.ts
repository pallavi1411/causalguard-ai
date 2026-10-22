import OpenAI from 'openai';
import { FailureHypothesis, ProposedChange } from '../types/index.js';
import { HypothesesGenerationSchema } from '../schemas/agentSchemas.js';

export class LLMService {
  private openai: OpenAI | null = null;
  private model: string;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    this.model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

    if (apiKey && apiKey.trim() !== '' && !apiKey.startsWith('sk-placeholder')) {
      this.openai = new OpenAI({ apiKey: apiKey.trim() });
    }
  }

  public hasActiveOpenAIKey(): boolean {
    return this.openai !== null;
  }

  /**
   * Generates 2-4 competing failure hypotheses using OpenAI or deterministic dynamic reasoning engine
   */
  public async generateFailureHypotheses(
    change: ProposedChange,
    affectedServices: string[]
  ): Promise<{ hypotheses: FailureHypothesis[]; rationale: string; usedLLM: boolean }> {
    if (this.openai) {
      try {
        const prompt = `You are CausalGuard AI, an elite reliability engineer and automated root-cause analysis agent.
Analyze the following proposed software API contract change:
Service: ${change.serviceName}
Endpoint: ${change.endpoint}
Change Type: ${change.changeType}
Original Field: ${change.originalField}
Proposed Field: ${change.newField || '(Field Removed)'}
PR Description: ${change.description}
Affected downstream consumer services: ${affectedServices.join(', ')}

Generate 2 to 4 distinct, competing failure hypotheses explaining how this change could cause runtime failures across downstream consumers.
For each hypothesis:
- State the affected service
- State the broken field
- Explain the exact failure mechanism (e.g., null pointer, missing token claim, foreign key violation, deserialization panic)
- Set likelihood (HIGH, MEDIUM, LOW)
- Set severity (CATASTROPHIC, HIGH, MEDIUM, LOW)
- Provide a clear, testable assertion.

Return strictly JSON matching this structure:
{
  "hypotheses": [
    {
      "id": "hyp-1",
      "title": "...",
      "affectedService": "...",
      "brokenField": "...",
      "failureMechanism": "...",
      "likelihood": "HIGH",
      "severity": "CATASTROPHIC",
      "testableAssertion": "..."
    }
  ],
  "rationale": "..."
}`;

        const completion = await this.openai.chat.completions.create({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: 'You are CausalGuard AI. You specialize in causal inference, software architecture, and contract-breaking failure mode analysis. Return only valid JSON conforming to the schema.',
            },
            { role: 'user', content: prompt },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.2,
        });

        const rawContent = completion.choices[0]?.message?.content;
        if (rawContent) {
          const parsed = JSON.parse(rawContent);
          const validated = HypothesesGenerationSchema.safeParse(parsed);
          if (validated.success) {
            return {
              hypotheses: validated.data.hypotheses,
              rationale: validated.data.rationale,
              usedLLM: true,
            };
          }
        }
      } catch (err) {
        console.warn('[CausalGuard LLM] OpenAI call failed or returned unparseable output. Falling back to dynamic deterministic reasoning engine.', err);
      }
    }

    // Dynamic high-fidelity deterministic reasoning engine
    const dynamicHypotheses: FailureHypothesis[] = [];

    if (affectedServices.includes('auth-service')) {
      dynamicHypotheses.push({
        id: 'hyp-auth-jwt-npe',
        title: `Authentication Token Generation Crash in auth-service`,
        affectedService: 'auth-service',
        brokenField: change.originalField,
        failureMechanism: `The authentication gateway expects '${change.originalField}' as the primary Subject Identifier (sub claim) in JWT tokens. When altered, auth-service throws NullPointerException during user token issuance, blocking logins enterprise-wide.`,
        likelihood: 'HIGH',
        severity: 'CATASTROPHIC',
        testableAssertion: `Assert response payload contains '${change.originalField}' with valid string value for auth-service consumer.`,
      });
    }

    if (affectedServices.includes('payroll-integration')) {
      const isDept = change.originalField.toLowerCase().includes('department');
      dynamicHypotheses.push({
        id: 'hyp-payroll-ledger-abort',
        title: isDept
          ? `Payroll Ledger Cost-Center Allocation Failure in payroll-integration`
          : `Payroll Ledger Foreign Key Schema Validation Abort`,
        affectedService: 'payroll-integration',
        brokenField: change.originalField,
        failureMechanism: isDept
          ? `The payroll synchronization worker allocates compensation to organizational cost-centers based on '${change.originalField}'. When missing, payroll batches throw CostCenterAllocationError, halting salary disbursements.`
          : `The payroll synchronization worker runs automated accounting batches and executes strict schema validation against '${change.originalField}'. Receiving '${change.newField || 'null'}' triggers an immediate rollback to prevent ledger corruption.`,
        likelihood: 'HIGH',
        severity: 'CATASTROPHIC',
        testableAssertion: `Assert payroll worker ingest pipeline validates presence of '${change.originalField}' before processing salary ledger transaction.`,
      });
    }

    if (affectedServices.includes('hr-analytics-dashboard')) {
      dynamicHypotheses.push({
        id: 'hyp-hr-analytics-breakdown',
        title: `Headcount Aggregation Failure in hr-analytics-dashboard`,
        affectedService: 'hr-analytics-dashboard',
        brokenField: change.originalField,
        failureMechanism: `The analytics ingestion engine aggregates headcount and retention metrics partitioned by '${change.originalField}'. Without it, dashboard charts fail with AnalyticsAggregationError.`,
        likelihood: 'HIGH',
        severity: 'HIGH',
        testableAssertion: `Assert analytics reporting pipeline can resolve '${change.originalField}' in incoming DTOs.`,
      });
    }

    // If no specific service matched or only 1 matched, add resilient SDK hypothesis
    if (dynamicHypotheses.length < 2) {
      dynamicHypotheses.push({
        id: 'hyp-client-sdk-deserialization',
        title: `Downstream Microservice Deserialization Panic on missing '${change.originalField}'`,
        affectedService: affectedServices[0] || 'internal-microservice-mesh',
        brokenField: change.originalField,
        failureMechanism: `Unversioned internal clients deserializing employee payloads into strongly typed DTOs will fail schema validation if '${change.originalField}' is omitted.`,
        likelihood: 'MEDIUM',
        severity: 'HIGH',
        testableAssertion: `Verify '${change.originalField}' is preserved in serialized response to maintain backward compatibility.`,
      });
    }

    const servicesList = affectedServices.length > 0 ? affectedServices.join(', ') : 'downstream consumers';

    return {
      hypotheses: dynamicHypotheses,
      rationale: `Modifying field '${change.originalField}' directly impacts dependent consumer services (${servicesList}). Each downstream system relies on strict schema contracts for transaction processing.`,
      usedLLM: false,
    };
  }
}
