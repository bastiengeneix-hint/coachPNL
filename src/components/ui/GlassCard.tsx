import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  gradient?: boolean;
  onClick?: () => void;
}

export default function GlassCard({
  children,
  className = '',
  hover = false,
  gradient = false,
  onClick,
}: GlassCardProps) {
  const classes = [
    'glass',
    hover && 'glass-hover spring cursor-pointer',
    gradient && 'gradient-border',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes} onClick={onClick}>
      {children}
    </div>
  );
}
