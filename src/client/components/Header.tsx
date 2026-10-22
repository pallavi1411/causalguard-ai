import React from 'react';
import { ShieldAlert, Play, CheckCircle2, Cpu, RefreshCw } from 'lucide-react';

interface HeaderProps {
  onRunAnalysis: () => void;
  isRunning: boolean;
  hasExecuted: boolean;
  openAIActive?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onRunAnalysis,
  isRunning,
  hasExecuted,
  openAIActive,
}) => {
  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-emerald-400 flex items-center justify-center shadow-lg shadow-brand-500/20">
            <ShieldAlert className="w-6 h-6 text-slate-950 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white">CausalGuard AI</h1>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20">
                Agentic Reliability
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Autonomous Breaking Change Detection & Interventions
            </p>
          </div>
        </div>

        {/* Status Badges & Action */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs">
            <Cpu className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-slate-400">Engine:</span>
            <span className="font-medium text-slate-200">
              {openAIActive ? 'OpenAI gpt-4o-mini' : 'Deterministic / OpenAI Hybrid'}
            </span>
          </div>

          <button
            onClick={onRunAnalysis}
            disabled={isRunning}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 shadow-md ${
              isRunning
                ? 'bg-slate-700 text-slate-300 cursor-not-allowed'
                : hasExecuted
                ? 'bg-brand-600 hover:bg-brand-500 text-white shadow-brand-600/25 active:scale-95'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/25 animate-pulse active:scale-95'
            }`}
          >
            {isRunning ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-brand-300" />
                <span>Running Agent Loop...</span>
              </>
            ) : hasExecuted ? (
              <>
                <RefreshCw className="w-4 h-4" />
                <span>Re-Run Agent Analysis</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Run Autonomous Analysis</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
