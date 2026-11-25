import React from 'react';

export const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`rounded-xl border border-[#DDD8C8]/90 bg-[#FFFDF7]/90 backdrop-blur-xl shadow-md hover-card-lift transition-all duration-300 ${className}`}>{children}</div>
);

export const Badge: React.FC<{
  children: React.ReactNode;
  tone?: 'indigo' | 'emerald' | 'crimson' | 'amber' | 'neutral';
  variant?: 'indigo' | 'bullish' | 'bearish' | 'emerald' | 'crimson' | 'amber' | 'neutral';
  className?: string;
}> = ({ children, tone, variant, className = '' }) => {
  const activeTone = (variant === 'bullish' ? 'emerald' : variant === 'bearish' ? 'crimson' : variant || tone || 'neutral') as 'indigo' | 'emerald' | 'crimson' | 'amber' | 'neutral';
  const tones = {
    indigo: 'bg-[#6366F1]/15 text-[#818CF8] border-[#6366F1]/40',
    emerald: 'bg-[#10B981]/15 text-[#34D399] border-[#10B981]/40',
    crimson: 'bg-[#EF4444]/15 text-[#F87171] border-[#EF4444]/40',
    amber: 'bg-[#F59E0B]/15 text-[#FBBF24] border-[#F59E0B]/40',
    neutral: 'bg-[#1F2937]/70 text-[#9CA3AF] border-[#374151]',
  };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[11px] font-semibold uppercase tracking-[0.06em] ${tones[activeTone] || tones.neutral} ${className}`}>{children}</span>;
};

export const Button: React.FC<{
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
}> = ({ children, variant = 'primary', size = 'md', onClick, disabled = false, type = 'button', className = '' }) => {
  const base = 'inline-flex items-center justify-center font-semibold rounded-lg transition-all focus:outline-none';
  const sizes = {
    sm: 'px-2.5 py-1.5 text-xs',
    md: 'px-3.5 py-2 text-sm',
    lg: 'px-5 py-2.5 text-base',
  };
  const variants = {
    primary: 'bg-[#6366F1] text-white hover:bg-[#4F46E5] shadow-lg shadow-[#6366F1]/20 disabled:opacity-50',
    secondary: 'bg-[#1F2937] text-[#F9FAFB] hover:bg-[#374151] border border-[#374151] disabled:opacity-50',
    outline: 'border border-[#1F2937] text-[#9CA3AF] hover:text-[#F9FAFB] hover:border-[#6366F1] disabled:opacity-50',
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
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
