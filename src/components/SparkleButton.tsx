'use client';

import React from 'react';

type SparkleButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  children: React.ReactNode;
};

function SparkleButton({ children, className = '', disabled, ...props }: SparkleButtonProps) {
  const base =
    'relative inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3 ' +
    'text-base font-extrabold tracking-tight text-slate-900 transform-gpu transition';
  const gradient =
    'bg-gradient-to-r from-rose-200 via-amber-200 to-sky-200 ' +
    'hover:from-rose-300 hover:via-amber-300 hover:to-sky-300';
  const focusRing =
    'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-300/60 ' +
    'focus-visible:ring-offset-2 focus-visible:ring-offset-white';
  const shadow = 'shadow-lg shadow-rose-200/50 hover:shadow-xl active:scale-[0.99]';

  const disabledCls = disabled
    ? 'opacity-60 cursor-not-allowed hover:from-rose-200 hover:via-amber-200 hover:to-sky-200 active:scale-100'
    : '';

  return (
    <button
      type="button"
      {...props}
      disabled={disabled}
      aria-disabled={disabled}
      className={`${base} ${gradient} ${focusRing} ${shadow} ${disabledCls} ${className}`}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-2xl bg-white/0
                   [mask-image:radial-gradient(60%_40%_at_30%_-20%,#000_20%,transparent_60%)]"
      />
      <span className="relative">{children}</span>
    </button>
  );
}

export default SparkleButton;
