import React, { useEffect, useRef, useState } from 'react';

interface AnimatedPriceNumberProps {
  value: number;
  format?: (val: number) => string;
  className?: string;
}

export function AnimatedPriceNumber({ value, format, className = '' }: AnimatedPriceNumberProps) {
  const prevValue = useRef(value);
  const [flash, setFlash] = useState<'up' | 'down' | null>(null);

  useEffect(() => {
    if (value > prevValue.current) {
      setFlash('up');
      const timer = setTimeout(() => setFlash(null), 600);
      prevValue.current = value;
      return () => clearTimeout(timer);
    } else if (value < prevValue.current) {
      setFlash('down');
      const timer = setTimeout(() => setFlash(null), 600);
      prevValue.current = value;
      return () => clearTimeout(timer);
    }
  }, [value]);

  const display = format ? format(value) : value.toFixed(2);

  const flashClass =
    flash === 'up'
      ? 'text-[#10B981] bg-[#10B981]/15 px-1 rounded transition-colors duration-300'
      : flash === 'down'
      ? 'text-[#EF4444] bg-[#EF4444]/15 px-1 rounded transition-colors duration-300'
      : 'transition-colors duration-300';

  return (
    <span className={`tabular-nums inline-block font-mono ${flashClass} ${className}`}>
      {display}
    </span>
  );
}
