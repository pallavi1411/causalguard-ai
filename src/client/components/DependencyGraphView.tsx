import React from 'react';
import { DependencyGraphData } from '../../server/types/index.js';
import { Network, Server, Database, AlertOctagon, CheckCircle, ShieldAlert } from 'lucide-react';

interface DependencyGraphViewProps {
  graph: DependencyGraphData;
  affectedServices: string[];
  originalField: string;
  newField?: string;
  hasVerified: boolean;
}

export const DependencyGraphView: React.FC<DependencyGraphViewProps> = ({
  graph,
  affectedServices,
  originalField,
  newField,
  hasVerified,
}) => {
  return (
    <div className="glass-panel rounded-xl p-5 border border-slate-800">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Network className="w-5 h-5 text-indigo-400" />
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
            Live Microservice Dependency Graph
          </h2>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="flex items-center gap-1 text-red-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            {hasVerified ? 'Remediated & Stable' : `${affectedServices.length} Critical Downstream Breaks`}
          </span>
        </div>
      </div>

      {/* Visual Architectural Map */}
      <div className="bg-slate-950/70 rounded-xl p-6 border border-slate-800/80 relative overflow-hidden">
        {/* Subtle grid background */}
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(#6366f1 1px, transparent 1px)',
            backgroundSize: '16px 16px',
          }}
        />

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8 py-2">
          {/* Column 1: Provider Service */}
          <div className="flex flex-col items-center">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Source Provider
            </span>
            <div className="w-56 p-4 rounded-xl bg-slate-900 border-2 border-indigo-500/40 shadow-lg shadow-indigo-500/10 text-center">
              <Server className="w-6 h-6 text-indigo-400 mx-auto mb-1.5" />
              <div className="text-xs font-bold text-white">employee-directory-service</div>
              <div className="text-[10px] text-slate-400 font-mono mt-0.5">/api/v1/employees/:id</div>
              <div className="mt-2.5 inline-flex items-center px-2 py-0.5 rounded text-[10px] bg-indigo-500/15 text-indigo-300 font-mono">
                REST Provider
              </div>
            </div>
          </div>

          {/* Column 2: Contract Fields Node */}
          <div className="flex flex-col items-center">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Contract Schema Mutator
            </span>
            <div className="w-60 p-4 rounded-xl bg-slate-900/90 border border-slate-700 text-left space-y-2.5">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-amber-400" />
                  Field Schema
                </span>
                <span className="text-[10px] text-slate-400">JSON response</span>
              </div>

              {/* Legacy Field */}
              <div
                className={`p-2 rounded-lg text-xs font-mono flex items-center justify-between ${
                  hasVerified
                    ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/80'
                    : 'bg-red-950/50 text-red-300 border border-red-800'
                }`}
              >
                <div>
                  <span className="font-bold">{originalField}</span>
                  <span className="text-[10px] block opacity-75">
                    {hasVerified ? 'Restored by Sandbox Alias' : 'MISSING / REMOVED in PR'}
                  </span>
                </div>
                {hasVerified ? (
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                ) : (
                  <AlertOctagon className="w-4 h-4 text-red-400" />
                )}
              </div>

              {/* New Field */}
              {newField && (
                <div className="p-2 rounded-lg text-xs font-mono bg-blue-950/40 text-blue-300 border border-blue-800/60 flex items-center justify-between">
                  <div>
                    <span className="font-bold">{newField}</span>
                    <span className="text-[10px] block opacity-75">Proposed v2 Field</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 bg-blue-500/20 rounded text-blue-300">
                    NEW
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Column 3: Downstream Consumers */}
          <div className="flex flex-col items-center w-full md:w-auto">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Downstream Consumers
            </span>
            <div className="flex flex-col gap-3 w-64">
              {/* Auth Service */}
              <div
                className={`p-3.5 rounded-xl border text-xs transition-all ${
                  hasVerified
                    ? 'bg-slate-900 border-emerald-500/40'
                    : 'bg-red-950/30 border-red-500/50 shadow-md shadow-red-950/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <ShieldAlert
                      className={`w-4 h-4 ${hasVerified ? 'text-emerald-400' : 'text-red-400'}`}
                    />
                    auth-service
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      hasVerified
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-red-500/20 text-red-400'
                    }`}
                  >
                    {hasVerified ? 'PROTECTED' : 'BREAKING'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Depends on: <code className="text-amber-300 font-mono">{originalField}</code> (JWT Sub claim)
                </div>
              </div>

              {/* Payroll Integration */}
              <div
                className={`p-3.5 rounded-xl border text-xs transition-all ${
                  hasVerified
                    ? 'bg-slate-900 border-emerald-500/40'
                    : 'bg-red-950/30 border-red-500/50 shadow-md shadow-red-950/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <ShieldAlert
                      className={`w-4 h-4 ${hasVerified ? 'text-emerald-400' : 'text-red-400'}`}
                    />
                    payroll-integration
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      hasVerified
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-red-500/20 text-red-400'
                    }`}
                  >
                    {hasVerified ? 'PROTECTED' : 'BREAKING'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Depends on: <code className="text-amber-300 font-mono">{originalField}</code> (FK Ledger)
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
