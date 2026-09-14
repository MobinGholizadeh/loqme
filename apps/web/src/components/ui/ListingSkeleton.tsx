"use client";

import React from "react";
import { Skeleton } from "./Skeleton";

export const ListingCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white rounded-lg border border-stone-200/80 p-5 space-y-4 shadow-sm relative overflow-hidden">
      {/* Category & Badge header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Skeleton variant="circular" width={28} height={28} />
          <Skeleton height={16} width={80} />
        </div>
        <Skeleton height={22} width={70} variant="rounded" />
      </div>

      {/* Title & Description */}
      <div className="space-y-2">
        <Skeleton height={20} width="85%" />
        <Skeleton height={14} width="95%" />
        <Skeleton height={14} width="60%" />
      </div>

      {/* Pickup Window */}
      <div className="bg-loqme-neutral-50 rounded-lg p-2.5 flex items-center justify-between">
        <Skeleton height={14} width={90} />
        <Skeleton height={14} width={70} />
      </div>

      {/* Pricing & CTA */}
      <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
        <div className="space-y-1">
          <Skeleton height={12} width={60} />
          <Skeleton height={20} width={95} />
        </div>
        <Skeleton
          height={38}
          width={100}
          variant="rounded"
          className="rounded-full"
        />
      </div>
    </div>
  );
};

export const ListingGridSkeleton: React.FC<{ count?: number }> = ({
  count = 6,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, idx) => (
        <ListingCardSkeleton key={idx} />
      ))}
    </div>
  );
};

export const TableSkeleton: React.FC<{ rows?: number; cols?: number }> = ({
  rows = 5,
  cols = 4,
}) => {
  return (
    <div className="w-full space-y-3 p-4 bg-loqme-neutral-900/60 rounded-lg border border-loqme-neutral-800">
      <div className="flex items-center justify-between pb-3 border-b border-loqme-neutral-800">
        <Skeleton height={24} width={140} />
        <Skeleton height={32} width={90} />
      </div>
      {Array.from({ length: rows }).map((_, rIdx) => (
        <div key={rIdx} className="flex items-center gap-4 py-2.5">
          {Array.from({ length: cols }).map((_, cIdx) => (
            <Skeleton
              key={cIdx}
              height={18}
              width={cIdx === 0 ? "30%" : cIdx === cols - 1 ? "15%" : "25%"}
            />
          ))}
        </div>
      ))}
    </div>
  );
};
