import React from 'react';
import { FailureHypothesis, ContractTestResult } from '../../server/types/index.js';
import { Brain, FlaskConical, AlertTriangle, XCircle, CheckCircle2 } from 'lucide-react';

interface HypothesesSectionProps {
  hypotheses: FailureHypothesis[];
  initialTests: ContractTestResult[];
}

export const HypothesesSection: React.FC<HypothesesSectionProps> = ({
  hypotheses,
  initialTests,
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Hypotheses Column */}
      <div className="glass-panel rounded-xl p-5 border border-slate-800">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-800">
          <Brain className="w-5 h-5 text-purple-400" />
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
            LLM Competing Failure Hypotheses ({hypotheses.length})
          </h2>
        </div>

        <div className="space-y-3.5">
          {hypotheses.map((hyp, index) => (
            <div
              key={hyp.id || index}
              className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-all text-xs space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="font-semibold text-slate-100 flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-purple-500/20 text-purple-300 inline-flex items-center justify-center text-[10px] font-bold">
                    {index + 1}
                  </span>
                  {hyp.title}
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    hyp.severity === 'CATASTROPHIC'
                      ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                      : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                  }`}
                >
                  {hyp.severity}
                </span>
              </div>

              <p className="text-slate-300 leading-relaxed text-[11px]">
                {hyp.failureMechanism}
              </p>

              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                <span>
                  Target: <strong className="text-slate-200">{hyp.affectedService}</strong>
                </span>
                <span className="italic text-purple-300/80 font-mono text-[10px]">
                  {hyp.testableAssertion}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Contract Test Verification Column */}
      <div className="glass-panel rounded-xl p-5 border border-slate-800">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-amber-400" />
            <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
              Deterministic Contract Testing (Pre-Patch)
            </h2>
          </div>
          <span className="text-xs px-2 py-0.5 rounded bg-red-500/15 text-red-400 border border-red-500/30 font-bold">
            Unpatched Failures Detected
          </span>
        </div>

        <div className="space-y-3.5">
          {initialTests.map((test, index) => (
            <div
              key={index}
              className={`p-4 rounded-xl border text-xs space-y-2 ${
                test.status === 'FAIL'
                  ? 'bg-red-950/20 border-red-800/70'
                  : 'bg-emerald-950/20 border-emerald-800/70'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="font-semibold text-slate-100 flex items-center gap-2">
                  {test.status === 'FAIL' ? (
                    <XCircle className="w-4 h-4 text-red-400" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  )}
                  {test.consumerName}
                </div>
                <span
                  className={`font-mono text-[11px] px-2 py-0.5 rounded font-bold ${
                    test.status === 'FAIL'
                      ? 'bg-red-900/60 text-red-300'
                      : 'bg-emerald-900/60 text-emerald-300'
                  }`}
                >
                  HTTP {test.statusCode} {test.status}
                </span>
              </div>

              {test.errorMessage && (
                <div className="p-2.5 rounded bg-slate-950/80 font-mono text-[11px] text-red-300 border border-red-900/50 leading-relaxed overflow-x-auto">
                  {test.errorMessage}
                </div>
              )}

              <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                <span>Tested Field: <code className="text-amber-300">{test.testedField}</code></span>
                <span>Latency: {test.durationMs}ms</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
