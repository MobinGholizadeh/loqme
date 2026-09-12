'use client';

import React from 'react';
import {
  Search01Icon,
  Location01Icon,
  PinLocation01Icon,
  ShoppingBag01Icon,
  ShoppingBag02Icon,
  ShoppingCart01Icon,
  UserIcon,
  Cancel01Icon,
  Clock01Icon,
  Bread01Icon,
  Coffee01Icon,
  Restaurant01Icon,
  Apple01Icon,
  StarIcon,
  SparklesIcon,
  Logout01Icon,
  Settings01Icon,
  DashboardSquare01Icon,
  Store01Icon,
  Download01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  CheckmarkCircle01Icon,
  AlertCircleIcon,
  ViewIcon,
  ViewOffSlashIcon,
} from 'hugeicons-react';

export {
  Search01Icon,
  Location01Icon,
  PinLocation01Icon,
  ShoppingBag01Icon,
  ShoppingBag02Icon,
  ShoppingCart01Icon,
  UserIcon,
  Cancel01Icon,
  Clock01Icon,
  Bread01Icon,
  Coffee01Icon,
  Restaurant01Icon,
  Apple01Icon,
  StarIcon,
  SparklesIcon,
  Logout01Icon,
  Settings01Icon,
  DashboardSquare01Icon,
  Store01Icon,
  Download01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  CheckmarkCircle01Icon,
  AlertCircleIcon,
  ViewIcon,
  ViewOffSlashIcon,
};

// Aliased helpers for easy semantic consumption
export const Icons = {
  Search: Search01Icon,
  Location: Location01Icon,
  Pin: PinLocation01Icon,
  Bag: ShoppingBag01Icon,
  BagAlt: ShoppingBag02Icon,
  Cart: ShoppingCart01Icon,
  User: UserIcon,
  Close: Cancel01Icon,
  Clock: Clock01Icon,
  Bread: Bread01Icon,
  Coffee: Coffee01Icon,
  Restaurant: Restaurant01Icon,
  Produce: Apple01Icon,
  Star: StarIcon,
  Sparkles: SparklesIcon,
  Logout: Logout01Icon,
  Settings: Settings01Icon,
  Dashboard: DashboardSquare01Icon,
  Store: Store01Icon,
  Download: Download01Icon,
  ArrowLeft: ArrowLeft01Icon,
  ArrowRight: ArrowRight01Icon,
  Checkmark: CheckmarkCircle01Icon,
  Alert: AlertCircleIcon,
  Eye: ViewIcon,
  EyeOff: ViewOffSlashIcon,
  Shield: ({ className, size = 18 }: { className?: string; size?: number }) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  ),
};
