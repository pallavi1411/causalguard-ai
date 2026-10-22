import React from 'react';
import { GitPullRequest, ArrowRight, AlertTriangle, User, Server } from 'lucide-react';
import { ProposedChange } from '../../server/types/index.js';

interface ChangeInspectorProps {
  change: ProposedChange;
}

export const ChangeInspector: React.FC<ChangeInspectorProps> = ({ change }) => {
  return (
    <div className="glass-panel rounded-xl p-5 border border-slate-800">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <GitPullRequest className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-white">Pull Request #{change.prNumber}</span>
              <span className="px-2 py-0.5 rounded text-xs font-mono bg-purple-500/10 text-purple-300 border border-purple-500/20">
                {change.changeType}
              </span>
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" /> {change.author}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 font-mono">
                <Server className="w-3 h-3" /> {change.serviceName}
              </span>
            </p>
          </div>
        </div>

        {/* Mutation Visualizer */}
        <div className="flex items-center gap-2.5 bg-slate-900/90 px-3.5 py-2 rounded-lg border border-slate-700/60 font-mono text-xs w-full lg:w-auto justify-center">
          <span className="text-slate-400">Endpoint:</span>
          <span className="text-blue-400 font-semibold">{change.endpoint}</span>
          <span className="text-slate-600">|</span>
          <span className="px-2 py-0.5 rounded bg-red-950/60 text-red-300 border border-red-800 line-through">
            {change.originalField}
          </span>
          <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
          <span className="px-2 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-800 font-bold">
            {change.newField}
          </span>
        </div>
      </div>

      <div className="mt-3.5 flex items-start gap-3 text-xs text-slate-300">
        <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="text-amber-300">Observed Intent: </strong>
          {change.description}.
          <span className="text-slate-400 block mt-0.5">
            CausalGuard detected this mutation in CI and intercepted it before deployment to analyze downstream microservice dependencies.
          </span>
        </p>
      </div>
    </div>
  );
};
