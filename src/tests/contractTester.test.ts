import test from 'node:test';
import assert from 'node:assert/strict';
import { ContractTester } from '../server/contracts/contractTester.js';
import { DependencyGraphEngine } from '../server/graph/dependencyGraph.js';
import { SandboxEnvironment } from '../server/sandbox/sandboxEnv.js';
import { SEEDED_PROPOSED_CHANGE } from '../server/contracts/registry.js';

test('CausalGuard AI - Deterministic Contract Testing Suite', async (t) => {
  await t.test('1. Dependency Graph identifies both auth-service and payroll-integration as consumers of employee_id', () => {
    const graphEngine = new DependencyGraphEngine();
    const affected = graphEngine.getAffectedConsumers('employee-directory-service', 'employee_id');

    assert.ok(affected.includes('auth-service'), 'Expected auth-service to be identified as dependent on employee_id');
    assert.ok(affected.includes('payroll-integration'), 'Expected payroll-integration to be identified as dependent on employee_id');
    assert.equal(affected.length, 2, 'Expected exactly 2 direct downstream consumers for employee_id');
  });

  await t.test('2. Unpatched proposed change triggers contract failure in auth-service', () => {
    const result = ContractTester.testConsumerContract('auth-service', 'PROPOSED_UNPATCHED');

    assert.equal(result.status, 'FAIL', 'auth-service must fail on unpatched payload');
    assert.equal(result.statusCode, 500);
    assert.match(
      result.errorMessage || '',
      /NullPointerException.*employee_id/i,
      'auth-service must throw NullPointerException due to missing employee_id'
    );
  });

  await t.test('3. Unpatched proposed change triggers contract failure in payroll-integration', () => {
    const result = ContractTester.testConsumerContract('payroll-integration', 'PROPOSED_UNPATCHED');

    assert.equal(result.status, 'FAIL', 'payroll-integration must fail on unpatched payload');
    assert.equal(result.statusCode, 500);
    assert.match(
      result.errorMessage || '',
      /SchemaValidationError.*employee_id/i,
      'payroll-integration must reject transaction due to missing employee_id'
    );
  });

  await t.test('4. Applying DUAL_WRITE_ALIAS intervention patch in Sandbox retains backward compatibility', () => {
    const sandbox = new SandboxEnvironment();
    const patchResult = sandbox.applyPatch('DUAL_WRITE_ALIAS', 'employee_id', 'employee_code');

    assert.equal(patchResult.status, 'APPLIED');
    assert.ok(patchResult.diffPreview.includes('+    employee_id: employeeRecord.id'), 'Diff must contain dual-write alias');

    // Run verification
    const verification = sandbox.runVerification();

    assert.equal(verification.allPassed, true, 'All downstream contracts must pass after dual-write alias is applied');
    assert.equal(verification.failedTests, 0, 'Zero failed tests expected');
    assert.equal(verification.verificationVerdict, 'VERIFIED_SAFE');

    const authResult = verification.details.find((d) => d.consumerName === 'auth-service');
    assert.equal(authResult?.status, 'PASS');

    const payrollResult = verification.details.find((d) => d.consumerName === 'payroll-integration');
    assert.equal(payrollResult?.status, 'PASS');
  });

  await t.test('5. Dynamic behavior: Removing department breaks payroll and hr-analytics, leaves auth-service PASSING', () => {
    const deptChange = {
      id: 'PR-8510-MUTATE-DEPARTMENT',
      serviceName: 'employee-directory-service',
      endpoint: '/api/v1/employees/:id',
      changeType: 'FIELD_REMOVAL' as const,
      originalField: 'department',
      description: 'Deprecate department string field',
      author: 'infra-team@acme.corp',
      prNumber: 8510,
    };

    // auth-service does not consume department -> must PASS
    const authResult = ContractTester.testConsumerContract('auth-service', 'PROPOSED_UNPATCHED', deptChange);
    assert.equal(authResult.status, 'PASS', 'auth-service must remain PASS when department is removed');

    // payroll-integration consumes department -> must FAIL with CostCenterAllocationError
    const payrollResult = ContractTester.testConsumerContract('payroll-integration', 'PROPOSED_UNPATCHED', deptChange);
    assert.equal(payrollResult.status, 'FAIL', 'payroll-integration must fail when department is removed');
    assert.match(payrollResult.errorMessage || '', /CostCenterAllocationError/i);

    // hr-analytics-dashboard consumes department -> must FAIL with AnalyticsAggregationError
    const hrResult = ContractTester.testConsumerContract('hr-analytics-dashboard', 'PROPOSED_UNPATCHED', deptChange);
    assert.equal(hrResult.status, 'FAIL', 'hr-analytics-dashboard must fail when department is removed');
    assert.match(hrResult.errorMessage || '', /AnalyticsAggregationError/i);
  });
});
