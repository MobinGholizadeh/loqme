"use client";

import React, { useState } from "react";
import { DailyAnalyticsTrendPointDto } from "@loqme/types";
import { toPersianDigits, formatToman } from "@loqme/validation";

interface TrendChartProps {
  data: DailyAnalyticsTrendPointDto[];
  height?: number;
}

export const TrendChart: React.FC<TrendChartProps> = ({
  data,
  height = 260,
}) => {
  const [hoveredPoint, setHoveredPoint] =
    useState<DailyAnalyticsTrendPointDto | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(
    null,
  );

  if (!data || data.length === 0) {
    return (
      <div
        className="w-full flex items-center justify-center bg-loqme-neutral-900/50 rounded-lg border border-loqme-neutral-800 text-loqme-neutral-500 text-sm"
        style={{ height }}
      >
        داده‌ای برای ترسیم نمودار در این بازه زمانی یافت نشد
      </div>
    );
  }

  const width = 800;
  const paddingX = 40;
  const paddingTop = 20;
  const paddingBottom = 40;
  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingTop - paddingBottom;

  const maxGmv = Math.max(...data.map((d) => d.gmvToman), 100000);
  const minGmv = 0;

  // Calculate coordinates for each point
  const points = data.map((d, index) => {
    const x =
      data.length === 1
        ? paddingX + chartWidth / 2
        : paddingX + (index / (data.length - 1)) * chartWidth;
    const yRatio = (d.gmvToman - minGmv) / (maxGmv - minGmv);
    const y = paddingTop + chartHeight - yRatio * chartHeight;
    return { ...d, x, y };
  });

  // SVG Line path
  const linePath =
    points.length === 1
      ? `M ${points[0].x - 20},${points[0].y} L ${points[0].x + 20},${points[0].y}`
      : points.reduce((acc, pt, idx) => {
          return idx === 0 ? `M ${pt.x},${pt.y}` : `${acc} L ${pt.x},${pt.y}`;
        }, "");

  // SVG Area path (closing to bottom)
  const firstPt = points[0];
  const lastPt = points[points.length - 1];
  const areaPath =
    points.length === 1
      ? `M ${firstPt.x - 20},${height - paddingBottom} L ${firstPt.x - 20},${firstPt.y} L ${firstPt.x + 20},${firstPt.y} L ${firstPt.x + 20},${height - paddingBottom} Z`
      : `${linePath} L ${lastPt.x},${height - paddingBottom} L ${firstPt.x},${height - paddingBottom} Z`;

  return (
    <div className="relative w-full overflow-hidden select-none">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto overflow-visible"
        onMouseLeave={() => {
          setHoveredPoint(null);
          setMousePos(null);
        }}
      >
        <defs>
          <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0D9488" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#0D9488" stopOpacity="0.0" />
          </linearGradient>
          <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#14B8A6" />
            <stop offset="100%" stopColor="#2DD4BF" />
          </linearGradient>
        </defs>

        {/* Horizontal grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
          const y = paddingTop + chartHeight * (1 - ratio);
          const value = Math.round(maxGmv * ratio);
          return (
            <g key={idx}>
              <line
                x1={paddingX}
                y1={y}
                x2={width - paddingX}
                y2={y}
                stroke="#334155"
                strokeDasharray="4 4"
                strokeWidth="1"
                opacity="0.4"
              />
              <text
                x={width - paddingX + 8}
                y={y + 4}
                fill="#94A3B8"
                fontSize="11"
                textAnchor="start"
                className="font-vazirmatn"
              >
                {toPersianDigits(Math.round(value / 1000))}k
              </text>
            </g>
          );
        })}

        {/* Area fill */}
        <path d={areaPath} fill="url(#areaGradient)" />

        {/* Line stroke */}
        <path
          d={linePath}
          fill="none"
          stroke="url(#lineGradient)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Interactive Data Points */}
        {points.map((pt, idx) => (
          <g
            key={idx}
            className="cursor-pointer transition-transform"
            onMouseEnter={(e) => {
              setHoveredPoint(pt);
              const rect = e.currentTarget.getBoundingClientRect();
              setMousePos({ x: pt.x, y: pt.y });
            }}
          >
            <circle
              cx={pt.x}
              cy={pt.y}
              r={hoveredPoint?.dateIso === pt.dateIso ? "6" : "4"}
              fill="#0F172A"
              stroke="#2DD4BF"
              strokeWidth="2.5"
            />
          </g>
        ))}

        {/* Date labels on X axis */}
        {points.map((pt, idx) => {
          // Show fewer labels if many points
          const step = Math.ceil(points.length / 7);
          if (idx % step !== 0 && idx !== points.length - 1) return null;

          return (
            <text
              key={idx}
              x={pt.x}
              y={height - 12}
              fill="#94A3B8"
              fontSize="11"
              textAnchor="middle"
              className="font-vazirmatn"
            >
              {pt.dateFa.split("/").slice(1).join("/")}
            </text>
          );
        })}
      </svg>

      {/* Floating Hover Tooltip */}
      {hoveredPoint && mousePos && (
        <div
          className="absolute z-20 pointer-events-none bg-loqme-neutral-950/95 border border-teal-500/40 backdrop-blur-md rounded-lg p-3 shadow-2xl text-right text-xs"
          style={{
            left: `${(mousePos.x / width) * 100}%`,
            top: `${Math.max(10, mousePos.y - 80)}px`,
            transform: "translateX(-50%)",
            minWidth: "150px",
          }}
        >
          <div className="font-semibold text-teal-700 border-b border-loqme-neutral-800 pb-1 mb-1.5 flex justify-between items-center">
            <span>{hoveredPoint.dateFa}</span>
            <span className="text-[10px] text-loqme-neutral-500">تاریخ</span>
          </div>
          <div className="flex justify-between items-center text-white mb-1">
            <span className="font-bold text-sm text-emerald-400">
              {formatToman(hoveredPoint.gmvToman)} تومان
            </span>
            <span className="text-loqme-neutral-500">حجم فروش:</span>
          </div>
          <div className="flex justify-between items-center text-loqme-neutral-300">
            <span>{toPersianDigits(hoveredPoint.ordersCount)} سفارش</span>
            <span className="text-loqme-neutral-500">تعداد:</span>
          </div>
          <div className="flex justify-between items-center text-loqme-neutral-300">
            <span>{toPersianDigits(hoveredPoint.soldBags)} بسته</span>
            <span className="text-loqme-neutral-500">بسته‌ها:</span>
          </div>
        </div>
      )}
    </div>
  );
};
