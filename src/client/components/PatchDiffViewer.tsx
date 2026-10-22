import React from 'react';
import { InterventionOption, PatchApplicationResult } from '../../server/types/index.js';
import { Sparkles, Code2, ShieldCheck, Check } from 'lucide-react';

interface PatchDiffViewerProps {
  intervention: InterventionOption;
  sandboxResult: PatchApplicationResult;
}

export const PatchDiffViewer: React.FC<PatchDiffViewerProps> = ({
  intervention,
  sandboxResult,
}) => {
  return (
    <div className="glass-panel-glow rounded-xl p-5 border border-brand-500/30">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-brand-400" />
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
            Safe Intervention: {intervention.title}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-brand-500/15 text-brand-300 border border-brand-500/30">
            Backward Compatible: YES
          </span>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/15 text-blue-300 border border-blue-500/30">
            Risk: LOW
          </span>
        </div>
      </div>

      <p className="text-xs text-slate-300 mb-4 leading-relaxed">
        {intervention.description}
      </p>

      {/* Benefits grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4 text-xs">
        {intervention.pros.map((pro, i) => (
          <div key={i} className="flex items-center gap-2 text-slate-300">
            <Check className="w-3.5 h-3.5 text-brand-400 flex-shrink-0" />
            <span>{pro}</span>
          </div>
        ))}
      </div>

      {/* Unified Diff */}
      <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950 text-xs font-mono">
        <div className="px-4 py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-slate-400 text-[11px]">
          <span className="flex items-center gap-2">
            <Code2 className="w-3.5 h-3.5 text-slate-400" />
            src/controllers/employeeSerializer.ts
          </span>
          <span className="text-[10px] text-slate-400">
            Sandbox ID: {sandboxResult.sandboxEnvId}
          </span>
        </div>

        <div className="p-4 space-y-1 overflow-x-auto leading-relaxed">
          {sandboxResult.diffPreview.split('\n').map((line, idx) => {
            const isAdd = line.startsWith('+') && !line.startsWith('+++');
            const isSub = line.startsWith('-') && !line.startsWith('---');
            const isMeta = line.startsWith('@@') || line.startsWith('---') || line.startsWith('+++');

            let className = 'text-slate-400';
            let bg = 'bg-transparent';

            if (isAdd) {
              className = 'text-emerald-300 font-semibold';
              bg = 'bg-emerald-950/40 px-1 rounded';
            } else if (isSub) {
              className = 'text-red-400 line-through';
              bg = 'bg-red-950/30 px-1 rounded';
            } else if (isMeta) {
              className = 'text-purple-400 font-semibold';
            }

            return (
              <div key={idx} className={`${bg} py-0.5 whitespace-pre`}>
                <span className={className}>{line}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
