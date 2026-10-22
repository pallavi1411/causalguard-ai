import type { ChatCompletionTool } from 'openai/resources/chat/completions.js';
import {
  GetDependencyGraphArgsSchema,
  RunContractTestArgsSchema,
  GetAffectedServicesArgsSchema,
  ApplyCompatibilityPatchArgsSchema,
  RunVerificationArgsSchema,
} from '../schemas/agentSchemas.js';
import { DependencyGraphEngine } from '../graph/dependencyGraph.js';
import { ContractTester } from '../contracts/contractTester.js';
import { SandboxEnvironment } from '../sandbox/sandboxEnv.js';
import { DOWNSTREAM_CONSUMERS } from '../contracts/registry.js';
import { ProposedChange } from '../types/index.js';

export interface AgentContext {
  graphEngine: DependencyGraphEngine;
  sandbox: SandboxEnvironment;
  proposedChange: ProposedChange;
}

/**
 * OpenAI Tool Specifications
 */
export const AGENT_TOOLS: ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'get_dependency_graph',
      description: 'Generates the live microservice dependency graph showing services, fields, and consuming microservices with causal paths.',
      parameters: {
        type: 'object',
        properties: {
          serviceName: {
            type: 'string',
            description: 'The primary service emitting the modified contract',
          },
          targetField: {
            type: 'string',
            description: 'The API field undergoing change (e.g., employee_id)',
          },
        },
        required: ['serviceName', 'targetField'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_affected_services',
      description: 'Discovers all downstream services that consume a specific field and will be impacted if that field is changed or removed.',
      parameters: {
        type: 'object',
        properties: {
          serviceName: {
            type: 'string',
            description: 'The service undergoing modification',
          },
          fieldName: {
            type: 'string',
            description: 'The field name to trace downstream',
          },
        },
        required: ['serviceName', 'fieldName'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'run_contract_test',
      description: 'Executes a deterministic contract test against a specific downstream consumer to check if an API change causes runtime failure.',
      parameters: {
        type: 'object',
        properties: {
          serviceName: {
            type: 'string',
            description: 'The service providing the API endpoint',
          },
          consumerName: {
            type: 'string',
            description: 'The downstream consumer to test (e.g., auth-service, payroll-integration)',
          },
          payloadVariant: {
            type: 'string',
            enum: ['PROPOSED_UNPATCHED', 'SANDBOX_PATCHED'],
            description: 'Whether to test against the unpatched proposed change or the sandboxed patch',
          },
        },
        required: ['serviceName', 'consumerName', 'payloadVariant'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'apply_compatibility_patch',
      description: 'Synthesizes and applies a backward-compatible intervention patch strictly within an isolated sandbox environment.',
      parameters: {
        type: 'object',
        properties: {
          serviceName: {
            type: 'string',
            description: 'Service to patch in sandbox',
          },
          strategy: {
            type: 'string',
            enum: ['DUAL_WRITE_ALIAS', 'SCHEMA_ADAPTER', 'REVERT_CHANGE'],
            description: 'Intervention pattern to apply. DUAL_WRITE_ALIAS keeps both fields for seamless backward compatibility.',
          },
          originalField: {
            type: 'string',
            description: 'Original field required by downstream consumers',
          },
          newField: {
            type: 'string',
            description: 'New field introduced in the proposed change',
          },
        },
        required: ['serviceName', 'strategy', 'originalField', 'newField'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'run_verification',
      description: 'Executes comprehensive end-to-end contract verification against all downstream services in the sandbox to prove failure resolution.',
      parameters: {
        type: 'object',
        properties: {
          serviceName: {
            type: 'string',
            description: 'The service to verify in sandbox',
          },
          consumers: {
            type: 'array',
            items: { type: 'string' },
            description: 'List of downstream consumers to verify',
          },
        },
        required: ['serviceName', 'consumers'],
      },
    },
  },
];

/**
 * Tool Executor Dispatcher
 */
export async function executeAgentTool(
  toolName: string,
  rawArgs: Record<string, any>,
  context: AgentContext
): Promise<any> {
  switch (toolName) {
    case 'get_dependency_graph': {
      const parsed = GetDependencyGraphArgsSchema.parse(rawArgs);
      const graphData = context.graphEngine.exportGraphData(context.proposedChange);
      return {
        service: parsed.serviceName,
        targetField: parsed.targetField,
        nodeCount: graphData.nodes.length,
        edgeCount: graphData.edges.length,
        causalPaths: graphData.causalPaths,
        nodes: graphData.nodes,
      };
    }

    case 'get_affected_services': {
      const parsed = GetAffectedServicesArgsSchema.parse(rawArgs);
      const affected = context.graphEngine.getAffectedConsumers(parsed.serviceName, parsed.fieldName);
      const consumerDetails = DOWNSTREAM_CONSUMERS.filter((c) => affected.includes(c.consumerName)).map((c) => ({
        consumerName: c.consumerName,
        criticality: c.criticality,
        failureMode: c.failureMode,
        consumedFields: c.consumedFields,
      }));

      return {
        service: parsed.serviceName,
        fieldName: parsed.fieldName,
        affectedConsumers: affected,
        consumerDetails,
        totalAffected: affected.length,
      };
    }

    case 'run_contract_test': {
      const parsed = RunContractTestArgsSchema.parse(rawArgs);
      const result = ContractTester.testConsumerContract(
        parsed.consumerName,
        parsed.payloadVariant,
        context.proposedChange
      );
      return result;
    }

    case 'apply_compatibility_patch': {
      const parsed = ApplyCompatibilityPatchArgsSchema.parse(rawArgs);
      const patchResult = context.sandbox.applyPatch(
        parsed.strategy,
        parsed.originalField,
        parsed.newField,
        context.proposedChange
      );
      return patchResult;
    }

    case 'run_verification': {
      RunVerificationArgsSchema.parse(rawArgs);
      const verification = context.sandbox.runVerification(context.proposedChange);
      return verification;
    }

    default:
      throw new Error(`Unknown agent tool: ${toolName}`);
  }
}
