import { useEffect, useRef, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: number;
  unit?: string;
  icon: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  color?: 'blue' | 'emerald' | 'purple' | 'amber' | 'red';
}

export default function MetricCard({
  label,
  value,
  unit,
  icon: Icon,
  trend = 'neutral',
  trendValue,
  color = 'blue',
}: MetricCardProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const animated = useRef(false);

  useEffect(() => {
    if (animated.current) return;
    animated.current = true;

    const duration = 1200;
    const steps = 40;
    const stepTime = duration / steps;
    let current = 0;
    const increment = value / steps;

    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        current = value;
        clearInterval(timer);
      }
      setDisplayValue(Math.round(current * 10) / 10);
    }, stepTime);

    return () => {
      clearInterval(timer);
      animated.current = false;
    };
  }, [value]);

  const bgColors: Record<string, string> = {
    blue: 'var(--color-accent-blue-dim)',
    emerald: 'var(--color-accent-emerald-dim)',
    purple: 'var(--color-accent-purple-dim)',
    amber: 'var(--color-accent-amber-dim)',
    red: 'var(--color-accent-red-dim)',
  };

  const textColors: Record<string, string> = {
    blue: 'var(--color-accent-blue)',
    emerald: 'var(--color-accent-emerald)',
    purple: 'var(--color-accent-purple)',
    amber: 'var(--color-accent-amber)',
    red: 'var(--color-accent-red)',
  };

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;

  const formatValue = (v: number) => {
    if (v >= 1000000) return (v / 1000000).toFixed(1) + 'M';
    if (v >= 1000) return (v / 1000).toFixed(1) + 'K';
    if (Number.isInteger(v)) return v.toString();
    return v.toFixed(1);
  };

  return (
    <div className={`metric-card metric-card--${color}`} ref={ref}>
      <div className="metric-card__top">
        <div
          className="metric-card__icon"
          style={{ background: bgColors[color], color: textColors[color] }}
        >
          <Icon size={22} />
        </div>
        {trendValue && (
          <span className={`metric-card__trend metric-card__trend--${trend}`}>
            <TrendIcon size={12} />
            {trendValue}
          </span>
        )}
      </div>
      <div className="metric-card__value" style={{ color: textColors[color] }}>
        {formatValue(displayValue)}
        {unit && <span className="metric-card__unit">{unit}</span>}
      </div>
      <div className="metric-card__label">{label}</div>
    </div>
  );
}
