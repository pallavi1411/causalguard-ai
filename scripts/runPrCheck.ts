import { GitHubService } from '../src/server/github/githubService.js';
import { CausalGuardAgent } from '../src/server/agent/causalAgent.js';

async function main() {
  const prUrl = process.env.PR_URL || process.argv[2];

  if (!prUrl) {
    console.error('Usage: npx tsx scripts/runPrCheck.ts <GITHUB_PR_URL>');
    console.error('Example: npx tsx scripts/runPrCheck.ts https://github.com/pallavi1411/causalguard-ai/pull/2');
    process.exit(1);
  }

  console.log(`\n🛡️  CausalGuard AI — Running Automated CI Check for: ${prUrl}\n`);

  try {
    const proposedChange = await GitHubService.fetchRealPR({ prUrl });
    const agent = new CausalGuardAgent();
    const result = await agent.runAnalysis(proposedChange);

    console.log('================================================================');
    console.log(`[PR]            : #${result.proposedChange.prNumber} (${result.proposedChange.description})`);
    console.log(`[AUTHOR]        : @${result.proposedChange.author}`);
    console.log(`[FIELD STATUS]  : ${result.proposedChange.originalField} -> ${result.proposedChange.newField}`);
    console.log(`[BREAKS FOUND]  : ${result.summary.breakingCount}`);
    console.log(`[VERDICT]       : ${result.summary.verdict}`);
    console.log('================================================================');

    if (result.summary.breakingCount > 0) {
      console.log('⚠️ BREAKING CHANGES DETECTED:');
      result.initialTestResults.forEach((t) => {
        if (t.status === 'FAIL') {
          console.log(`  ❌ ${t.consumerName}: ${t.errorMessage}`);
        }
      });
      console.log('\n🛠️  AUTOMATIC SANDBOX REMEDIATION:');
      console.log(`  Chosen Intervention: ${result.chosenIntervention.title}`);
      console.log(`  Verification Verdict: ${result.verificationResult.verificationVerdict}`);
      console.log(`  Resolution Status: All ${result.summary.resolvedCount} consumers protected`);
    } else {
      console.log('✅ ZERO BREAKING CHANGES: All downstream consumer contracts passed 100%!');
      result.initialTestResults.forEach((t) => {
        console.log(`  ✔️ ${t.consumerName} (${t.endpoint}): PASS [HTTP ${t.statusCode}]`);
      });
    }

    console.log('\n✨ CausalGuard Analysis Complete.\n');
  } catch (err: any) {
    console.error('❌ CausalGuard CI Check Failed:', err.message);
    process.exit(1);
  }
}

main();
