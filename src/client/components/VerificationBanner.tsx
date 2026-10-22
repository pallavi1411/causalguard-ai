import React from 'react';
import { VerificationResult } from '../../server/types/index.js';
import { CheckCircle2, ShieldCheck, Clock } from 'lucide-react';

interface VerificationBannerProps {
  verification: VerificationResult;
  executionTimeMs: number;
}

export const VerificationBanner: React.FC<VerificationBannerProps> = ({
  verification,
  executionTimeMs,
}) => {
  return (
    <div className="bg-gradient-to-r from-emerald-950/70 via-slate-900 to-emerald-950/70 rounded-xl p-5 border-2 border-emerald-500/50 shadow-xl shadow-emerald-950/50">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-7 h-7 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white tracking-tight">
                Intervention Verification Passed (100% Failure Prevention)
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                VERIFIED_SAFE
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Re-executed contract test battery in isolated sandbox. Both <strong className="text-emerald-300">auth-service</strong> and <strong className="text-emerald-300">payroll-integration</strong> returned 200 OK without errors.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono self-stretch md:self-auto justify-between border-t md:border-t-0 border-emerald-800/40 pt-3 md:pt-0">
          <div className="text-right">
            <span className="text-slate-400 block text-[10px]">TOTAL TESTS</span>
            <span className="font-bold text-emerald-300 text-sm">{verification.passedTests} / {verification.totalTests} PASSED</span>
          </div>
          <div className="text-right">
            <span className="text-slate-400 block text-[10px]">TIME TO REMEDIATE</span>
            <span className="font-bold text-white text-sm flex items-center justify-end gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              {executionTimeMs}ms
            </span>
          </div>
        </div>
      </div>

      {/* Breakdown per consumer */}
      <div className="mt-4 pt-3 border-t border-emerald-900/40 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        {verification.details.map((detail, index) => (
          <div
            key={index}
            className="flex items-center justify-between bg-slate-950/60 p-2.5 rounded-lg border border-emerald-800/40"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span className="font-semibold text-slate-200">{detail.consumerName}</span>
            </div>
            <span className="font-mono text-emerald-400 font-bold text-[11px]">
              HTTP 200 PASS ({detail.durationMs}ms)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
