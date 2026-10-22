import { DownstreamConsumer, ServiceContract, ProposedChange } from '../types/index.js';

/**
 * Service Contract Registry & Downstream Consumer Mock Specifications
 * Supports dynamic validation for any field: employee_id, department, email, role, full_name, or custom fields.
 */

export const EMPLOYEE_SERVICE_CONTRACT: ServiceContract = {
  serviceName: 'employee-directory-service',
  endpoint: '/api/v1/employees/:id',
  method: 'GET',
  version: 'v1.4.0',
  fields: {
    employee_id: {
      name: 'employee_id',
      type: 'string',
      required: true,
      description: 'Unique corporate employee identifier (UUID or EMP-XXXX)',
    },
    full_name: {
      name: 'full_name',
      type: 'string',
      required: true,
      description: 'Full legal name of the employee',
    },
    department: {
      name: 'department',
      type: 'string',
      required: true,
      description: 'Department unit allocation',
    },
    email: {
      name: 'email',
      type: 'string',
      required: true,
      description: 'Primary corporate email address',
    },
    role: {
      name: 'role',
      type: 'string',
      required: true,
      description: 'Organizational job title',
    },
  },
};

export const DOWNSTREAM_CONSUMERS: DownstreamConsumer[] = [
  {
    consumerName: 'auth-service',
    serviceTarget: 'employee-directory-service',
    endpoint: '/api/v1/employees/:id',
    consumedFields: ['employee_id', 'email', 'role'],
    failureMode: 'Session crash & JWT minting failure: missing employee_id subject token claim',
    criticality: 'CRITICAL',
    mockHandler: (payload: Record<string, any>) => {
      if (!payload || typeof payload !== 'object') {
        return { success: false, error: 'Empty or invalid JSON payload received' };
      }
      if (!payload.employee_id) {
        return {
          success: false,
          error: "NullPointerException: 'employee_id' is null or undefined! auth-service cannot mint JWT subject token.",
        };
      }
      if (!payload.email) {
        return {
          success: false,
          error: "AuthIdentityException: Mandatory claim 'email' is missing from employee payload.",
        };
      }
      if (!payload.role) {
        return {
          success: false,
          error: "RBACAuthorizationException: 'role' is missing; cannot resolve permission scopes.",
        };
      }
      return { success: true };
    },
  },
  {
    consumerName: 'payroll-integration',
    serviceTarget: 'employee-directory-service',
    endpoint: '/api/v1/employees/:id',
    consumedFields: ['employee_id', 'department', 'full_name'],
    failureMode: 'Direct deposit ledger sync aborted: missing foreign key employee_id or cost-center department',
    criticality: 'CRITICAL',
    mockHandler: (payload: Record<string, any>) => {
      if (!payload || typeof payload !== 'object') {
        return { success: false, error: 'Empty or invalid JSON payload received' };
      }
      if (!payload.employee_id) {
        return {
          success: false,
          error: "SchemaValidationError: Missing mandatory foreign key 'employee_id'. Bi-weekly salary ledger update aborted to prevent corrupted payroll disbursement.",
        };
      }
      if (!payload.department) {
        return {
          success: false,
          error: "CostCenterAllocationError: Mandatory field 'department' missing from employee payload. Cannot allocate payroll expense ledger to organizational unit.",
        };
      }
      if (!payload.full_name) {
        return {
          success: false,
          error: "PayrollDisbursementError: Mandatory field 'full_name' missing on payroll wire transfer.",
        };
      }
      return { success: true };
    },
  },
  {
    consumerName: 'hr-analytics-dashboard',
    serviceTarget: 'employee-directory-service',
    endpoint: '/api/v1/employees/:id',
    consumedFields: ['department', 'role'],
    failureMode: 'Aggregate metric reporting degraded when department or role missing',
    criticality: 'MEDIUM',
    mockHandler: (payload: Record<string, any>) => {
      if (!payload || typeof payload !== 'object') {
        return { success: false, error: 'Empty or invalid JSON payload received' };
      }
      if (!payload.department) {
        return {
          success: false,
          error: "AnalyticsAggregationError: Missing 'department' dimension. Headcount reporting and diversity metrics failed to aggregate.",
        };
      }
      if (!payload.role) {
        return {
          success: false,
          error: "TaxonomyGroupingError: Missing 'role' attribute. Job family distribution analysis aborted.",
        };
      }
      return { success: true };
    },
  },
];

export const SEEDED_PROPOSED_CHANGE: ProposedChange = {
  id: 'PR-8492-RENAME-EMPLOYEE-ID',
  serviceName: 'employee-directory-service',
  endpoint: '/api/v1/employees/:id',
  changeType: 'FIELD_RENAME',
  originalField: 'employee_id',
  newField: 'employee_code',
  description: 'Refactor employee identifier field from employee_id to employee_code to align with modern Enterprise API guidelines v2',
  author: 'dev-alex@acme.corp',
  prNumber: 8492,
};

export const BASELINE_PAYLOAD: Record<string, any> = {
  employee_id: 'EMP-90210',
  full_name: 'Sarah Chen',
  department: 'Core Infrastructure',
  email: 'sarah.chen@techcorp.internal',
  role: 'Staff Systems Architect',
};

/**
 * Dynamically builds an unpatched payload reflecting ANY proposed change
 */
export function buildUnpatchedPayload(change: ProposedChange): Record<string, any> {
  const payload = { ...BASELINE_PAYLOAD };

  if (change.changeType === 'FIELD_RENAME') {
    const val = payload[change.originalField] || 'EMP-90210';
    delete payload[change.originalField];
    if (change.newField) {
      payload[change.newField] = val;
    }
  } else if (change.changeType === 'FIELD_REMOVAL') {
    delete payload[change.originalField];
  } else if (change.changeType === 'TYPE_MUTATION') {
    payload[change.originalField] = 999999;
  } else if (change.changeType === 'OPTIONAL_TO_REQUIRED') {
    delete payload[change.originalField];
  }

  return payload;
}
