import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header.js';
import { SimulationInputPanel } from './components/SimulationInputPanel.js';
import { ChangeInspector } from './components/ChangeInspector.js';
import { DependencyGraphView } from './components/DependencyGraphView.js';
import { HypothesesSection } from './components/HypothesesSection.js';
import { PatchDiffViewer } from './components/PatchDiffViewer.js';
import { VerificationBanner } from './components/VerificationBanner.js';
import { ToolExecutionTrace } from './components/ToolExecutionTrace.js';
import { AnalysisResponse, ProposedChange } from '../server/types/index.js';
import { ShieldCheck, Play, AlertCircle, RefreshCw, ArrowDownCircle, CheckCircle2 } from 'lucide-react';

export default function App() {
  const [analysisData, setAnalysisData] = useState<AnalysisResponse | null>(null);
  const [selectedChange, setSelectedChange] = useState<ProposedChange | undefined>(undefined);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [systemHealth, setSystemHealth] = useState<{ openAIConfigured: boolean } | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchHealth();
    // Run initial analysis once so page has rich context immediately
    runAgentAnalysis();
  }, []);

  const fetchHealth = async () => {
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        const data = await res.json();
        setSystemHealth(data);
      }
    } catch {
      // Fallback
    }
  };

  const runAgentAnalysis = async (customChange?: ProposedChange) => {
    setIsRunning(true);
    setError(null);
    try {
      const targetChange = customChange || selectedChange;
      const payload = targetChange
        ? { customChange: targetChange }
        : { scenarioId: 'employee-id-rename' };

      const response = await fetch('/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Server returned error ${response.status}: ${response.statusText}`);
      }

      const data: AnalysisResponse = await response.json();
      setAnalysisData(data);

      // Smooth scroll to results for video presentation
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 150);
    } catch (err: any) {
      console.error('Failed to run agent analysis:', err);
      setError(err?.message || 'Failed to connect to CausalGuard agent backend.');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Header
        onRunAnalysis={() => runAgentAnalysis(selectedChange)}
        isRunning={isRunning}
        hasExecuted={Boolean(analysisData)}
        openAIActive={systemHealth?.openAIConfigured}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
        {error && (
          <div className="p-4 rounded-xl bg-red-950/60 border border-red-800 text-red-200 text-sm flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => runAgentAnalysis(selectedChange)}
              className="px-3 py-1 bg-red-900/60 hover:bg-red-800 rounded font-medium text-xs text-white"
            >
              Retry
            </button>
          </div>
        )}

        {/* SECTION 1: INTERACTIVE INPUT CONSOLE */}
        <section aria-label="Input Console">
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-brand-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
              STEP 1: PROVIDE INPUT TO AGENT
            </span>
            <span className="text-xs text-slate-400">
              Customize or select a preset, then launch the agent
            </span>
          </div>

          <SimulationInputPanel
            onAnalyze={(change) => {
              setSelectedChange(change);
              runAgentAnalysis(change);
            }}
            onChangeSelected={(change) => setSelectedChange(change)}
            isRunning={isRunning}
          />
        </section>

        {/* Loading Spinner */}
        {isRunning && (
          <div className="flex flex-col items-center justify-center py-16 space-y-4 bg-slate-900/40 rounded-2xl border border-slate-800">
            <div className="w-14 h-14 rounded-2xl bg-brand-500/10 border border-brand-500/30 flex items-center justify-center animate-pulse">
              <RefreshCw className="w-7 h-7 text-brand-400 animate-spin" />
            </div>
            <div className="text-center">
              <h2 className="text-base font-bold text-white">Agentic Reasoning Loop Running...</h2>
              <p className="text-xs text-slate-400 max-w-md mt-1">
                Observing change ➔ Traversing dependency mesh ➔ Generating hypotheses ➔ Deterministic contract test ➔ Synthesizing sandbox patch ➔ Verifying resilience.
              </p>
            </div>
          </div>
        )}

        {/* SECTION 2: LIVE OUTPUT DASHBOARD */}
        {analysisData && (
          <section ref={resultsRef} className="space-y-8 animate-fadeIn pt-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 px-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  STEP 2: AGENT OUTPUT & VERIFICATION RESULTS
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 font-mono text-[11px] border border-emerald-500/30">
                  {analysisData.summary.verdict} (0 Failures)
                </span>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                Latency: {analysisData.summary.executionTimeMs}ms
              </span>
            </div>

            {/* Verification Success Banner */}
            {analysisData.verificationResult && (
              <VerificationBanner
                verification={analysisData.verificationResult}
                executionTimeMs={analysisData.summary.executionTimeMs}
              />
            )}

            {/* Observed Change Card */}
            <ChangeInspector change={analysisData.proposedChange} />

            {/* Dependency Graph */}
            <DependencyGraphView
              graph={analysisData.graph}
              affectedServices={analysisData.affectedServices}
              originalField={analysisData.proposedChange.originalField}
              newField={analysisData.proposedChange.newField}
              hasVerified={analysisData.verificationResult.allPassed}
            />

            {/* Competing Hypotheses & Pre-patch Contract Test Results */}
            <HypothesesSection
              hypotheses={analysisData.hypotheses}
              initialTests={analysisData.initialTestResults}
            />

            {/* Selected Intervention & Sandbox Patch Diff */}
            <PatchDiffViewer
              intervention={analysisData.chosenIntervention}
              sandboxResult={analysisData.sandboxResult}
            />

            {/* Full Agent Autonomous Reasoning Trace & Tool Calls */}
            <ToolExecutionTrace trace={analysisData.reasoningTrace} />
          </section>
        )}
      </main>

      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500">
        CausalGuard AI Agent • Production Quality Reliability MVP • Autonomous Observe → Reason → Act → Verify Loop
      </footer>
    </div>
  );
}
