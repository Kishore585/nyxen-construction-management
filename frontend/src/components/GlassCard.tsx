import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

interface GlassCardProps {
  title?: string;
  subtitle?: string;
  icon?: LucideIcon;
  iconColor?: 'blue' | 'emerald' | 'purple' | 'amber' | 'red';
  children: ReactNode;
  className?: string;
  glowColor?: 'blue' | 'emerald' | 'red';
  onClick?: () => void;
  style?: React.CSSProperties;
}

export default function GlassCard({
  title,
  subtitle,
  icon: Icon,
  iconColor = 'blue',
  children,
  className = '',
  glowColor,
  onClick,
  style,
}: GlassCardProps) {
  const glowClass = glowColor ? `glass-card--glow-${glowColor}` : '';

  return (
    <div
      className={`glass-card ${glowClass} ${className}`}
      onClick={onClick}
      style={{ ...(onClick ? { cursor: 'pointer' } : {}), ...style }}
    >
      {(title || Icon) && (
        <div className="glass-card__header">
          {Icon && (
            <div className={`glass-card__icon glass-card__icon--${iconColor}`}>
              <Icon size={20} />
            </div>
          )}
          <div>
            {title && <div className="glass-card__title">{title}</div>}
            {subtitle && <div className="glass-card__subtitle">{subtitle}</div>}
          </div>
        </div>
      )}
      {children}
    </div>
  );
}
