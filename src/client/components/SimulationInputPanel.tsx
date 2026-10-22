import React, { useState } from 'react';
import { ProposedChange } from '../../server/types/index.js';
import { Play, Sparkles, Sliders, GitPullRequest, ArrowRight, CheckCircle2, RotateCcw } from 'lucide-react';

interface SimulationInputPanelProps {
  onAnalyze: (change: ProposedChange) => void;
  onChangeSelected?: (change: ProposedChange) => void;
  isRunning: boolean;
}

const PRESET_SCENARIOS: { id: string; label: string; badge: string; change: ProposedChange }[] = [
  {
    id: 'employee-id-rename',
    label: 'Preset 1: Rename Primary Key (employee_id ➔ employee_code)',
    badge: 'CRITICAL BREAKING DEMO',
    change: {
      id: 'PR-8492-RENAME-EMPLOYEE-ID',
      serviceName: 'employee-directory-service',
      endpoint: '/api/v1/employees/:id',
      changeType: 'FIELD_RENAME',
      originalField: 'employee_id',
      newField: 'employee_code',
      description: 'Refactor employee identifier field from employee_id to employee_code to align with modern Enterprise API guidelines v2',
      author: 'dev-alex@acme.corp',
      prNumber: 8492,
    },
  },
  {
    id: 'department-removal',
    label: 'Preset 2: Field Removal (department)',
    badge: 'SCHEMA DEPRECATION',
    change: {
      id: 'PR-8510-MUTATE-DEPARTMENT',
      serviceName: 'employee-directory-service',
      endpoint: '/api/v1/employees/:id',
      changeType: 'FIELD_REMOVAL',
      originalField: 'department',
      newField: '',
      description: 'Deprecate department string field in favor of new organizational taxonomy service',
      author: 'infra-team@acme.corp',
      prNumber: 8510,
    },
  },
];

export const SimulationInputPanel: React.FC<SimulationInputPanelProps> = ({
  onAnalyze,
  onChangeSelected,
  isRunning,
}) => {
  const [selectedPresetId, setSelectedPresetId] = useState<string>('employee-id-rename');
  const [formData, setFormData] = useState<ProposedChange>(PRESET_SCENARIOS[0].change);

  const handlePresetChange = (presetId: string) => {
    setSelectedPresetId(presetId);
    const found = PRESET_SCENARIOS.find((p) => p.id === presetId);
    if (found) {
      setFormData({ ...found.change });
      onChangeSelected?.({ ...found.change });
    }
  };

  const handleFieldChange = (field: keyof ProposedChange, value: any) => {
    setSelectedPresetId('custom');
    const updated = {
      ...formData,
      [field]: value,
    };
    setFormData(updated);
    onChangeSelected?.(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAnalyze(formData);
  };

  return (
    <div className="glass-panel-glow rounded-2xl p-6 border border-brand-500/30 shadow-2xl shadow-brand-950/20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-brand-500/10 text-brand-400 border border-brand-500/20">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                Input Console: Simulate Proposed Software Change
                <span className="text-[10px] font-mono uppercase bg-brand-500/15 text-brand-300 px-2 py-0.5 rounded border border-brand-500/30">
                  Interactive Input
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Define the Pull Request change here. Then trigger the agent to observe, reason, and intervene.
              </p>
            </div>
          </div>
        </div>

        {/* Preset Selector Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          {PRESET_SCENARIOS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => handlePresetChange(preset.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${selectedPresetId === preset.id
                  ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30'
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-700/60'
                }`}
            >
              {preset.id === 'employee-id-rename' ? '⭐ Employee ID Rename (Demo)' : 'Department Removal'}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setSelectedPresetId('custom')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${selectedPresetId === 'custom'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                : 'bg-slate-900 text-slate-400 hover:bg-slate-800 border border-slate-700/60'
              }`}
          >
            Custom Edit
          </button>
        </div>
      </div>

      {/* Form Fields */}
      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Service Name */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Service Target Name
            </label>
            <input
              type="text"
              value={formData.serviceName}
              onChange={(e) => handleFieldChange('serviceName', e.target.value)}
              className="w-full bg-slate-900/90 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
              required
            />
          </div>

          {/* Endpoint */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              API Endpoint
            </label>
            <input
              type="text"
              value={formData.endpoint}
              onChange={(e) => handleFieldChange('endpoint', e.target.value)}
              className="w-full bg-slate-900/90 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
              required
            />
          </div>

          {/* Change Type */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Change Type
            </label>
            <select
              value={formData.changeType}
              onChange={(e) => handleFieldChange('changeType', e.target.value)}
              className="w-full bg-slate-900/90 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
            >
              <option value="FIELD_RENAME">FIELD_RENAME</option>
              <option value="FIELD_REMOVAL">FIELD_REMOVAL</option>
              <option value="TYPE_MUTATION">TYPE_MUTATION</option>
              <option value="OPTIONAL_TO_REQUIRED">OPTIONAL_TO_REQUIRED</option>
            </select>
          </div>
        </div>

        {/* Mutation Fields Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
          <div>
            <label className="block text-[11px] font-semibold text-red-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              Original Field (Being Changed or Removed)
            </label>
            <input
              type="text"
              value={formData.originalField}
              onChange={(e) => handleFieldChange('originalField', e.target.value)}
              className="w-full bg-slate-900 border border-red-900/60 rounded-lg px-3 py-2 text-xs text-red-300 font-mono focus:outline-none focus:border-red-500 transition-all font-bold"
              required
            />
            <span className="text-[10px] text-slate-400 mt-1 block">
              The existing contract key expected by downstream consumers.
            </span>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-amber-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              Proposed New Field (In PR)
            </label>
            <input
              type="text"
              value={formData.newField || ''}
              onChange={(e) => handleFieldChange('newField', e.target.value)}
              placeholder="Leave blank if field removal"
              className="w-full bg-slate-900 border border-amber-900/60 rounded-lg px-3 py-2 text-xs text-amber-300 font-mono focus:outline-none focus:border-amber-500 transition-all font-bold"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">
              The renamed or new key introduced by the developer.
            </span>
          </div>
        </div>

        {/* Description & PR Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              PR Description / Developer Intent
            </label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => handleFieldChange('description', e.target.value)}
              className="w-full bg-slate-900/90 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500 transition-all"
              required
            />
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Author
              </label>
              <input
                type="text"
                value={formData.author}
                onChange={(e) => handleFieldChange('author', e.target.value)}
                className="w-full bg-slate-900/90 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-brand-500 transition-all"
              />
            </div>
            <div className="w-24">
              <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                PR #
              </label>
              <input
                type="number"
                value={formData.prNumber}
                onChange={(e) => handleFieldChange('prNumber', Number(e.target.value))}
                className="w-full bg-slate-900/90 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-brand-500 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Submit Action Bar */}
        <div className="pt-3 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-800">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <GitPullRequest className="w-4 h-4 text-purple-400" />
            <span>Simulating PR #{formData.prNumber}:</span>
            <code className="text-red-400 font-mono">{formData.originalField}</code>
            <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
            <code className="text-amber-400 font-mono">{formData.newField || '(removed)'}</code>
          </div>

          <button
            type="submit"
            disabled={isRunning}
            className={`w-full sm:w-auto flex items-center justify-center gap-2.5 px-6 py-3 rounded-xl font-bold text-sm transition-all duration-200 shadow-xl ${isRunning
                ? 'bg-slate-800 text-slate-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-brand-600 to-emerald-500 hover:from-brand-500 hover:to-emerald-400 text-white shadow-brand-600/30 hover:scale-[1.02] active:scale-[0.98]'
              }`}
          >
            {isRunning ? (
              <>
                <RotateCcw className="w-4 h-4 animate-spin text-brand-200" />
                <span>Agent Reasoning in Progress...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Run CausalGuard AI Agent on this Change</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
