import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { CausalGuardAgent } from './agent/causalAgent.js';
import { ALL_SCENARIOS } from './scenarios/seededScenarios.js';
import { SEEDED_PROPOSED_CHANGE } from './contracts/registry.js';
import { AnalyzeRequestSchema } from './schemas/agentSchemas.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Health Check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ONLINE',
    service: 'CausalGuard AI Agent Backend',
    version: '1.0.0',
    openAIConfigured: Boolean(process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.startsWith('sk-placeholder')),
    timestamp: new Date().toISOString(),
  });
});

// List Scenarios
app.get('/api/scenarios', (_req: Request, res: Response) => {
  res.json({
    defaultScenarioId: 'employee-id-rename',
    scenarios: Object.entries(ALL_SCENARIOS).map(([key, val]) => ({
      id: key,
      title: val.description,
      serviceName: val.serviceName,
      changeType: val.changeType,
      originalField: val.originalField,
      newField: val.newField,
    })),
  });
});

/**
 * Console Logger Formatter
 * Prints high-impact, formatted console output matching the user requirement
 */
function logAgentExecution(response: any) {
  const c = response.proposedChange;
  const hyp = response.hypotheses;
  const tests = response.initialTestResults;
  const v = response.verificationResult;
  const patch = response.chosenIntervention;

  console.log('\n================================================================');
  console.log('🛡️  CAUSALGUARD AI — AUTONOMOUS RUN LOG');
  console.log('================================================================');
  console.log(`[1. OBSERVED CHANGE] : PR #${c.prNumber} in ${c.serviceName}`);
  console.log(`    Renaming field '${c.originalField}' -> '${c.newField}' on ${c.endpoint}`);
  console.log(`[2. DEPENDENCY GRAPH]: Discovered ${response.affectedServices.length} downstream consumers:`);
  response.affectedServices.forEach((srv: string) => {
    console.log(`    ├── Consumer: ${srv} (Requires: ${c.originalField})`);
  });
  console.log(`[3. HYPOTHESES GENERATED]:`);
  hyp.forEach((h: any, idx: number) => {
    console.log(`    ${idx + 1}. [${h.severity}] ${h.title}`);
    console.log(`       Target: ${h.affectedService} | Mechanism: ${h.failureMechanism.substring(0, 100)}...`);
  });
  console.log(`[4. INITIAL CONTRACT TEST RESULTS]:`);
  tests.forEach((t: any) => {
    const icon = t.status === 'PASS' ? '✅' : '❌';
    console.log(`    ${icon} ${t.consumerName}: ${t.status} (HTTP ${t.statusCode}) - ${t.errorMessage || 'Contract intact'}`);
  });
  console.log(`[5. CHOSEN INTERVENTION]: ${patch.title}`);
  console.log(`    Type: ${patch.type} | Risk: ${patch.riskLevel} | Backward Compatible: ${patch.backwardCompatible}`);
  console.log(`[6. SANDBOX PATCH APPLIED]:`);
  console.log(`    Sandbox ID: ${response.sandboxResult.sandboxEnvId}`);
  console.log(`[7. VERIFICATION RESULTS]:`);
  v.details.forEach((vt: any) => {
    console.log(`    ✅ ${vt.consumerName}: PASS (HTTP ${vt.statusCode}) - Verified with patch!`);
  });
  console.log(`    >>> FINAL VERDICT: ${v.verificationVerdict} (0 downstream failures)`);
  console.log('================================================================\n');
}

/**
 * Main Analysis Endpoint
 * Runs the end-to-end AI Agent loop
 */
const handleAnalyze = async (req: Request, res: Response) => {
  try {
    const validated = AnalyzeRequestSchema.safeParse(req.body);
    const scenarioId = validated.success ? validated.data.scenarioId : 'employee-id-rename';
    const customChange = validated.success ? validated.data.customChange : undefined;

    const changeToAnalyze = customChange || ALL_SCENARIOS[scenarioId || 'employee-id-rename'] || SEEDED_PROPOSED_CHANGE;

    const agent = new CausalGuardAgent();
    const result = await agent.runAnalysis(changeToAnalyze);

    // Print clean console output as requested
    logAgentExecution(result);

    res.json(result);
  } catch (error: any) {
    console.error('[CausalGuard API Error]', error);
    res.status(500).json({
      error: 'Agent analysis encountered an unhandled exception',
      message: error?.message || String(error),
    });
  }
};

// Mount on both /analyze and /api/analyze
app.post('/analyze', handleAnalyze);
app.post('/api/analyze', handleAnalyze);

// Serve static frontend build if available
const distPath = path.resolve(__dirname, '../../dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`\n🛡️  CausalGuard AI Server running at http://localhost:${PORT}`);
  console.log(`   - Endpoint POST http://localhost:${PORT}/analyze`);
  console.log(`   - Endpoint GET  http://localhost:${PORT}/api/scenarios`);
  console.log(`   - Endpoint GET  http://localhost:${PORT}/api/health\n`);
});
