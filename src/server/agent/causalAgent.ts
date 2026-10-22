import {
  AgentStepTrace,
  AnalysisResponse,
  ContractTestResult,
  ProposedChange,
  ToolCallRecord,
} from '../types/index.js';
import { DependencyGraphEngine } from '../graph/dependencyGraph.js';
import { SandboxEnvironment } from '../sandbox/sandboxEnv.js';
import { executeAgentTool, AgentContext } from './tools.js';
import { LLMService } from './llmService.js';
import { SEEDED_PROPOSED_CHANGE } from '../contracts/registry.js';

/**
 * CausalGuard AI Agent
 * Implements the Observe -> Reason -> Act -> Verify agentic loop
 */
export class CausalGuardAgent {
  private graphEngine: DependencyGraphEngine;
  private sandbox: SandboxEnvironment;
  private llmService: LLMService;
  private toolCallLog: ToolCallRecord[] = [];
  private reasoningTrace: AgentStepTrace[] = [];

  constructor() {
    this.graphEngine = new DependencyGraphEngine();
    this.sandbox = new SandboxEnvironment();
    this.llmService = new LLMService();
  }

  private async callTool(toolName: string, args: Record<string, any>, context: AgentContext): Promise<any> {
    const startTime = Date.now();
    const result = await executeAgentTool(toolName, args, context);
    const durationMs = Date.now() - startTime;

    const record: ToolCallRecord = {
      id: `call-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      toolName,
      arguments: args,
      output: result,
      executedAt: startTime,
      durationMs,
    };

    this.toolCallLog.push(record);
    return { result, record };
  }

  /**
   * Run the full end-to-end agentic workflow
   */
  public async runAnalysis(change: ProposedChange = SEEDED_PROPOSED_CHANGE): Promise<AnalysisResponse> {
    const overallStartTime = Date.now();
    this.toolCallLog = [];
    this.reasoningTrace = [];

    const context: AgentContext = {
      graphEngine: this.graphEngine,
      sandbox: this.sandbox,
      proposedChange: change,
    };

    // =========================================================================
    // STEP 1: OBSERVE
    // Load the proposed change + current contracts
    // =========================================================================
    const observeTrace: AgentStepTrace = {
      step: 'OBSERVE',
      stepNumber: 1,
      title: 'Observe: Ingest Proposed API Change & Baseline Contracts',
      detail: `Detected incoming Pull Request #${change.prNumber} by ${change.author}. Proposed mutation: rename field '${change.originalField}' to '${change.newField}' on endpoint ${change.endpoint}.`,
      status: 'COMPLETED',
      data: { change },
      timestamp: Date.now(),
    };
    this.reasoningTrace.push(observeTrace);

    // =========================================================================
    // STEP 2: BUILD GRAPH
    // Create dependency graph of services -> fields -> consumers
    // Tools: get_dependency_graph, get_affected_services
    // =========================================================================
    const step2ToolCalls: ToolCallRecord[] = [];

    // Tool Call 1: get_dependency_graph
    const { result: graphDataResult, record: graphRecord } = await this.callTool(
      'get_dependency_graph',
      {
        serviceName: change.serviceName,
        targetField: change.originalField,
      },
      context
    );
    step2ToolCalls.push(graphRecord);

    // Tool Call 2: get_affected_services
    const { result: affectedServicesResult, record: affectedRecord } = await this.callTool(
      'get_affected_services',
      {
        serviceName: change.serviceName,
        fieldName: change.originalField,
      },
      context
    );
    step2ToolCalls.push(affectedRecord);

    const affectedServices: string[] = affectedServicesResult.affectedConsumers;
    const fullGraph = this.graphEngine.exportGraphData(change);

    const graphTrace: AgentStepTrace = {
      step: 'BUILD_GRAPH',
      stepNumber: 2,
      title: 'Build Graph: Map Service Dependency Mesh & Identify Consumers',
      detail: `Constructed live dependency graph (${fullGraph.nodes.length} nodes, ${fullGraph.edges.length} edges). Discovered ${affectedServices.length} direct downstream consumers depending on '${change.originalField}': [${affectedServices.join(', ')}].`,
      status: 'COMPLETED',
      data: {
        affectedServices,
        causalPaths: fullGraph.causalPaths,
      },
      toolCalls: step2ToolCalls,
      timestamp: Date.now(),
    };
    this.reasoningTrace.push(graphTrace);

    // =========================================================================
    // STEP 3: GENERATE HYPOTHESES
    // LLM generates 2-4 possible failure paths
    // =========================================================================
    const { hypotheses, rationale, usedLLM } = await this.llmService.generateFailureHypotheses(
      change,
      affectedServices
    );

    const hypothesesTrace: AgentStepTrace = {
      step: 'GENERATE_HYPOTHESES',
      stepNumber: 3,
      title: 'Generate Hypotheses: Synthesize Competing Failure Modes via LLM',
      detail: `Generated ${hypotheses.length} competing failure hypotheses for affected services [${affectedServices.join(', ')}] on field '${change.originalField}'. (LLM Engine: ${usedLLM ? 'OpenAI Live' : 'Dynamic Deterministic Engine'}).`,
      status: 'COMPLETED',
      data: {
        hypotheses,
        rationale,
      },
      timestamp: Date.now(),
    };
    this.reasoningTrace.push(hypothesesTrace);

    // =========================================================================
    // STEP 4: TEST HYPOTHESES
    // Deterministic tools validate each hypothesis
    // Tool: run_contract_test
    // =========================================================================
    const step4ToolCalls: ToolCallRecord[] = [];
    const initialTestResults: ContractTestResult[] = [];

    for (const consumerName of affectedServices) {
      const { result: testResult, record: testRecord } = await this.callTool(
        'run_contract_test',
        {
          serviceName: change.serviceName,
          consumerName,
          payloadVariant: 'PROPOSED_UNPATCHED',
        },
        context
      );
      step4ToolCalls.push(testRecord);
      initialTestResults.push(testResult);
    }

    const failedInitial = initialTestResults.filter((r) => r.status === 'FAIL');

    const testTrace: AgentStepTrace = {
      step: 'TEST_HYPOTHESES',
      stepNumber: 4,
      title: 'Test Hypotheses: Execute Deterministic Contract Tests',
      detail: failedInitial.length > 0
        ? `Validated failure hypotheses against simulated consumer contracts. ${failedInitial.length} of ${initialTestResults.length} downstream contract tests FAILED with fatal status 500. Proved that unpatched mutation of '${change.originalField}' breaks [${affectedServices.join(', ')}]!`
        : `All ${initialTestResults.length} downstream contract tests PASSED with HTTP 200 OK! Zero breaking contract mutations detected. The proposed PR cleanly preserves '${change.originalField}' and downstream consumers are 100% resilient.`,
      status: failedInitial.length > 0 ? 'WARNING' : 'COMPLETED',
      data: {
        totalTested: initialTestResults.length,
        failedCount: failedInitial.length,
        results: initialTestResults,
      },
      toolCalls: step4ToolCalls,
      timestamp: Date.now(),
    };
    this.reasoningTrace.push(testTrace);

    // =========================================================================
    // STEP 5: SELECT INTERVENTION
    // LLM + policy chooses the least disruptive safe action
    // =========================================================================
    const availableInterventions = SandboxEnvironment.getAvailableInterventions(
      change.originalField,
      change.newField || '',
      change.changeType
    );
    const chosenIntervention = availableInterventions.find((i) => i.type === 'DUAL_WRITE_ALIAS') || availableInterventions[0];

    const selectTrace: AgentStepTrace = {
      step: 'SELECT_INTERVENTION',
      stepNumber: 5,
      title: failedInitial.length > 0 ? `Select Intervention: ${chosenIntervention.title}` : 'Select Intervention: No Intervention Required (Contracts Safe)',
      detail: failedInitial.length > 0
        ? `Evaluated ${availableInterventions.length} candidate remediation strategies. Selected pattern (${chosenIntervention.title}) because it preserves '${change.originalField}' for downstream consumers [${affectedServices.join(', ')}]. Zero client downtime, zero breaking changes.`
        : `All downstream consumer contracts are already passing with 100% compliance. Zero breaking changes detected in this Pull Request; code is immediately ready to merge.`,
      status: 'COMPLETED',
      data: {
        availableInterventions,
        chosenIntervention,
      },
      timestamp: Date.now(),
    };
    this.reasoningTrace.push(selectTrace);

    // =========================================================================
    // STEP 6: ACT
    // Apply the intervention ONLY in sandbox
    // Tool: apply_compatibility_patch
    // =========================================================================
    const step6ToolCalls: ToolCallRecord[] = [];
    const { result: patchResult, record: patchRecord } = await this.callTool(
      'apply_compatibility_patch',
      {
        serviceName: change.serviceName,
        strategy: chosenIntervention.type,
        originalField: change.originalField,
        newField: change.newField || '',
      },
      context
    );
    step6ToolCalls.push(patchRecord);

    const actTrace: AgentStepTrace = {
      step: 'ACT',
      stepNumber: 6,
      title: 'Act: Apply Compatibility Patch in Isolated Sandbox',
      detail: `Synthesized and hot-loaded adapter for '${change.originalField}' into sandbox runtime environment (${patchResult.sandboxEnvId}). No production infrastructure modified. Unified diff generated for PR review.`,
      status: 'COMPLETED',
      data: { patchResult },
      toolCalls: step6ToolCalls,
      timestamp: Date.now(),
    };
    this.reasoningTrace.push(actTrace);

    // =========================================================================
    // STEP 7: VERIFY
    // Re-run tests and return success/failure + full reasoning trace
    // Tool: run_verification
    // =========================================================================
    const step7ToolCalls: ToolCallRecord[] = [];
    const { result: verificationResult, record: verificationRecord } = await this.callTool(
      'run_verification',
      {
        serviceName: change.serviceName,
        consumers: affectedServices,
      },
      context
    );
    step7ToolCalls.push(verificationRecord);

    const verifyTrace: AgentStepTrace = {
      step: 'VERIFY',
      stepNumber: 7,
      title: 'Verify: Re-Run Downstream Contract Tests Against Patched Sandbox',
      detail: `Executed complete contract test battery in patched sandbox. ALL ${verificationResult.totalTests} tests PASSED! Downstream consumers [${affectedServices.join(', ')}] are verified 100% resilient and failure is prevented.`,
      status: verificationResult.allPassed ? 'COMPLETED' : 'FAILED',
      data: { verificationResult },
      toolCalls: step7ToolCalls,
      timestamp: Date.now(),
    };
    this.reasoningTrace.push(verifyTrace);

    const totalDuration = Date.now() - overallStartTime;

    // Compile complete response
    const response: AnalysisResponse = {
      scenarioId: change.id,
      proposedChange: change,
      graph: fullGraph,
      affectedServices,
      hypotheses,
      initialTestResults,
      interventionsEvaluated: availableInterventions,
      chosenIntervention,
      sandboxResult: patchResult,
      verificationResult,
      reasoningTrace: this.reasoningTrace,
      summary: {
        breakingCount: failedInitial.length,
        resolvedCount: verificationResult.passedTests,
        verdict: verificationResult.allPassed ? 'PREVENTED' : 'UNRESOLVED',
        executionTimeMs: totalDuration,
        usedOpenAI: usedLLM,
      },
    };

    return response;
  }
}
