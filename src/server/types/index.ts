/**
 * Core type definitions for CausalGuard AI
 */

export interface ContractField {
  name: string;
  type: string;
  required: boolean;
  description?: string;
  deprecated?: boolean;
}

export interface ServiceContract {
  serviceName: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  version: string;
  fields: Record<string, ContractField>;
}

export interface DownstreamConsumer {
  consumerName: string;
  serviceTarget: string;
  endpoint: string;
  consumedFields: string[];
  failureMode: string;
  criticality: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  mockHandler: (payload: Record<string, any>) => { success: boolean; error?: string };
}

export interface ProposedChange {
  id: string;
  serviceName: string;
  endpoint: string;
  changeType: 'FIELD_RENAME' | 'FIELD_REMOVAL' | 'TYPE_MUTATION' | 'OPTIONAL_TO_REQUIRED';
  originalField: string;
  newField?: string;
  description: string;
  author: string;
  prNumber: number;
}

export interface GraphNode {
  id: string;
  label: string;
  type: 'SERVICE' | 'FIELD' | 'CONSUMER';
  metadata?: Record<string, any>;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  relation: 'EXPOSES' | 'CONSUMES' | 'MODIFIES';
  criticality?: 'CRITICAL' | 'HIGH' | 'MEDIUM';
}

export interface DependencyGraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  causalPaths: {
    consumer: string;
    targetField: string;
    riskLevel: 'BREAKING' | 'SAFE' | 'WARNING';
    path: string[];
  }[];
}

export interface FailureHypothesis {
  id: string;
  title: string;
  affectedService: string;
  brokenField: string;
  failureMechanism: string;
  likelihood: 'HIGH' | 'MEDIUM' | 'LOW';
  severity: 'CATASTROPHIC' | 'HIGH' | 'MEDIUM' | 'LOW';
  testableAssertion: string;
}

export interface ContractTestResult {
  hypothesisId?: string;
  serviceName: string;
  consumerName: string;
  endpoint: string;
  status: 'PASS' | 'FAIL';
  statusCode: number;
  testedField: string;
  errorMessage?: string;
  payloadSent: Record<string, any>;
  durationMs: number;
}

export interface InterventionOption {
  id: string;
  title: string;
  type: 'DUAL_WRITE_ALIAS' | 'SCHEMA_ADAPTER' | 'REVERT_CHANGE';
  description: string;
  codePatch: string;
  pros: string[];
  cons: string[];
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  backwardCompatible: boolean;
  recommended: boolean;
}

export interface PatchApplicationResult {
  status: 'APPLIED' | 'FAILED';
  patchId: string;
  appliedFiles: string[];
  diffPreview: string;
  appliedAt: string;
  sandboxEnvId: string;
}

export interface VerificationResult {
  allPassed: boolean;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  details: ContractTestResult[];
  verificationVerdict: 'VERIFIED_SAFE' | 'FAILED_RETAIN_BREAK';
}

export interface ToolCallRecord {
  id: string;
  toolName: string;
  arguments: Record<string, any>;
  output: any;
  executedAt: number;
  durationMs: number;
}

export interface AgentStepTrace {
  step: 'OBSERVE' | 'BUILD_GRAPH' | 'GENERATE_HYPOTHESES' | 'TEST_HYPOTHESES' | 'SELECT_INTERVENTION' | 'ACT' | 'VERIFY';
  stepNumber: number;
  title: string;
  detail: string;
  status: 'RUNNING' | 'COMPLETED' | 'WARNING' | 'FAILED';
  data?: any;
  toolCalls?: ToolCallRecord[];
  timestamp: number;
}

export interface AnalysisResponse {
  scenarioId: string;
  proposedChange: ProposedChange;
  graph: DependencyGraphData;
  affectedServices: string[];
  hypotheses: FailureHypothesis[];
  initialTestResults: ContractTestResult[];
  interventionsEvaluated: InterventionOption[];
  chosenIntervention: InterventionOption;
  sandboxResult: PatchApplicationResult;
  verificationResult: VerificationResult;
  reasoningTrace: AgentStepTrace[];
  summary: {
    breakingCount: number;
    resolvedCount: number;
    verdict: 'PREVENTED' | 'UNRESOLVED';
    executionTimeMs: number;
    usedOpenAI: boolean;
  };
}
