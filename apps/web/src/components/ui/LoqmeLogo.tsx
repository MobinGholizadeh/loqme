'use client';

import React from 'react';
import { cn } from '@/lib/utils/cn';

export interface LoqmeLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | number;
  variant?: 'icon' | 'horizontal' | 'stacked';
  theme?: 'teal' | 'white' | 'dark';
  className?: string;
  subtext?: string;
}

export const LoqmeLogo: React.FC<LoqmeLogoProps> = ({
  size = 'md',
  variant = 'horizontal',
  theme = 'teal',
  className,
  subtext,
}) => {
  // Dimension mapping
  const sizeMap = {
    sm: { icon: 26, text: 'text-base', subtext: 'text-[9px]' },
    md: { icon: 34, text: 'text-xl', subtext: 'text-[10px]' },
    lg: { icon: 44, text: 'text-2xl', subtext: 'text-xs' },
    xl: { icon: 60, text: 'text-3xl', subtext: 'text-sm' },
  };

  const dim = typeof size === 'number' 
    ? { icon: size, text: 'text-xl', subtext: 'text-[10px]' } 
    : sizeMap[size];

  // Colors
  const colorMap = {
    teal: {
      fill: '#135E66',
      primaryText: 'text-[#135E66]',
      secondaryText: 'text-[#0D9488]',
      sub: 'text-[#64748B]',
    },
    white: {
      fill: '#FFFFFF',
      primaryText: 'text-white',
      secondaryText: 'text-teal-100',
      sub: 'text-white/80',
    },
    dark: {
      fill: '#222026',
      primaryText: 'text-[#222026]',
      secondaryText: 'text-[#135E66]',
      sub: 'text-[#64748B]',
    },
  };

  const colors = colorMap[theme];

  const logoSrc = theme === 'white' ? '/logo-white.png' : '/logo.png';

  const IconGlyph = (
    <img
      src={logoSrc}
      alt="Loqme Logo"
      width={dim.icon}
      height={dim.icon}
      className="object-contain shrink-0 transition-transform duration-200 group-hover:scale-105 select-none"
      style={{ width: `${dim.icon}px`, height: `${dim.icon}px` }}
    />
  );

  if (variant === 'icon') {
    return (
      <div className={cn('inline-flex items-center justify-center', className)}>
        {IconGlyph}
      </div>
    );
  }

  if (variant === 'stacked') {
    return (
      <div className={cn('flex flex-col items-center text-center gap-1.5 group', className)}>
        {IconGlyph}
        <div className="flex flex-col items-center">
          <span className={cn('font-black tracking-tight leading-none', dim.text, colors.primaryText)}>
            لقمه
          </span>
          <span className={cn('font-extrabold tracking-widest text-[11px] mt-0.5 uppercase', colors.primaryText)}>
            LOQME
          </span>
          {subtext && (
            <span className={cn('font-medium mt-1', dim.subtext, colors.sub)}>
              {subtext}
            </span>
          )}
        </div>
      </div>
    );
  }

  // Horizontal variant (default)
  return (
    <div className={cn('inline-flex items-center gap-2.5 select-none group', className)}>
      {IconGlyph}
      <div className="flex flex-col">
        <div className="flex items-center gap-1.5">
          <span className={cn('font-black leading-none', dim.text, colors.primaryText)}>
            لقمه
          </span>
          <span className={cn('text-[10px] font-extrabold tracking-wider uppercase opacity-85', colors.primaryText)}>
            LOQME
          </span>
        </div>
        {subtext ? (
          <span className={cn('font-medium mt-0.5', dim.subtext, colors.sub)}>
            {subtext}
          </span>
        ) : (
          <span className={cn('font-bold leading-tight mt-0.5', dim.subtext, colors.secondaryText)}>
            کشف هوشمندانه خوراکی‌ها
          </span>
        )}
      </div>
    </div>
  );
};

export default LoqmeLogo;
