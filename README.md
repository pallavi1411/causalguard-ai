# 🛡️ CausalGuard AI

> **Autonomous AI Agent that detects dangerous software contract mutations before they cause cascading failures across distributed microservices.**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-v20+-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.21-black.svg)](https://expressjs.com/)
[![React + Vite](https://img.shields.io/badge/React%20%2B%20Vite-Frontend-purple.svg)](https://vitejs.dev/)
[![Zod](https://img.shields.io/badge/Validation-Zod%20Strict-blueviolet.svg)](https://zod.dev/)
[![Tests](https://img.shields.io/badge/Unit%20Tests-5%20Passing-emerald.svg)]()

---

## 🎯 System Goal

In modern microservice architectures, an apparently harmless change in an upstream service (such as renaming or deprecating a JSON response field) frequently causes downstream service crashes, broken authentication pipelines, and data corruption in production.

**CausalGuard AI** is an autonomous reliability agent that closes the causal loop:
1. **Observe**: Ingests proposed API mutations from pull requests.
2. **Build Graph**: Constructs a live dependency mesh connecting endpoints, fields, and downstream consumers.
3. **Generate Hypotheses**: Uses an LLM with structured outputs to formulate competing failure paths.
4. **Test Hypotheses**: Deterministically tests consumer contracts to validate whether failure modes trigger runtime exceptions.
5. **Select Intervention**: Evaluates remediation strategies and selects the least disruptive backward-compatible pattern.
6. **Act**: Synthesizes and applies the compatibility patch in an isolated sandbox.
7. **Verify**: Re-executes the contract test suite against the sandboxed service to prove 100% failure resolution before deployment.

---

## 📦 Exact Demo Scenario

| Attribute | Baseline | Proposed Mutation |
| :--- | :--- | :--- |
| **Service** | `employee-directory-service` | `employee-directory-service` |
| **Endpoint** | `GET /api/v1/employees/:id` | `GET /api/v1/employees/:id` |
| **Field** | `employee_id` | `employee_code` |
| **Pull Request** | `#8492` | Renaming to align with v2 enterprise guidelines |

### Downstream Consumers at Risk
1. **`auth-service`**:
   - Consumes: `employee_id` (JWT Subject claim)
   - Failure: `NullPointerException: 'employee_id' is null or undefined! auth-service cannot mint JWT subject token.`
2. **`payroll-integration`**:
   - Consumes: `employee_id` (Accounting Ledger Foreign Key)
   - Failure: `SchemaValidationError: Missing mandatory foreign key 'employee_id'. Bi-weekly salary ledger update aborted.`

### CausalGuard Resolution
- Synthesizes the **Dual-Write Field Alias Pattern** inside the sandbox:
  ```typescript
  export function serializeEmployee(employeeRecord: EmployeeEntity) {
    return {
      employee_code: employeeRecord.id, // Fulfills new PR specification
      employee_id: employeeRecord.id,   // [CausalGuard Patch] Preserves legacy contract for auth & payroll
      full_name: employeeRecord.fullName,
      department: employeeRecord.department,
      email: employeeRecord.email,
      role: employeeRecord.role,
    };
  }
  ```
- Re-runs contract tests: **100% PASS** (HTTP 200 OK across both downstream services).

---

## 🛠️ Tech Stack

- **Runtime**: Node.js (v20+)
- **Language**: TypeScript (strict mode)
- **Backend API**: Express + TypeScript (`tsx` execution)
- **LLM Engine**: OpenAI SDK (`gpt-4o-mini` or `gpt-4o`) with structured Zod outputs and built-in intelligent fallback
- **Graphology**: Directed dependency graph engine with causal path tracing
- **Validation**: Zod (strict schema enforcement)
- **UI**: React 18, Vite, Tailwind CSS, Lucide icons
- **Environment**: `dotenv`

---

## 🗂️ Project Structure

```
causalguard-ai/
├── package.json                   # Dependencies, scripts (dev, test, demo, build)
├── tsconfig.json                  # TypeScript strict compiler config
├── tsconfig.server.json           # Server compilation config
├── vite.config.ts                 # Vite client build & proxy config
├── tailwind.config.js             # Tailwind theme & design tokens
├── postcss.config.js              # PostCSS plugins
├── index.html                     # HTML template
├── .env.example                   # Environment configuration template
├── .env                           # Local environment config
├── README.md                      # Complete system documentation
└── src/
    ├── server/
    │   ├── index.ts               # Express server, /analyze endpoint & formatted logger
    │   ├── types/
    │   │   └── index.ts           # Type definitions (contracts, graphs, traces, patches)
    │   ├── schemas/
    │   │   └── agentSchemas.ts    # Zod validation & OpenAI structured output schemas
    │   ├── contracts/
    │   │   ├── registry.ts        # Contract registry & mock consumer handlers
    │   │   └── contractTester.ts  # Deterministic contract testing engine
    │   ├── graph/
    │   │   └── dependencyGraph.ts # Graphology dependency engine & causal path analysis
    │   ├── sandbox/
    │   │   └── sandboxEnv.ts      # Isolated sandbox runtime & patch diff generator
    │   ├── agent/
    │   │   ├── tools.ts           # 5 agent tools with OpenAI function calling schemas
    │   │   ├── causalAgent.ts     # The 7-step autonomous agent loop
    │   │   └── llmService.ts      # OpenAI LLM client with structured output & fallback
    │   └── scenarios/
    │       └── seededScenarios.ts # Seeded scenarios (Employee ID rename, etc.)
    ├── client/
    │   ├── main.tsx               # React DOM entrypoint
    │   ├── App.tsx                # Main dashboard container
    │   ├── index.css              # Tailwind base + custom glassmorphism styles
    │   └── components/
    │       ├── Header.tsx         # Brand header, engine status, run trigger
    │       ├── ChangeInspector.tsx# Visual diff of incoming PR field mutation
    │       ├── DependencyGraphView.tsx # Architectural dependency map
    │       ├── HypothesesSection.tsx   # LLM failure hypotheses & test results
    │       ├── PatchDiffViewer.tsx     # Colorized git diff of chosen intervention
    │       ├── VerificationBanner.tsx  # Verified safe badge & pass metrics
    │       └── ToolExecutionTrace.tsx  # Step-by-step reasoning & tool call details
    └── tests/
        ├── contractTester.test.ts # Deterministic unit test suite
        └── runDemo.ts             # CLI demo script
```

---

## 🚀 Quickstart & How to Run

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Open `.env` and add your OpenAI API key (optional — if omitted, CausalGuard seamlessly runs its deterministic reasoning engine so the entire agentic loop executes flawlessly):
```ini
PORT=3000
OPENAI_API_KEY=sk-...your-key...
OPENAI_MODEL=gpt-4o-mini
```

### Step 3: Run the Application
```bash
npm run dev
```
Open your browser to:
👉 **`http://localhost:3000`**

---

## 🧪 Unit Testing

Run the deterministic contract test suite:
```bash
npm test
```
Sample test output:
```
# Subtest: CausalGuard AI - Deterministic Contract Testing Suite
    ok 1 - 1. Dependency Graph identifies both auth-service and payroll-integration as consumers of employee_id
    ok 2 - 2. Unpatched proposed change triggers contract failure in auth-service
    ok 3 - 3. Unpatched proposed change triggers contract failure in payroll-integration
    ok 4 - 4. Applying DUAL_WRITE_ALIAS intervention patch in Sandbox retains backward compatibility
# tests 5
# pass 5
# fail 0
```

---

## ⚡ CLI Demo Run

To execute the agent directly in your terminal:
```bash
npm run demo
```

---

## 🔧 Tools Called by the Agent

| Tool Name | Purpose | Input Schema |
| :--- | :--- | :--- |
| `get_dependency_graph` | Constructs the service-field-consumer dependency graph and causal paths | `{ serviceName, targetField }` |
| `get_affected_services` | Traces which downstream consumers depend on a specific field | `{ serviceName, fieldName }` |
| `run_contract_test` | Deterministically tests consumer contracts against unpatched or patched payloads | `{ serviceName, consumerName, payloadVariant }` |
| `apply_compatibility_patch` | Synthesizes and applies a backward-compatible adapter inside the sandbox | `{ serviceName, strategy, originalField, newField }` |
| `run_verification` | Executes end-to-end contract test battery against the sandboxed service | `{ serviceName, consumers }` |

---

## 🛡️ Sample API Run (`POST /analyze`)

### Request
```bash
curl -X POST http://localhost:3000/analyze \
  -H "Content-Type: application/json" \
  -d '{"scenarioId": "employee-id-rename"}'
```

### Console Output
```text
================================================================
🛡️  CAUSALGUARD AI — AUTONOMOUS RUN LOG
================================================================
[1. OBSERVED CHANGE] : PR #8492 in employee-directory-service
    Renaming field 'employee_id' -> 'employee_code' on /api/v1/employees/:id
[2. DEPENDENCY GRAPH]: Discovered 2 downstream consumers:
    ├── Consumer: auth-service (Requires: employee_id)
    ├── Consumer: payroll-integration (Requires: employee_id)
[3. HYPOTHESES GENERATED]:
    1. [CATASTROPHIC] Authentication Token Generation Crash in auth-service
       Target: auth-service | Mechanism: The authentication gateway expects 'employee_id' as the primary Subject Identifier...
    2. [CATASTROPHIC] Payroll Ledger Foreign Key Schema Validation Abort
       Target: payroll-integration | Mechanism: The payroll synchronization worker runs automated accounting batches...
    3. [HIGH] Legacy SDK Deserialization & Silent Dropped Fields
       Target: internal-microservice-mesh | Mechanism: Unversioned internal clients deserializing employee payloads...
[4. INITIAL CONTRACT TEST RESULTS]:
    ❌ auth-service: FAIL (HTTP 500) - NullPointerException: 'employee_id' is null or undefined! auth-service cannot mint JWT subject token.
    ❌ payroll-integration: FAIL (HTTP 500) - SchemaValidationError: Missing mandatory foreign key 'employee_id'...
[5. CHOSEN INTERVENTION]: Dual-Write Field Alias Pattern (Safe Migration)
    Type: DUAL_WRITE_ALIAS | Risk: LOW | Backward Compatible: true
[6. SANDBOX PATCH APPLIED]:
    Sandbox ID: sandbox-16w5jd3
[7. VERIFICATION RESULTS]:
    ✅ auth-service: PASS (HTTP 200) - Verified with patch!
    ✅ payroll-integration: PASS (HTTP 200) - Verified with patch!
    ✅ hr-analytics-dashboard: PASS (HTTP 200) - Verified with patch!
    >>> FINAL VERDICT: VERIFIED_SAFE (0 downstream failures)
================================================================
```
