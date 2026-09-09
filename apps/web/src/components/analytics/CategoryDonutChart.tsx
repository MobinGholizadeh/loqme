'use client';

import React, { useState } from 'react';
import { CategoryDistributionDto } from '@loqme/types';
import { toPersianDigits, formatToman } from '@loqme/validation';

interface CategoryDonutChartProps {
  data: CategoryDistributionDto[];
}

const PALETTE = [
  '#0D9488', // Teal 600
  '#10B981', // Emerald 500
  '#06B6D4', // Cyan 500
  '#F59E0B', // Amber 500
  '#6366F1', // Indigo 500
  '#EC4899', // Pink 500
  '#8B5CF6', // Purple 500
  '#64748B', // Slate 500
];

export const CategoryDonutChart: React.FC<CategoryDonutChartProps> = ({ data }) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-loqme-neutral-400 text-sm">
        داده‌ای برای دسته‌بندی‌ها ثبت نشده است
      </div>
    );
  }

  const size = 200;
  const strokeWidth = 26;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Filter categories with positive percentage or GMV
  const activeCategories = data.filter((c) => c.percentage > 0 || c.soldBagsCount > 0);
  const displayCategories = activeCategories.length > 0 ? activeCategories : data;

  let cumulativeOffset = 0;
  const slices = displayCategories.map((cat, idx) => {
    const strokeDasharray = `${(cat.percentage / 100) * circumference} ${circumference}`;
    const strokeDashoffset = -cumulativeOffset;
    cumulativeOffset += (cat.percentage / 100) * circumference;
    const color = PALETTE[idx % PALETTE.length];
    return { ...cat, strokeDasharray, strokeDashoffset, color, idx };
  });

  return (
    <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-2">
      {/* SVG Donut */}
      <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          {/* Base background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="#1E293B"
            strokeWidth={strokeWidth}
          />
          {/* Colored Slices */}
          {slices.map((s) => (
            <circle
              key={s.categoryId}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="transparent"
              stroke={s.color}
              strokeWidth={hoveredIdx === s.idx ? strokeWidth + 4 : strokeWidth}
              strokeDasharray={s.strokeDasharray}
              strokeDashoffset={s.strokeDashoffset}
              strokeLinecap="round"
              className="cursor-pointer transition-all duration-300"
              onMouseEnter={() => setHoveredIdx(s.idx)}
              onMouseLeave={() => setHoveredIdx(null)}
            />
          ))}
        </svg>

        {/* Center Label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
          {hoveredIdx !== null ? (
            <>
              <span className="text-xs text-loqme-neutral-400 max-w-[90px] truncate">
                {slices[hoveredIdx]?.categoryNameFa}
              </span>
              <span className="text-base font-bold text-teal-400">
                {toPersianDigits(slices[hoveredIdx]?.percentage || 0)}٪
              </span>
            </>
          ) : (
            <>
              <span className="text-[11px] text-loqme-neutral-400">تنوع عرضه</span>
              <span className="text-base font-bold text-white">
                {toPersianDigits(displayCategories.length)} دسته
              </span>
            </>
          )}
        </div>
      </div>

      {/* Responsive Legend */}
      <div className="flex-1 w-full space-y-2 max-h-56 overflow-y-auto pr-1">
        {slices.map((s) => (
          <div
            key={s.categoryId}
            className={`flex items-center justify-between p-2 rounded-lg transition-colors cursor-pointer text-xs ${
              hoveredIdx === s.idx
                ? 'bg-loqme-neutral-800 border border-teal-500/30'
                : 'bg-loqme-neutral-900/40 hover:bg-loqme-neutral-900'
            }`}
            onMouseEnter={() => setHoveredIdx(s.idx)}
            onMouseLeave={() => setHoveredIdx(null)}
          >
            <div className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: s.color }}
              />
              <span className="text-loqme-neutral-200 font-medium">{s.categoryNameFa}</span>
            </div>
            <div className="flex items-center gap-3 text-loqme-neutral-400">
              <span>{toPersianDigits(s.soldBagsCount)} بسته</span>
              <span className="font-semibold text-teal-400">
                {toPersianDigits(s.percentage)}٪
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
