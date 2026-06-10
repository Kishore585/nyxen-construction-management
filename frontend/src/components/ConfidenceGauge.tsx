import { useEffect, useState } from 'react';

interface ConfidenceGaugeProps {
  score: number;
  size?: number;
  label?: string;
  strokeWidth?: number;
}

export default function ConfidenceGauge({
  score,
  size = 160,
  label,
  strokeWidth = 10,
}: ConfidenceGaugeProps) {
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    const duration = 1500;
    const steps = 60;
    const stepTime = duration / steps;
    let current = 0;
    const increment = score / steps;

    const timer = setInterval(() => {
      current += increment;
      if (current >= score) {
        current = score;
        clearInterval(timer);
      }
      setAnimatedScore(Math.round(current));
    }, stepTime);

    return () => clearInterval(timer);
  }, [score]);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (animatedScore / 100) * circumference;

  const getColor = (s: number) => {
    if (s < 40) return 'var(--color-accent-red)';
    if (s < 70) return 'var(--color-accent-amber)';
    return 'var(--color-accent-emerald)';
  };

  const getGlowColor = (s: number) => {
    if (s < 40) return 'var(--color-accent-red-glow)';
    if (s < 70) return 'rgba(255, 171, 64, 0.4)';
    return 'var(--color-accent-emerald-glow)';
  };

  const color = getColor(score);

  return (
    <div className="confidence-gauge">
      <div className="confidence-gauge__circle" style={{ width: size, height: size }}>
        <svg
          className="confidence-gauge__svg"
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
        >
          <defs>
            <filter id={`glow-${score}`}>
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <circle
            className="confidence-gauge__bg"
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
          />
          <circle
            className="confidence-gauge__fill"
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
            stroke={color}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            filter={`url(#glow-${score})`}
          />
        </svg>
        <div
          className="confidence-gauge__score"
          style={{
            fontSize: size * 0.22,
            color,
            textShadow: `0 0 20px ${getGlowColor(score)}`,
          }}
        >
          {animatedScore}
          <span style={{ fontSize: size * 0.1, opacity: 0.7 }}>%</span>
        </div>
      </div>
      {label && <div className="confidence-gauge__label">{label}</div>}
    </div>
  );
}
