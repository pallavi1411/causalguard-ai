import { ContractTestResult, ProposedChange } from '../types/index.js';
import {
  DOWNSTREAM_CONSUMERS,
  BASELINE_PAYLOAD,
  SEEDED_PROPOSED_CHANGE,
  buildUnpatchedPayload,
} from './registry.js';

/**
 * Deterministic Contract Testing Engine
 * Tests downstream consumer contracts against dynamically computed unpatched and patched API responses.
 */
export class ContractTester {
  /**
   * Executes a single contract test against a specific consumer
   */
  public static testConsumerContract(
    consumerName: string,
    payloadVariant: 'PROPOSED_UNPATCHED' | 'SANDBOX_PATCHED',
    change?: ProposedChange,
    customPayload?: Record<string, any>
  ): ContractTestResult {
    const startTime = Date.now();
    const consumer = DOWNSTREAM_CONSUMERS.find((c) => c.consumerName === consumerName);

    if (!consumer) {
      return {
        serviceName: change?.serviceName || 'employee-directory-service',
        consumerName,
        endpoint: change?.endpoint || '/api/v1/employees/:id',
        status: 'FAIL',
        statusCode: 404,
        testedField: change?.originalField || 'unknown',
        errorMessage: `Downstream consumer '${consumerName}' is not registered in contract repository`,
        payloadSent: {},
        durationMs: Date.now() - startTime,
      };
    }

    // Determine payload to test dynamically
    let payloadToTest: Record<string, any>;
    if (customPayload) {
      payloadToTest = customPayload;
    } else if (payloadVariant === 'PROPOSED_UNPATCHED') {
      payloadToTest = buildUnpatchedPayload(change || SEEDED_PROPOSED_CHANGE);
    } else {
      // Default baseline/patched payload
      const effectiveChange = change || SEEDED_PROPOSED_CHANGE;
      payloadToTest = {
        ...BASELINE_PAYLOAD,
      };
      if (effectiveChange.newField) {
        payloadToTest[effectiveChange.newField] = payloadToTest[effectiveChange.originalField] || 'EMP-90210';
      }
    }

    // Run the consumer mock contract verification
    const testOutcome = consumer.mockHandler(payloadToTest);
    const duration = Math.max(8, Date.now() - startTime + Math.floor(Math.random() * 15));

    if (testOutcome.success) {
      return {
        serviceName: consumer.serviceTarget,
        consumerName: consumer.consumerName,
        endpoint: consumer.endpoint,
        status: 'PASS',
        statusCode: 200,
        testedField: consumer.consumedFields.join(', '),
        payloadSent: payloadToTest,
        durationMs: duration,
      };
    } else {
      // Find which required field is missing
      const missingField = consumer.consumedFields.find((f) => !(f in payloadToTest)) || change?.originalField || 'unknown';
      return {
        serviceName: consumer.serviceTarget,
        consumerName: consumer.consumerName,
        endpoint: consumer.endpoint,
        status: 'FAIL',
        statusCode: 500,
        testedField: missingField,
        errorMessage: testOutcome.error,
        payloadSent: payloadToTest,
        durationMs: duration,
      };
    }
  }

  /**
   * Executes a full battery of contract tests for all downstream consumers
   */
  public static runAllConsumerTests(
    payloadVariant: 'PROPOSED_UNPATCHED' | 'SANDBOX_PATCHED',
    change?: ProposedChange,
    customPayload?: Record<string, any>
  ): ContractTestResult[] {
    return DOWNSTREAM_CONSUMERS.map((consumer) =>
      this.testConsumerContract(consumer.consumerName, payloadVariant, change, customPayload)
    );
  }
}
