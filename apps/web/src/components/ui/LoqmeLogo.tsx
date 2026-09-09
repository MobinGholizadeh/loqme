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

  const IconSvg = (
    <svg
      width={dim.icon}
      height={dim.icon}
      viewBox="0 0 100 110"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0 transition-transform duration-200 group-hover:scale-105"
      aria-label="Loqme Logo"
    >
      {/* Top Leaves (Sprout) */}
      {/* Left Leaf */}
      <path
        d="M50 42C50 42 34 38 32 25C30 13 41 8 41 8C41 8 50 17 49 29C49 34 50 42 50 42Z"
        fill={colors.fill}
      />
      {/* Right Leaf */}
      <path
        d="M50 42C50 42 54 34 60 29C66 22 75 23 75 23C75 23 71 33 63 39C57 42 50 42 50 42Z"
        fill={colors.fill}
      />
      {/* Center Dot / Sprout Seed */}
      <circle cx="52" cy="48" r="5" fill={colors.fill} />

      {/* Organic Swirl / Fruit / Seed Body */}
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M48 43C39 45 31 54 31 66C31 79 41.5 89.5 54.5 89.5C67.5 89.5 78 79 78 66C78 54 70 45 61 44.5C60.5 49 58 52 54.5 53C61.5 54.5 67 59.5 67 66.5C67 74 60.5 80 53 80C45.5 80 40 74 40 66.5C40 58.5 46 53 53 52C52.5 48.5 50.5 45.5 48 43ZM53 73C56.6 73 59.5 70.1 59.5 66.5C59.5 62.9 56.6 60 53 60C49.4 60 46.5 62.9 46.5 66.5C46.5 70.1 49.4 73 53 73Z"
        fill={colors.fill}
      />
    </svg>
  );

  if (variant === 'icon') {
    return (
      <div className={cn('inline-flex items-center justify-center', className)}>
        {IconSvg}
      </div>
    );
  }

  if (variant === 'stacked') {
    return (
      <div className={cn('flex flex-col items-center text-center gap-1.5 group', className)}>
        {IconSvg}
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
      {IconSvg}
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
