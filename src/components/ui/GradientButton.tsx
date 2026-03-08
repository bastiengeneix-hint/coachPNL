import React from 'react';

interface GradientButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
  variant?: 'primary' | 'ghost';
}

export default function GradientButton({
  children,
  onClick,
  disabled = false,
  className = '',
  type = 'button',
  variant = 'primary',
}: GradientButtonProps) {
  const base =
    'inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-medium spring cursor-pointer';

  const variants = {
    primary: [
      'bg-[linear-gradient(135deg,var(--color-gradient-start),var(--color-gradient-end),var(--color-gradient-mid))]',
      'text-white',
      'hover:brightness-110',
      'active:brightness-95',
      'shadow-lg shadow-[var(--color-accent-soft)]',
    ].join(' '),
    ghost: [
      'bg-transparent',
      'text-[var(--color-accent)]',
      'border border-[var(--color-glass-border)]',
      'hover:bg-[var(--color-glass-hover)]',
    ].join(' '),
  };

  const disabledStyles = disabled ? 'opacity-40 cursor-not-allowed' : '';

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${variants[variant]} ${disabledStyles} ${className}`}
    >
      {children}
    </button>
  );
}
