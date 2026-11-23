import React from 'react';

export const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`rounded-xl border border-[#1F2937] bg-[#111827]/90 backdrop-blur-md shadow-lg ${className}`}>{children}</div>
);

export const Badge: React.FC<{ children: React.ReactNode; tone?: 'indigo' | 'emerald' | 'crimson' | 'amber' | 'neutral' }> =
({ children, tone = 'neutral' }) => {
  const tones = {
    indigo: 'bg-[#6366F1]/15 text-[#818CF8] border-[#6366F1]/40',
    emerald: 'bg-[#10B981]/15 text-[#34D399] border-[#10B981]/40',
    crimson: 'bg-[#EF4444]/15 text-[#F87171] border-[#EF4444]/40',
    amber: 'bg-[#F59E0B]/15 text-[#FBBF24] border-[#F59E0B]/40',
    neutral: 'bg-[#1F2937]/70 text-[#9CA3AF] border-[#374151]',
  };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[11px] font-semibold uppercase tracking-[0.06em] ${tones[tone]}`}>{children}</span>;
};

export const SliderControl: React.FC<{
  label: string; value: number; min: number; max: number; step: number; suffix?: string; onChange: (val: number) => void;
}> = ({ label, value, min, max, step, suffix = '', onChange }) => (
  <div className="space-y-1.5">
    <div className="flex justify-between text-xs">
      <span className="text-[#9CA3AF] font-medium">{label}</span>
      <span className="tabular-nums text-[#F9FAFB] font-semibold">{value}{suffix}</span>
    </div>
    <input type="range" value={value} min={min} max={max} step={step} onChange={(event) => onChange(Number(event.target.value))}
      className="w-full accent-[#6366F1]" />
  </div>
);
