import { ProposedChange } from '../types/index.js';
import { SEEDED_PROPOSED_CHANGE } from '../contracts/registry.js';

export const ALL_SCENARIOS: Record<string, ProposedChange> = {
  'employee-id-rename': SEEDED_PROPOSED_CHANGE,
  'auth-scope-mutation': {
    id: 'PR-8510-MUTATE-AUTH-SCOPE',
    serviceName: 'employee-directory-service',
    endpoint: '/api/v1/employees/:id',
    changeType: 'FIELD_REMOVAL',
    originalField: 'department',
    description: 'Deprecate department string field in favor of new organizational unit taxonomy service',
    author: 'infra-team@acme.corp',
    prNumber: 8510,
  },
};
