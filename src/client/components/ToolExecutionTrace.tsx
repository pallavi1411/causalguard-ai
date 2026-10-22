import React, { useState } from 'react';
import { AgentStepTrace, ToolCallRecord } from '../../server/types/index.js';
import { Terminal, ChevronDown, ChevronRight, Wrench, CheckCircle, AlertTriangle } from 'lucide-react';

interface ToolExecutionTraceProps {
  trace: AgentStepTrace[];
}

export const ToolExecutionTrace: React.FC<ToolExecutionTraceProps> = ({ trace }) => {
  const [expandedStep, setExpandedStep] = useState<number | null>(null);
  const [expandedTool, setExpandedTool] = useState<string | null>(null);

  const toggleStep = (stepNumber: number) => {
    setExpandedStep(expandedStep === stepNumber ? null : stepNumber);
  };

  const toggleTool = (toolId: string) => {
    setExpandedTool(expandedTool === toolId ? null : toolId);
  };

  return (
    <div className="glass-panel rounded-xl p-5 border border-slate-800">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Terminal className="w-5 h-5 text-emerald-400" />
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
            Agent Autonomous Reasoning Trace & Tool Calls ({trace.length} Steps)
          </h2>
        </div>
        <span className="text-xs text-slate-400 font-mono">
          Observe → Reason → Act → Verify
        </span>
      </div>

      <div className="space-y-3">
        {trace.map((step) => {
          const isExpanded = expandedStep === step.stepNumber;
          const hasTools = step.toolCalls && step.toolCalls.length > 0;

          return (
            <div
              key={step.stepNumber}
              className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden text-xs transition-all"
            >
              {/* Step Header */}
              <button
                onClick={() => toggleStep(step.stepNumber)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-800/40 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center font-bold text-[10px] border border-slate-700">
                    {step.stepNumber}
                  </span>
                  <div>
                    <span className="font-semibold text-slate-100">{step.title}</span>
                    <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{step.detail}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {hasTools && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 flex items-center gap-1">
                      <Wrench className="w-3 h-3" />
                      {step.toolCalls!.length} Tool Call{step.toolCalls!.length > 1 ? 's' : ''}
                    </span>
                  )}
                  {step.status === 'COMPLETED' ? (
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                  ) : step.status === 'WARNING' ? (
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                  )}
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              </button>

              {/* Step Details & Tool Calls */}
              {isExpanded && (
                <div className="px-4 py-3 bg-slate-950/80 border-t border-slate-800 space-y-3">
                  <p className="text-slate-300 leading-relaxed text-[11px]">
                    {step.detail}
                  </p>

                  {/* Tool Call Logs */}
                  {hasTools && (
                    <div className="space-y-2 pt-2 border-t border-slate-800/80">
                      <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                        Executed Tool Calls:
                      </span>
                      {step.toolCalls!.map((tool) => (
                        <div
                          key={tool.id}
                          className="rounded-lg border border-slate-800 bg-slate-900 overflow-hidden font-mono text-[11px]"
                        >
                          <button
                            onClick={() => toggleTool(tool.id)}
                            className="w-full px-3 py-2 flex items-center justify-between text-left hover:bg-slate-800/40"
                          >
                            <span className="text-brand-300 font-bold flex items-center gap-1.5">
                              <Wrench className="w-3.5 h-3.5 text-brand-400" />
                              {tool.toolName}
                            </span>
                            <span className="text-slate-400 text-[10px]">
                              {tool.durationMs}ms
                            </span>
                          </button>

                          {expandedTool === tool.id && (
                            <div className="p-3 bg-slate-950 border-t border-slate-800 space-y-2 text-[10px]">
                              <div>
                                <span className="text-slate-400 block font-semibold mb-0.5">Arguments:</span>
                                <pre className="p-2 rounded bg-slate-900 text-slate-300 overflow-x-auto">
                                  {JSON.stringify(tool.arguments, null, 2)}
                                </pre>
                              </div>
                              <div>
                                <span className="text-slate-400 block font-semibold mb-0.5">Return Value:</span>
                                <pre className="p-2 rounded bg-slate-900 text-emerald-300 overflow-x-auto max-h-48">
                                  {JSON.stringify(tool.output, null, 2)}
                                </pre>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
