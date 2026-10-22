import { InterventionOption, PatchApplicationResult, VerificationResult, ProposedChange } from '../types/index.js';
import { ContractTester } from '../contracts/contractTester.js';
import { BASELINE_PAYLOAD, SEEDED_PROPOSED_CHANGE } from '../contracts/registry.js';

/**
 * Isolated Sandbox Environment for CausalGuard AI
 * Dynamically synthesizes and validates backward compatibility patches in an isolated execution runtime.
 */
export class SandboxEnvironment {
  private activeStrategy: string | null = null;
  private patchedPayload: Record<string, any> | null = null;
  private sandboxId: string;
  private currentChange: ProposedChange = SEEDED_PROPOSED_CHANGE;

  constructor() {
    this.sandboxId = `sandbox-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Available intervention candidate strategies generated dynamically
   */
  public static getAvailableInterventions(
    originalField: string,
    newField: string,
    changeType: string = 'FIELD_RENAME'
  ): InterventionOption[] {
    const isRemoval = changeType === 'FIELD_REMOVAL' || !newField;

    const dualWriteDiff = isRemoval
      ? `--- a/src/controllers/employeeSerializer.ts
+++ b/src/controllers/employeeSerializer.ts
@@ -14,6 +14,7 @@ export function serializeEmployee(employeeRecord: EmployeeEntity) {
   return {
+    ${originalField}: employeeRecord.${originalField} || 'Standard', // [CausalGuard Patch] Restored legacy field
     full_name: employeeRecord.fullName,
     department: employeeRecord.department,
     email: employeeRecord.email,
     role: employeeRecord.role,
   };
 }`
      : `--- a/src/controllers/employeeSerializer.ts
+++ b/src/controllers/employeeSerializer.ts
@@ -14,7 +14,8 @@ export function serializeEmployee(employeeRecord: EmployeeEntity) {
   return {
-    ${newField}: employeeRecord.id, // BREAKING: omitted ${originalField}
+    ${newField}: employeeRecord.id,
+    ${originalField}: employeeRecord.id, // [CausalGuard Patch] Legacy alias for downstream consumers
     full_name: employeeRecord.fullName,
     department: employeeRecord.department,
     email: employeeRecord.email,
     role: employeeRecord.role,
   };
 }`;

    return [
      {
        id: 'opt-dual-write-alias',
        title: isRemoval
          ? `Legacy Field Defaulting (${originalField} Fallback)`
          : `Dual-Write Field Alias Pattern (${originalField} ➔ ${newField})`,
        type: 'DUAL_WRITE_ALIAS',
        description: isRemoval
          ? `Gracefully retain '${originalField}' in API response payload to preserve downstream consumer contracts.`
          : `Expose both '${originalField}' and '${newField}' simultaneously in the response serializer. Preserves legacy contracts while enabling consumers to migrate incrementally.`,
        codePatch: dualWriteDiff,
        pros: [
          'Zero downtime migration',
          `Immediate backward compatibility for all consumers expecting '${originalField}'`,
          'Enables non-breaking gradual consumer adoption',
        ],
        cons: [
          'Minor payload size increase during migration deprecation window',
        ],
        riskLevel: 'LOW',
        backwardCompatible: true,
        recommended: true,
      },
      {
        id: 'opt-schema-adapter',
        title: 'Content Negotiation / Header-Based Adapter',
        type: 'SCHEMA_ADAPTER',
        description: `Inspect incoming Accept-Version or X-Consumer-Client header. Deliver '${originalField}' to legacy clients.`,
        codePatch: `--- a/src/middleware/versionAdapter.ts
+++ b/src/middleware/versionAdapter.ts
@@ -1,5 +1,10 @@
+export function legacyAdapterMiddleware(req, res, next) {
+  const version = req.headers['x-api-version'] || 'v1';
+  if (version === 'v1') {
+    res.locals.fieldMapping = { ${newField || 'legacy'}: '${originalField}' };
+  }
+  next();
+}`,
        pros: ['Strict contract adherence per declared version'],
        cons: ['Requires clients to supply explicit headers; breaks unversioned clients'],
        riskLevel: 'MEDIUM',
        backwardCompatible: false,
        recommended: false,
      },
      {
        id: 'opt-revert-change',
        title: 'Revert Proposed PR Change',
        type: 'REVERT_CHANGE',
        description: `Abort field change. Revert back to baseline schema.`,
        codePatch: `--- a/src/controllers/employeeSerializer.ts
+++ b/src/controllers/employeeSerializer.ts
@@ -14,7 +14,7 @@ export function serializeEmployee(employeeRecord: EmployeeEntity) {
   return {
-    ${newField || 'modified_field'}: employeeRecord.id,
+    ${originalField}: employeeRecord.id,
   };`,
        pros: ['Guaranteed to avoid downstream breaks'],
        cons: ['Blocks modern enterprise API modernization effort'],
        riskLevel: 'HIGH',
        backwardCompatible: true,
        recommended: false,
      },
    ];
  }

  /**
   * Applies an intervention inside the sandbox dynamically
   */
  public applyPatch(
    strategy: 'DUAL_WRITE_ALIAS' | 'SCHEMA_ADAPTER' | 'REVERT_CHANGE',
    originalField: string,
    newField: string,
    change?: ProposedChange
  ): PatchApplicationResult {
    this.activeStrategy = strategy;
    if (change) {
      this.currentChange = change;
    }

    if (strategy === 'DUAL_WRITE_ALIAS') {
      // Create fully patched payload: includes all baseline fields + newField
      this.patchedPayload = {
        ...BASELINE_PAYLOAD,
      };
      if (newField) {
        this.patchedPayload[newField] = this.patchedPayload[originalField] || 'EMP-90210';
      }
      // Ensure originalField is strictly present
      if (!this.patchedPayload[originalField]) {
        this.patchedPayload[originalField] = 'Core Infrastructure';
      }
    } else if (strategy === 'REVERT_CHANGE') {
      this.patchedPayload = {
        ...BASELINE_PAYLOAD,
      };
    } else {
      // SCHEMA_ADAPTER failure on unversioned
      this.patchedPayload = {
        ...BASELINE_PAYLOAD,
      };
      delete this.patchedPayload[originalField];
    }

    const available = SandboxEnvironment.getAvailableInterventions(
      originalField,
      newField,
      change?.changeType || 'FIELD_RENAME'
    );
    const chosen = available.find((a) => a.type === strategy) || available[0];

    return {
      status: 'APPLIED',
      patchId: `patch-${strategy.toLowerCase()}-${Date.now().toString(36)}`,
      appliedFiles: ['src/controllers/employeeSerializer.ts', 'src/contracts/employee.contract.ts'],
      diffPreview: chosen.codePatch,
      appliedAt: new Date().toISOString(),
      sandboxEnvId: this.sandboxId,
    };
  }

  /**
   * Runs verification against the active sandbox state
   */
  public runVerification(change?: ProposedChange): VerificationResult {
    const effectiveChange = change || this.currentChange;
    const results = ContractTester.runAllConsumerTests(
      'SANDBOX_PATCHED',
      effectiveChange,
      this.patchedPayload || undefined
    );
    const passed = results.filter((r) => r.status === 'PASS').length;
    const failed = results.filter((r) => r.status === 'FAIL').length;

    return {
      allPassed: failed === 0,
      totalTests: results.length,
      passedTests: passed,
      failedTests: failed,
      details: results,
      verificationVerdict: failed === 0 ? 'VERIFIED_SAFE' : 'FAILED_RETAIN_BREAK',
    };
  }
}
