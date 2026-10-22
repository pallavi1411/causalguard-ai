import { CausalGuardAgent } from '../server/agent/causalAgent.js';
import { SEEDED_PROPOSED_CHANGE } from '../server/contracts/registry.js';

async function main() {
  console.log('🚀 Running CausalGuard AI End-to-End Scenario Demo...\n');
  const agent = new CausalGuardAgent();
  const result = await agent.runAnalysis(SEEDED_PROPOSED_CHANGE);

  console.log('\n================================================================');
  console.log('🛡️  CAUSALGUARD AI — DEMO EXECUTION SUMMARY');
  console.log('================================================================');
  console.log(`[STATUS]             : ${result.summary.verdict}`);
  console.log(`[INITIAL BREAKS]     : ${result.summary.breakingCount} downstream services failed`);
  console.log(`[RESOLVED POST-PATCH]: ${result.summary.resolvedCount} downstream services verified PASS`);
  console.log(`[CHOSEN INTERVENTION]: ${result.chosenIntervention.title}`);
  console.log(`[BACKWARD COMPATIBLE]: ${result.chosenIntervention.backwardCompatible}`);
  console.log(`[EXECUTION DURATION] : ${result.summary.executionTimeMs}ms`);
  console.log(`[REASONING STEPS]    : ${result.reasoningTrace.length} steps recorded`);
  console.log('================================================================\n');

  console.log('Detailed Tool Calls Log:');
  result.reasoningTrace.forEach((step) => {
    if (step.toolCalls && step.toolCalls.length > 0) {
      step.toolCalls.forEach((tool) => {
        console.log(`  🔧 [${tool.toolName}] in ${tool.durationMs}ms`);
      });
    }
  });
  console.log('');
}

main().catch(console.error);
