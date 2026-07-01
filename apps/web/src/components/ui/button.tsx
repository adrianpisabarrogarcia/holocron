import type { ButtonHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
};

export function Button({ className, type = 'button', variant = 'outline', size = 'md', ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl text-sm font-medium transition duration-200 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-60',
        
        // Variants
        variant === 'primary' && 'bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800 shadow-md shadow-indigo-600/10 dark:bg-indigo-500 dark:hover:bg-indigo-600 dark:active:bg-indigo-700',
        variant === 'secondary' && 'bg-slate-200 text-slate-800 hover:bg-slate-350 active:bg-slate-300 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 dark:active:bg-slate-600',
        variant === 'outline' && 'border border-slate-250 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/80 dark:hover:text-slate-100',
        variant === 'ghost' && 'text-slate-650 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-200',
        variant === 'danger' && 'bg-rose-600 text-white hover:bg-rose-700 dark:bg-rose-500 dark:hover:bg-rose-600',
        
        // Sizes
        size === 'sm' && 'px-3 py-1.5 text-xs',
        size === 'md' && 'px-4 py-2',
        size === 'lg' && 'px-5 py-2.5 text-base',
        
        className,
      )}
      type={type}
      {...props}
    />
  );
}

