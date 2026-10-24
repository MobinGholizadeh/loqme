"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { HoloCard } from "@/components/ui/holo-card";
import {
  Zap,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  BarChart3,
  LineChart,
  Edit3,
  Plus,
  ChevronDown,
  CreditCard,
  Send,
  History,
  MoreHorizontal,
  Sparkles,
  Clock,
  ShoppingBag,
  Package,
  Wallet,
  Store,
  CheckCircle2,
  XCircle,
  Info,
  ExternalLink,
  ShieldCheck,
  Building2,
  Car,
  Plane,
  HeartHandshake,
  ArrowRight,
  SlidersHorizontal,
  PiggyBank,
  Check,
  Users,
} from "lucide-react";

import { FastListingModal } from "@/components/merchant/FastListingModal";
import { formatToman, toPersianDigits } from "@/lib/utils/persian";
import { MerchantDashboardDto, MerchantBankAccountDto } from "@loqme/types";

function formatCardShaba(shaba: string): string {
  const clean = shaba.replace(/^IR/i, "").replace(/\s+/g, "");
  if (clean.length < 4) return shaba;
  const last4 = clean.slice(-4);
  return `IR•• •••• •••• •••• ${last4}`;
}

import type { MerchantSalesDayDto } from "@loqme/types";

type DayStat = MerchantSalesDayDto;

function getEmptyWeekDays(): DayStat[] {
  const DAY_NAMES = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنج‌شنبه", "جمعه"];
  const DAY_SHORTS = ["ش", "ی", "د", "س", "چ", "پ", "ج"];
  const now = new Date();
  const currentDayOfWeek = (now.getDay() + 1) % 7;
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - currentDayOfWeek);
  startOfWeek.setHours(0, 0, 0, 0);

  return DAY_NAMES.map((name, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    let dateFa = name;
    try {
      const parts = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }).formatToParts(d);
      const p = Object.fromEntries(parts.map((x) => [x.type, x.value]));
      dateFa = `${p.weekday}، ${p.day} ${p.month} ${p.year}`;
    } catch {
      dateFa = `${name}، ${d.toLocaleDateString("fa-IR")}`;
    }
    return {
      id: i,
      dayName: name,
      dayShort: DAY_SHORTS[i],
      dateFa,
      savings: 0,
      income: 0,
      expenses: 0,
      heightPercent: 12,
    };
  });
}

export default function MerchantDashboardPage() {
  const [stats, setStats] = useState<MerchantDashboardDto | null>(null);
  const [bankAccounts, setBankAccounts] = useState<MerchantBankAccountDto[]>([]);
  const [isBankLoading, setIsBankLoading] = useState<boolean>(true);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isFastListingOpen, setIsFastListingOpen] = useState<boolean>(false);

  // Interactive controls
  const currentDayOfWeek = typeof window !== "undefined" ? (new Date().getDay() + 1) % 7 : 0;
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "today">("7d");
  const [chartType, setChartType] = useState<"bar" | "line">("bar");
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(currentDayOfWeek);
  const [categoryMonth, setCategoryMonth] = useState<string>(() => {
    try {
      return new Intl.DateTimeFormat("fa-IR-u-ca-persian", { month: "long" }).format(new Date());
    } catch {
      return "آبان";
    }
  });
  const [healthPeriod, setHealthPeriod] = useState<string>("30d");

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/merchant/dashboard");
      const json = await res.json();
      if (!res.ok || !json.success || !json.data) {
        throw new Error(json.message || "دریافت اطلاعات ممکن نشد");
      }
      setError("");
      setStats(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "دریافت اطلاعات ممکن نشد");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchBankAccounts = useCallback(async () => {
    try {
      const res = await fetch("/api/merchant/bank-accounts");
      const json = await res.json();
      if (res.ok && json.success && Array.isArray(json.data)) {
        setBankAccounts(json.data);
      }
    } catch {
      // Non-fatal for dashboard
    } finally {
      setIsBankLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    fetchBankAccounts();
    const interval = setInterval(() => {
      fetchStats();
      fetchBankAccounts();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchStats, fetchBankAccounts]);

  // Priority:
  // 1. Default approved account
  // 2. Any approved account
  // 3. Any pending account (blurred/placeholder)
  // 4. Any rejected account
  const approvedAccount = bankAccounts.find((a) => a.isDefault && a.status === "APPROVED")
    || bankAccounts.find((a) => a.status === "APPROVED");
  const pendingAccount = bankAccounts.find((a) => a.status === "PENDING");
  const rejectedAccount = bankAccounts.find((a) => a.status === "REJECTED");

  const chartData: DayStat[] = (timeRange === "30d" ? stats?.monthlySales : stats?.weeklySales)
    || (stats?.weeklySales?.length ? stats.weeklySales : getEmptyWeekDays());

  const selectedDay = chartData[selectedDayIndex] || chartData[currentDayOfWeek] || chartData[0] || getEmptyWeekDays()[0];

  // Dynamic values from real database orders for the period
  const totalIncomeDisplay = chartData.reduce((sum, d) => sum + (d.income || 0), 0);
  const totalExpensesDisplay = chartData.reduce((sum, d) => sum + (d.expenses || 0), 0);
  const savedBalanceDisplay = Math.max(0, totalIncomeDisplay - totalExpensesDisplay);
  const mainBalanceDisplay = totalIncomeDisplay > 0 ? totalIncomeDisplay : (stats?.grossRevenueTodayToman || 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 font-sans">
      {/* Hidden button for header "+ ثبت بسته" button trigger */}
      <button
        id="btn-fast-listing-trigger"
        type="button"
        className="hidden"
        onClick={() => setIsFastListingOpen(true)}
        aria-hidden="true"
      />

      {/* Error Banner */}
      {error && (
        <div
          role="alert"
          className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl flex items-center justify-between text-xs"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={fetchStats}
            className="font-bold underline text-rose-900 mr-2"
          >
            تلاش مجدد
          </button>
        </div>
      )}

      {/* Active Pickup Window Banner (Loqme Core Functionality) */}
      {stats?.nextPickupWindow && (
        <div className="bg-gradient-to-l from-[#EFF7F4] via-[#E1EFEB] to-white border border-[#BCD8D1] rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#1D616A] text-white shadow-2xs">
                بازه تحویل حضوری امروز
              </span>
              {stats.nextPickupWindow.startsInMinutes > 0 ? (
                <span className="text-xs font-bold text-[#174F56] bg-white px-2 py-0.5 rounded-md border border-[#BCD8D1] shadow-2xs">
                  شروع در {toPersianDigits(stats.nextPickupWindow.startsInMinutes)} دقیقه دیگر
                </span>
              ) : (
                <span className="text-xs font-bold text-[#174F56] bg-[#EFF7F4] border border-[#BCD8D1] px-2 py-0.5 rounded-md animate-pulse">
                  ● هم‌اکنون در حال برگزاری
                </span>
              )}
            </div>
            <h3 className="font-black text-base text-slate-900 mt-1">
              {stats.nextPickupWindow.labelFa}
            </h3>
            <p className="text-xs text-slate-600">
              لطفاً بسته‌های رزرو شده را تفکیک کنید تا هنگام مراجعه خریداران، تایید و اسکن بدون معطلی انجام گیرد
            </p>
          </div>

          <Link
            href="/merchant/orders"
            className="portal-action-btn px-4 py-2 text-xs flex items-center justify-center gap-2 shadow-xs shrink-0"
          >
            <span>مشاهده صف تحویل ({toPersianDigits(stats.pendingPickupsCount || 0)})</span>
            <ArrowRight size={15} />
          </Link>
        </div>
      )}

      {/* Bento Grid: 8 Cols (Main Content) + 4 Cols (Sidebar Cards) on XL screens */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ========================================================================= */}
        {/* LEFT / CENTER 8-COLUMN MAIN AREA                                          */}
        {/* ========================================================================= */}
        <div className="lg:col-span-8 space-y-6">
          {/* Card 1: Balance Overview Hero Card with Interactive Weekly Chart */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-2xs">
            {/* Card Header */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-slate-100">
              <div>
                <div className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                  {formatToman(mainBalanceDisplay)}
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mt-1">
                  <span>گردش و موجودی کل فروشگاه</span>
                  {stats && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#174F56] bg-[#EFF7F4] border border-[#BCD8D1] px-2 py-0.5 rounded-md">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#1D616A] animate-ping" />
                      بروزرسانی زنده
                    </span>
                  )}
                </div>
              </div>

              {/* Controls: Range selector, Chart toggle & Legends */}
              <div className="flex flex-col sm:items-end gap-3">
                <div className="flex items-center gap-2">
                  {/* Period Pills */}
                  <div className="bg-slate-100/90 p-1 rounded-xl flex items-center text-xs font-bold text-slate-600">
                    <button
                      type="button"
                      onClick={() => setTimeRange("7d")}
                      className={`px-3 py-1 rounded-lg transition-all ${
                        timeRange === "7d"
                          ? "bg-white text-[#174F56] shadow-2xs font-black"
                          : "hover:text-[#174F56]"
                      }`}
                    >
                      ۷ روز
                    </button>
                    <button
                      type="button"
                      onClick={() => setTimeRange("30d")}
                      className={`px-3 py-1 rounded-lg transition-all ${
                        timeRange === "30d"
                          ? "bg-white text-[#174F56] shadow-2xs font-black"
                          : "hover:text-[#174F56]"
                      }`}
                    >
                      ۳۰ روز
                    </button>
                  </div>

                  {/* Chart type switch */}
                  <div className="bg-slate-100/90 p-1 rounded-xl flex items-center">
                    <button
                      type="button"
                      onClick={() => setChartType("bar")}
                      className={`p-1.5 rounded-lg transition-all ${
                        chartType === "bar"
                          ? "bg-white text-slate-900 shadow-2xs"
                          : "text-slate-400 hover:text-slate-700"
                      }`}
                      title="نمودار ستونی"
                    >
                      <BarChart3 size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setChartType("line")}
                      className={`p-1.5 rounded-lg transition-all ${
                        chartType === "line"
                          ? "bg-white text-slate-900 shadow-2xs"
                          : "text-slate-400 hover:text-slate-700"
                      }`}
                      title="نمودار خطی"
                    >
                      <LineChart size={15} />
                    </button>
                  </div>
                </div>

                {/* Color Legend */}
                <div className="flex items-center gap-3 text-[11px] font-semibold text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-xs bg-[#FACC15]" />
                    <span>رزرو شده</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-xs bg-[#1D616A]" />
                    <span>فروش قطعی</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-xs bg-[#FB923C]" />
                    <span>کارمزد</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Split Main Chart Body: Left 68% Weekly Chart, Right 32% 3 Mini KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-6 items-center">
              {/* Interactive Weekly Bar Chart (8 of 12 columns on MD) */}
              <div className="md:col-span-8 relative">
                {/* Floating Tooltip dynamically positioned over Selected Bar */}
                <div className="relative h-24 mb-1">
                  <div
                    className="absolute bottom-0 transition-all duration-300 pointer-events-none z-10"
                    style={{
                      right: `${((selectedDayIndex + 0.5) / Math.max(chartData.length, 1)) * 100}%`,
                      transform: "translateX(50%)",
                    }}
                  >
                    <div className="bg-white border border-slate-200/90 rounded-2xl p-3 shadow-lg text-right w-44 whitespace-nowrap">
                      <div className="text-[11px] font-bold text-slate-800 pb-1.5 border-b border-slate-100">
                        {selectedDay.dateFa}
                      </div>
                      <div className="space-y-1 pt-1.5 text-[10px] font-semibold">
                        <div className="flex items-center justify-between gap-3 text-slate-600">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-[#FACC15]" />
                            <span>رزرو شده:</span>
                          </span>
                          <span className="font-bold text-slate-900">{formatToman(selectedDay.savings)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3 text-slate-600">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-[#1D616A]" />
                            <span>فروش قطعی:</span>
                          </span>
                          <span className="font-bold text-slate-900">{formatToman(selectedDay.income)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3 text-slate-600">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-[#FB923C]" />
                            <span>کارمزد:</span>
                          </span>
                          <span className="font-bold text-slate-900">{formatToman(selectedDay.expenses)}</span>
                        </div>
                      </div>
                      {/* Tooltip triangle indicator */}
                      <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-b border-r border-slate-200/90 rotate-45" />
                    </div>
                  </div>
                </div>

                {/* Chart Graphic Area: Supports both Bar and Line modes */}
                {chartType === "line" ? (
                  <div className="relative h-52 pt-4 px-2 flex flex-col justify-end">
                    <svg className="w-full h-36 overflow-visible" viewBox="0 0 700 140" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="loqmeChartGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#1D616A" stopOpacity="0.35" />
                          <stop offset="100%" stopColor="#1D616A" stopOpacity="0.02" />
                        </linearGradient>
                      </defs>
                      {(() => {
                        const len = Math.max(chartData.length, 1);
                        const points = chartData.map((d, i) => {
                          const x = ((len - 1 - i) / Math.max(len - 1, 1)) * 660 + 20;
                          const y = 130 - (d.heightPercent / 100) * 110;
                          return { x, y };
                        });
                        const areaPath = points.length > 0
                          ? `M ${points[0].x} 130 L ${points.map((p) => `${p.x} ${p.y}`).join(" L ")} L ${points[points.length - 1].x} 130 Z`
                          : "";
                        const linePath = points.length > 0
                          ? `M ${points.map((p) => `${p.x} ${p.y}`).join(" L ")}`
                          : "";
                        return (
                          <>
                            <path d={areaPath} fill="url(#loqmeChartGrad)" />
                            <path d={linePath} fill="none" stroke="#1D616A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                            {points.map((p, idx) => (
                              <circle
                                key={idx}
                                cx={p.x}
                                cy={p.y}
                                r={selectedDayIndex === idx ? 6 : 4}
                                className={`cursor-pointer transition-all ${
                                  selectedDayIndex === idx
                                    ? "fill-[#1D616A] stroke-white stroke-2 shadow-md"
                                    : "fill-white stroke-[#1D616A] stroke-2 hover:fill-[#1D616A]"
                                }`}
                                onClick={() => setSelectedDayIndex(idx)}
                                onMouseEnter={() => setSelectedDayIndex(idx)}
                              />
                            ))}
                          </>
                        );
                      })()}
                    </svg>
                    <div className="flex justify-between w-full mt-3 px-1 text-[11px] font-bold text-slate-400">
                      {chartData.map((day, idx) => (
                        <button
                          key={day.id}
                          type="button"
                          onClick={() => setSelectedDayIndex(idx)}
                          className={`cursor-pointer transition-colors ${
                            selectedDayIndex === idx ? "text-slate-900 font-black" : "hover:text-slate-700"
                          }`}
                        >
                          {timeRange === "30d" ? day.dayShort : day.dayName}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-end justify-between gap-2 sm:gap-3 h-52 pt-4 px-1">
                    {chartData.map((day, idx) => {
                      const isSelected = selectedDayIndex === idx;
                      const dayTotal = day.savings + day.income + day.expenses;
                      const savingsH = dayTotal > 0 ? Math.round((day.savings / dayTotal) * 100) : 0;
                      const incomeH = dayTotal > 0 ? Math.round((day.income / dayTotal) * 100) : 100;
                      const expensesH = dayTotal > 0 ? Math.max(0, 100 - savingsH - incomeH) : 0;

                      return (
                        <button
                          key={day.id}
                          type="button"
                          onClick={() => setSelectedDayIndex(idx)}
                          onMouseEnter={() => setSelectedDayIndex(idx)}
                          className="flex-1 flex flex-col items-center h-full justify-end group focus:outline-none"
                        >
                          {/* Bar Pillar */}
                          <div className="w-full max-w-[36px] bg-slate-100 rounded-2xl h-full flex flex-col justify-end p-1 transition-all group-hover:bg-slate-200/80">
                            {isSelected ? (
                              /* Selected Day Segmented Bar (Yellow / Loqme Teal / Orange) */
                              <div
                                className="w-full rounded-xl overflow-hidden flex flex-col shadow-md transition-all duration-300"
                                style={{ height: `${day.heightPercent}%` }}
                              >
                                {dayTotal > 0 ? (
                                  <>
                                    <div className="bg-[#FACC15] w-full" style={{ height: `${savingsH}%` }} />
                                    <div className="bg-[#1D616A] w-full" style={{ height: `${incomeH}%` }} />
                                    <div className="bg-[#FB923C] w-full" style={{ height: `${expensesH}%` }} />
                                  </>
                                ) : (
                                  <div className="w-full h-full bg-[#1D616A]/20" />
                                )}
                              </div>
                            ) : day.income > 0 ? (
                              <div
                                className="w-full rounded-xl bg-[#1D616A]/75 group-hover:bg-[#1D616A] transition-all duration-300"
                                style={{ height: `${day.heightPercent}%` }}
                              />
                            ) : (
                              <div
                                className="w-full rounded-xl bg-slate-200/70 group-hover:bg-slate-300 transition-all duration-300"
                                style={{ height: `${day.heightPercent}%` }}
                              />
                            )}
                          </div>

                          {/* Day Label */}
                          <span
                            className={`text-[11px] font-bold mt-2 transition-colors ${
                              isSelected ? "text-slate-900 font-black" : "text-slate-400 group-hover:text-slate-700"
                            }`}
                          >
                            {timeRange === "30d" ? day.dayShort : day.dayName}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 3 Stacked KPI Metric Cards (4 of 12 columns on MD) */}
              <div className="md:col-span-4 flex flex-col gap-3.5 border-t md:border-t-0 md:border-r md:border-slate-100 md:pr-6 pt-4 md:pt-0">
                {/* 1. Total Income */}
                <div className="bg-slate-50/70 border border-slate-100 rounded-2xl p-3.5 hover:bg-white hover:border-slate-200 hover:shadow-2xs transition-all">
                  <div className="text-[11px] font-medium text-slate-500">درآمد کل</div>
                  <div className="text-xl font-black text-slate-900 mt-1">
                    {formatToman(totalIncomeDisplay)}
                  </div>
                  <div className="inline-flex items-center gap-1 text-[10px] font-bold text-[#174F56] bg-[#EFF7F4] border border-[#BCD8D1] px-2 py-0.5 rounded-md mt-1">
                    <TrendingUp size={13} className="text-[#1D616A]" />
                    <span>+۵.۱% نسبت به ماه قبل</span>
                  </div>
                </div>

                {/* 2. Total Expenses */}
                <div className="bg-slate-50/70 border border-slate-100 rounded-2xl p-3.5 hover:bg-white hover:border-slate-200 hover:shadow-2xs transition-all">
                  <div className="text-[11px] font-medium text-slate-500">کارمزد و هزینه‌ها</div>
                  <div className="text-xl font-black text-slate-900 mt-1">
                    {formatToman(totalExpensesDisplay)}
                  </div>
                  <div className="inline-flex items-center gap-1 text-[10px] font-bold text-orange-700 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-md mt-1">
                    <TrendingUp size={13} />
                    <span>+۱۵.۵% نسبت به ماه قبل</span>
                  </div>
                </div>

                {/* 3. Saved Balance / Payout */}
                <div className="bg-slate-50/70 border border-slate-100 rounded-2xl p-3.5 hover:bg-white hover:border-slate-200 hover:shadow-2xs transition-all">
                  <div className="text-[11px] font-medium text-slate-500">مانده خالص تسویه</div>
                  <div className="text-xl font-black text-slate-900 mt-1">
                    {formatToman(savedBalanceDisplay)}
                  </div>
                  <div className="inline-flex items-center gap-1 text-[10px] font-bold text-[#174F56] bg-[#EFF7F4] border border-[#BCD8D1] px-2 py-0.5 rounded-md mt-1">
                    <TrendingUp size={13} className="text-[#1D616A]" />
                    <span>+۲۰.۷% نسبت به ماه قبل</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: Two Cards (Spending Limit / Capacity + Smart Optimization Tips) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card 1: Monthly Spending Limit / Supply Capacity */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="font-black text-sm text-slate-900">سقف تامین و ظرفیت امروز</h3>
                  <button
                    type="button"
                    className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:text-[#174F56] hover:bg-[#EFF7F4] hover:border-[#8DB9B2] transition-colors"
                    title="ویرایش سقف"
                  >
                    <Edit3 size={14} />
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">حساب‌های فعال و سقف تامین مازاد</p>
              </div>

              <div className="mt-6 space-y-2">
                {/* Striped Loqme Teal Progress Bar */}
                <div className="h-6 w-full bg-[#EFF7F4] border border-[#BCD8D1] rounded-xl overflow-hidden p-0.5">
                  <div className="h-full rounded-lg bg-striped-loqme transition-all duration-700 w-[86%]" />
                </div>
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 px-1">
                  <span>{toPersianDigits("۸,۶۰۰")} بسته</span>
                  <span className="text-slate-400">{toPersianDigits("۱۰,۰۰۰")} بسته</span>
                </div>
              </div>
            </div>

            {/* Card 2: Optimize Budget with Quick Tips + Isometric Graphic */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-2xs flex items-center justify-between gap-4">
              <div className="space-y-2 flex-1">
                <h3 className="font-black text-sm text-slate-900 leading-snug">
                  فروش خود را با این توصیه‌های هوشمند بهینه‌سازی کنید
                </h3>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  با عرضه بسته‌ها بین ساعت ۱۸:۳۰ تا ۲۱:۰۰ و تنظیم قیمت تا ۵۰٪ تخفیف، نرخ فروش ۱۰۰٪ می‌شود
                </p>
                <div className="pt-1">
                  <Link
                    href="/merchant/insights"
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#1D616A] hover:text-[#174F56] transition-colors"
                  >
                    <span>مطالعه بیشتر</span>
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </div>

              {/* 3D Isometric Loqme Teal Staircase Graphic */}
              <div className="shrink-0 pl-1">
                <svg width="86" height="74" viewBox="0 0 86 74" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Step 1 top */}
                  <path d="M58 12 L72 20 L58 28 L44 20 Z" fill="#8DB9B2" />
                  <path d="M44 20 L58 28 L58 40 L44 32 Z" fill="#1D616A" />
                  <path d="M58 28 L72 20 L72 32 L58 40 Z" fill="#174F56" />
                  {/* Step 2 */}
                  <path d="M44 28 L58 36 L44 44 L30 36 Z" fill="#BCD8D1" />
                  <path d="M30 36 L44 44 L44 56 L30 48 Z" fill="#28757A" />
                  <path d="M44 44 L58 36 L58 48 L44 56 Z" fill="#174F56" />
                  {/* Step 3 */}
                  <path d="M30 44 L44 52 L30 60 L16 52 Z" fill="#E1EFEB" />
                  <path d="M16 52 L30 60 L30 70 L16 62 Z" fill="#548E8B" />
                  <path d="M30 60 L44 52 L44 62 L30 70 Z" fill="#1D616A" />
                </svg>
              </div>
            </div>
          </div>

          {/* Row 3: Three Bento Cards (Cost Analysis, Financial Health, Goal Tracker) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1: Cost / Category Analysis */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-black text-xs text-slate-900">تحلیل سهم رسته‌ها</h3>
                    <p className="text-[10px] text-slate-400">سهم دسته‌بندی‌ها</p>
                  </div>
                  <select
                    value={categoryMonth}
                    onChange={(e) => setCategoryMonth(e.target.value)}
                    className="text-[10px] font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 cursor-pointer"
                  >
                    <option value="آبان">آبان ماه</option>
                    <option value="مهر">مهر ماه</option>
                  </select>
                </div>

                <div className="text-xl font-black text-slate-900 mt-3">
                  {formatToman(8450000)}
                </div>

                {/* Multi-segmented horizontal bar */}
                <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex my-3.5">
                  <div style={{ width: "18%" }} className="bg-[#FB923C]" />
                  <div style={{ width: "7%" }} className="bg-[#F59E0B]" />
                  <div style={{ width: "6%" }} className="bg-[#FACC15]" />
                  <div style={{ width: "9%" }} className="bg-[#548E8B]" />
                  <div style={{ width: "10%" }} className="bg-[#1D616A]" />
                  <div style={{ width: "17%" }} className="bg-[#28757A]" />
                  <div style={{ width: "33%" }} className="bg-slate-300" />
                </div>

                {/* Categories list */}
                <div className="space-y-1 text-[10px] font-semibold text-slate-600">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-xs bg-[#FB923C]" />
                      <span>نان و شیرینی سنتی</span>
                    </span>
                    <span className="font-bold text-slate-800">{toPersianDigits(18)}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-xs bg-[#F59E0B]" />
                      <span>غذای آماده و گرم</span>
                    </span>
                    <span className="font-bold text-slate-800">{toPersianDigits(7)}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-xs bg-[#FACC15]" />
                      <span>میوه و سبزیجات تازه</span>
                    </span>
                    <span className="font-bold text-slate-800">{toPersianDigits(6)}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-xs bg-[#548E8B]" />
                      <span>کافی‌شاپ و نوشیدنی</span>
                    </span>
                    <span className="font-bold text-slate-800">{toPersianDigits(9)}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-xs bg-[#1D616A]" />
                      <span>خواربار و سوپرمارکت</span>
                    </span>
                    <span className="font-bold text-slate-800">{toPersianDigits(10)}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-xs bg-[#28757A]" />
                      <span>پروتئین و لبنیات</span>
                    </span>
                    <span className="font-bold text-slate-800">{toPersianDigits(17)}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-xs bg-slate-300" />
                      <span>سایر اقلام مازاد</span>
                    </span>
                    <span className="font-bold text-slate-800">{toPersianDigits(33)}%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2: Financial & Store Health (Speedometer Arc Gauge) */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-black text-xs text-slate-900">شاخص سلامت فروشگاه</h3>
                    <p className="text-[10px] text-slate-400">وضعیت کیفی و رضایت</p>
                  </div>
                  <select
                    value={healthPeriod}
                    onChange={(e) => setHealthPeriod(e.target.value)}
                    className="text-[10px] font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 cursor-pointer"
                  >
                    <option value="30d">۳۰ روز</option>
                    <option value="7d">۷ روز</option>
                  </select>
                </div>

                <div className="text-xl font-black text-slate-900 mt-3">
                  {formatToman(15780000)}
                </div>
                <div className="inline-flex items-center gap-1 text-[10px] font-bold text-[#174F56] bg-[#EFF7F4] border border-[#BCD8D1] px-2 py-0.5 rounded-md mt-1">
                  <span>+۱۷.۵% نسبت به ماه گذشته</span>
                </div>

                {/* Semi-circular Speedometer / Gauge Chart */}
                <div className="relative mt-4 mb-2 flex flex-col items-center justify-center">
                  <svg viewBox="0 0 200 115" className="w-full max-w-[170px]">
                    <defs>
                      <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#F59E0B" />
                        <stop offset="50%" stopColor="#28757A" />
                        <stop offset="100%" stopColor="#1D616A" />
                      </linearGradient>
                    </defs>
                    {/* Background Arc */}
                    <path
                      d="M 25 105 A 75 75 0 0 1 175 105"
                      fill="none"
                      stroke="#F1F5F9"
                      strokeWidth="16"
                      strokeLinecap="round"
                    />
                    {/* Progress Arc */}
                    <path
                      d="M 25 105 A 75 75 0 0 1 175 105"
                      fill="none"
                      stroke="url(#gaugeGradient)"
                      strokeWidth="16"
                      strokeLinecap="round"
                      strokeDasharray="235.6"
                      strokeDashoffset={235.6 * (1 - 0.75)}
                      className="transition-all duration-1000 ease-out"
                    />
                  </svg>
                  {/* Gauge Center Text */}
                  <div className="absolute bottom-1 text-center">
                    <span className="text-2xl font-black text-slate-900 block leading-tight">
                      {toPersianDigits(75)}%
                    </span>
                    <span className="text-[9px] font-semibold text-slate-400 block">
                      نرخ نجات موفق غذا
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-[9px] text-slate-400 text-center border-t border-slate-100 pt-2.5">
                بر اساس تحلیل شاخص‌های سفارش در ۳۰ روز اخیر
              </div>
            </div>

            {/* Card 3: Goal Tracker */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="font-black text-xs text-slate-900">اهداف فروشگاه</h3>
                  <button
                    type="button"
                    onClick={() => alert("فرم ثبت هدف جدید به‌زودی باز خواهد شد")}
                    className="portal-action-btn text-[10px] font-bold px-2.5 py-1"
                  >
                    + افزودن هدف
                  </button>
                </div>

                {/* Section: This Year */}
                <div className="mt-3">
                  <span className="text-[10px] font-bold text-slate-400 block mb-1">امسال</span>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-800">
                      <span className="flex items-center gap-1.5">
                        <Building2 size={13} className="text-[#1D616A]" />
                        <span>صندوق ذخیره غذا</span>
                      </span>
                      <span>{toPersianDigits("۷,۰۰۰")} / {toPersianDigits("۱۰,۰۰۰")}</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-[#1D616A] rounded-full w-[70%]" />
                    </div>
                    <span className="text-[9px] text-slate-400 block">۴ ماه تا پایان سال</span>
                  </div>
                </div>

                {/* Section: Long Term */}
                <div className="mt-3 space-y-2.5">
                  <span className="text-[10px] font-bold text-slate-400 block">بلند مدت</span>

                  {/* Goal item 1 */}
                  <div className="space-y-0.5">
                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-800">
                      <span className="flex items-center gap-1.5">
                        <PiggyBank size={12} className="text-orange-500" />
                        <span>کاهش ضایعات نان</span>
                      </span>
                      <span>{toPersianDigits("۲,۵۰۰")} / {toPersianDigits("۴,۰۰۰")}</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-[#FB923C] rounded-full w-[62%]" />
                    </div>
                    <span className="text-[8px] text-slate-400 block">۳ ماه مانده</span>
                  </div>

                  {/* Goal item 2 */}
                  <div className="space-y-0.5">
                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-800">
                      <span className="flex items-center gap-1.5">
                        <Car size={12} className="text-amber-500" />
                        <span>سرمایه‌گذاری تجهیزات</span>
                      </span>
                      <span>{toPersianDigits("۱,۶۰۰")} / {toPersianDigits("۲۰,۰۰۰")}</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-[#F59E0B] rounded-full w-[25%]" />
                    </div>
                    <span className="text-[8px] text-slate-400 block">۲ سال و ۶ ماه مانده</span>
                  </div>

                  {/* Goal item 3 */}
                  <div className="space-y-0.5">
                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-800">
                      <span className="flex items-center gap-1.5">
                        <Plane size={12} className="text-[#1D616A]" />
                        <span>توسعه شعبه دوم</span>
                      </span>
                      <span>{toPersianDigits("۸,۳۰۰")} / {toPersianDigits("۱۰,۰۰۰")}</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-[#28757A] rounded-full w-[83%]" />
                    </div>
                    <span className="text-[8px] text-slate-400 block">۳ سال مانده</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT 4-COLUMN AREA (CARD, QUICK PAYMENT, TRANSACTION HISTORY)             */}
        {/* ========================================================================= */}
        <div className="lg:col-span-4 space-y-6">
          {/* Card 1: My Card (Hyper-realistic Loqme Teal Debit Card) */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-black text-sm text-slate-900">کارت و حساب تسویه</h3>
                <p className="text-[10px] text-slate-400">عملیات بانکی شتاب</p>
              </div>
              <Link
                href="/merchant/finance?tab=accounts"
                className="portal-action-btn text-[11px] font-bold px-3 py-1 shadow-2xs inline-block"
              >
                {approvedAccount ? "مدیریت حساب‌ها" : "+ ثبت حساب"}
              </Link>
            </div>

            {/* Dynamic Bank Card Preview */}
            {isBankLoading ? (
              <div className="rounded-2xl p-5 border border-slate-200 bg-slate-50/70 animate-pulse flex flex-col justify-between h-[180px]">
                <div className="flex justify-between items-center">
                  <div className="h-4 w-24 bg-slate-200 rounded-md" />
                  <div className="h-4 w-16 bg-slate-200 rounded-full" />
                </div>
                <div className="h-6 w-9 bg-slate-200 rounded-md my-auto" />
                <div className="h-4 w-44 bg-slate-200 rounded-md" />
                <div className="flex justify-between items-center">
                  <div className="h-3 w-28 bg-slate-200 rounded-md" />
                  <div className="h-3 w-12 bg-slate-200 rounded-md" />
                </div>
              </div>
            ) : approvedAccount ? (
              /* Approved Account Card: Interactive 3D Holographic Card */
              <div className="flex flex-col items-center">
                <HoloCard
                  holder={approvedAccount.accountHolder}
                  number={approvedAccount.shabaNumber.replace(/\D/g, "").slice(-16).padStart(16, "5022")}
                  tier={approvedAccount.bankName || "LOQME PAY"}
                  expires="1408/06"
                  cvv="782"
                  logo={
                    <div className="flex items-center gap-1.5">
                      <span className="font-black text-sm text-[#1D616A] tracking-tight">لقمه پی</span>
                      <span className="text-[9px] bg-emerald-100 text-emerald-800 border border-emerald-300 px-1.5 py-0.2 rounded font-bold">
                        تایید شده
                      </span>
                    </div>
                  }
                  network={
                    <span className="flex items-center gap-1 text-[10px] font-black text-slate-800 bg-white/90 px-2 py-0.5 rounded shadow-2xs border border-slate-200">
                      شتاب
                    </span>
                  }
                  className="w-full"
                />
                <div className="w-full flex items-center justify-between mt-3 px-1 text-[11px] text-slate-500">
                  <span className="font-mono font-bold text-slate-700" dir="ltr">
                    {toPersianDigits(formatCardShaba(approvedAccount.shabaNumber))}
                  </span>
                  <span className="font-bold text-slate-700">
                    {approvedAccount.isDefault ? "حساب پیش‌فرض تسویه" : "تسویه مستقیم پایا"}
                  </span>
                </div>
              </div>
            ) : pendingAccount ? (
              /* Pending / Unapproved Holographic Card */
              <div className="relative flex flex-col items-center">
                <div className="filter blur-[1.5px] opacity-70 pointer-events-none w-full">
                  <HoloCard
                    holder={pendingAccount.accountHolder}
                    number={pendingAccount.shabaNumber.replace(/\D/g, "").slice(-16).padStart(16, "5022")}
                    tier={pendingAccount.bankName || "در انتظار تایید"}
                    className="w-full"
                  />
                </div>
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-4 text-center">
                  <div className="inline-flex items-center gap-1.5 bg-amber-500 text-slate-950 font-black text-xs px-3.5 py-1.5 rounded-full shadow-md mb-2">
                    <Clock size={13} className="animate-pulse" />
                    <span>در انتظار بررسی و تایید مدیریت</span>
                  </div>
                  <p className="text-[11px] text-slate-700 font-bold max-w-[230px] leading-relaxed bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-amber-200 shadow-xs">
                    شماره شبا و حساب پس از تایید توسط پشتیبانی لقمه فعال خواهد شد
                  </p>
                  <Link
                    href="/merchant/finance?tab=accounts"
                    className="mt-2 text-[10px] font-bold bg-[#1D616A] hover:bg-[#174F56] text-white px-3 py-1 rounded-lg shadow-sm transition-all inline-flex items-center gap-1"
                  >
                    <span>پیگیری وضعیت حساب</span>
                    <ArrowRight size={11} className="rotate-180" />
                  </Link>
                </div>
              </div>
            ) : rejectedAccount ? (
              /* Rejected Holographic Card */
              <div className="relative flex flex-col items-center">
                <div className="filter blur-[2px] opacity-50 pointer-events-none w-full">
                  <HoloCard
                    holder={rejectedAccount.accountHolder}
                    number={rejectedAccount.shabaNumber.replace(/\D/g, "").slice(-16).padStart(16, "5022")}
                    tier={rejectedAccount.bankName || "رد شده"}
                    className="w-full"
                  />
                </div>
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-4 text-center">
                  <div className="inline-flex items-center gap-1.5 bg-rose-600 text-white font-black text-xs px-3.5 py-1.5 rounded-full shadow-md mb-2">
                    <XCircle size={14} />
                    <span>حساب بانکی تایید نشد</span>
                  </div>
                  <p className="text-[11px] text-rose-800 font-bold max-w-[240px] leading-relaxed bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-rose-200 shadow-xs">
                    {rejectedAccount.rejectionReason || "اطلاعات حساب بانکی مورد تایید قرار نگرفت؛ لطفاً شماره شبا را ویرایش فرمایید"}
                  </p>
                  <Link
                    href="/merchant/finance?tab=accounts"
                    className="mt-2 text-[11px] font-bold bg-white text-rose-800 hover:bg-rose-50 px-3.5 py-1 rounded-lg border border-rose-200 shadow-xs transition-all"
                  >
                    ویرایش یا ثبت حساب جدید
                  </Link>
                </div>
              </div>
            ) : (
              /* Empty Placeholder State when no card is registered */
              <div className="rounded-2xl p-6 text-center border-2 border-dashed border-[#BCD8D1] bg-gradient-to-b from-[#F7FAF9] to-[#EFF7F4] space-y-3.5 relative overflow-hidden">
                <div className="w-12 h-12 rounded-2xl bg-white border border-[#BCD8D1] text-[#1D616A] mx-auto flex items-center justify-center shadow-2xs">
                  <CreditCard size={22} />
                </div>
                <div className="space-y-1">
                  <h4 className="font-black text-xs text-slate-800">حساب یا کارت تسویه ثبت نشده است</h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed max-w-[240px] mx-auto">
                    جهت واریز و تسویه درآمدهای حاصل از فروش بسته‌ها، شماره شبای بانکی خود را متصل فرمایید
                  </p>
                </div>
                <div>
                  <Link
                    href="/merchant/finance?tab=accounts"
                    className="portal-action-btn inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2 shadow-2xs"
                  >
                    <Plus size={15} />
                    <span>+ اتصال شماره شبا</span>
                  </Link>
                </div>
              </div>
            )}

            {approvedAccount && pendingAccount && (
              <div className="bg-amber-50/80 border border-amber-200/80 rounded-xl p-2.5 text-[11px] text-amber-900 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <Clock size={13} className="text-amber-600 shrink-0" />
                  <span>یک حساب دیگر نیز در انتظار تایید مدیریت است</span>
                </div>
                <Link
                  href="/merchant/finance?tab=accounts"
                  className="font-bold text-amber-800 underline shrink-0 text-[10px]"
                >
                  مشاهده
                </Link>
              </div>
            )}

            {/* 5 Quick Action Buttons below Debit Card */}
            <div className="grid grid-cols-5 gap-1.5 pt-1 text-center">
              <Link
                href="/merchant/finance?tab=withdrawals"
                className="flex flex-col items-center gap-1 group"
              >
                <div className="w-10 h-10 rounded-2xl border border-slate-200 bg-white flex items-center justify-center text-slate-700 group-hover:border-[#1D616A] group-hover:bg-[#EFF7F4] group-hover:text-[#174F56] transition-all shadow-2xs">
                  <Wallet size={17} />
                </div>
                <span className="text-[10px] font-bold text-slate-600 group-hover:text-[#174F56] transition-colors">تسویه</span>
              </Link>

              <Link
                href="/merchant/finance?tab=accounts"
                className="flex flex-col items-center gap-1 group"
              >
                <div className="w-10 h-10 rounded-2xl border border-slate-200 bg-white flex items-center justify-center text-slate-700 group-hover:border-[#1D616A] group-hover:bg-[#EFF7F4] group-hover:text-[#174F56] transition-all shadow-2xs">
                  <CreditCard size={17} />
                </div>
                <span className="text-[10px] font-bold text-slate-600 group-hover:text-[#174F56] transition-colors">حساب‌ها</span>
              </Link>

              <Link
                href="/merchant/finance?tab=withdrawals"
                className="flex flex-col items-center gap-1 group"
              >
                <div className="w-10 h-10 rounded-2xl border border-slate-200 bg-white flex items-center justify-center text-slate-700 group-hover:border-[#1D616A] group-hover:bg-[#EFF7F4] group-hover:text-[#174F56] transition-all shadow-2xs">
                  <Send size={17} />
                </div>
                <span className="text-[10px] font-bold text-slate-600 group-hover:text-[#174F56] transition-colors">برداشت</span>
              </Link>

              <Link
                href="/merchant/finance"
                className="flex flex-col items-center gap-1 group"
              >
                <div className="w-10 h-10 rounded-2xl border border-slate-200 bg-white flex items-center justify-center text-slate-700 group-hover:border-[#1D616A] group-hover:bg-[#EFF7F4] group-hover:text-[#174F56] transition-all shadow-2xs">
                  <History size={17} />
                </div>
                <span className="text-[10px] font-bold text-slate-600 group-hover:text-[#174F56] transition-colors">تاریخچه</span>
              </Link>

              <button
                type="button"
                onClick={() => alert("امکانات بیشتر")}
                className="flex flex-col items-center gap-1 group"
              >
                <div className="w-10 h-10 rounded-2xl border border-slate-200 bg-white flex items-center justify-center text-slate-700 group-hover:border-[#1D616A] group-hover:bg-[#EFF7F4] group-hover:text-[#174F56] transition-all shadow-2xs">
                  <MoreHorizontal size={17} />
                </div>
                <span className="text-[10px] font-bold text-slate-600 group-hover:text-[#174F56] transition-colors">بیشتر</span>
              </button>
            </div>
          </div>

          {/* Card 2: Quick Payment / Customer Avatars */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-sm text-slate-900">خریداران وفادار و تحویل سریع</h3>
              <button
                type="button"
                className="text-slate-400 hover:text-slate-700"
                title="گزینه‌ها"
              >
                <MoreHorizontal size={16} />
              </button>
            </div>

            {/* Avatars Row */}
            <div className="flex items-center justify-between gap-1 pt-1">
              {[
                { name: "دانیال", bg: "bg-amber-100 text-amber-800", initial: "د" },
                { name: "الهام", bg: "bg-[#EFF7F4] text-[#174F56] border border-[#BCD8D1]", initial: "ا" },
                { name: "رضا", bg: "bg-blue-100 text-blue-800", initial: "ر" },
                { name: "آماندا", bg: "bg-rose-100 text-rose-800", initial: "آ" },
                { name: "آنیتا", bg: "bg-[#E1EFEB] text-[#1D616A] border border-[#BCD8D1]", initial: "ن" },
                { name: "سینا", bg: "bg-purple-100 text-purple-800", initial: "س" },
              ].map((buyer, idx) => (
                <div key={idx} className="flex flex-col items-center gap-1 group cursor-pointer">
                  <div className={`w-10 h-10 rounded-full ${buyer.bg} flex items-center justify-center font-bold text-xs shadow-2xs border-2 border-white group-hover:scale-105 transition-transform`}>
                    {buyer.initial}
                  </div>
                  <span className="text-[10px] font-semibold text-slate-600 group-hover:text-slate-900">
                    {buyer.name}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Card 3: Transaction History */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-sm text-slate-900">تاریخچه تراکنش‌ها</h3>
              <select
                className="text-[10px] font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 cursor-pointer"
                defaultValue="7d"
              >
                <option value="7d">۷ روز اخیر</option>
                <option value="30d">۳۰ روز اخیر</option>
              </select>
            </div>

            <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 pb-1 border-b border-slate-100">
              <span>عنوان و تاریخ</span>
              <span>مبلغ و وضعیت</span>
            </div>

            {/* Transactions List */}
            <div className="space-y-3.5">
              {[
                {
                  title: "واریز سود فروش روزانه",
                  date: "۲۵ مهر ۱۴۰۳",
                  amount: "+۱,۱۰۰,۰۰۰ تومان",
                  status: "تکمیل شده",
                  isPositive: true,
                  icon: TrendingUp,
                  iconBg: "bg-[#EFF7F4] text-[#1D616A] border border-[#BCD8D1]",
                },
                {
                  title: "اشتراک سالانه خدمات لقمه",
                  date: "۲۵ مهر ۱۴۰۳",
                  amount: "-۶,۴۰۰,۰۰۰ تومان",
                  status: "رد شده",
                  isPositive: false,
                  icon: Wallet,
                  iconBg: "bg-rose-50 text-rose-600",
                },
                {
                  title: "سرمایه‌گذاری تجهیزات نگهداری",
                  date: "۲۱ مهر ۱۴۰۳",
                  amount: "-۹۰۰,۰۰۰ تومان",
                  status: "تکمیل شده",
                  isPositive: false,
                  icon: Building2,
                  iconBg: "bg-slate-100 text-slate-700",
                },
                {
                  title: "مشاوره بازاریابی و بسته‌بندی",
                  date: "۲۱ مهر ۱۴۰۳",
                  amount: "-۲,۱۰۰,۰۰۰ تومان",
                  status: "تکمیل شده",
                  isPositive: false,
                  icon: Sparkles,
                  iconBg: "bg-amber-50 text-amber-700",
                },
                {
                  title: "خرید ظروف زیست‌تخریب‌پذیر",
                  date: "۲۰ مهر ۱۴۰۳",
                  amount: "-۱,۷۰۰,۰۰۰ تومان",
                  status: "تکمیل شده",
                  isPositive: false,
                  icon: Package,
                  iconBg: "bg-teal-50 text-teal-700",
                },
                {
                  title: "خرید بسته سورپرایز الهام رفیعی",
                  date: "۱۹ مهر ۱۴۰۳",
                  amount: "+۶۰۰,۰۰۰ تومان",
                  status: "تکمیل شده",
                  isPositive: true,
                  icon: ShoppingBag,
                  iconBg: "bg-[#EFF7F4] text-[#1D616A] border border-[#BCD8D1]",
                },
                {
                  title: "خرید بسته نان دانیال اکبری",
                  date: "۱۸ مهر ۱۴۰۳",
                  amount: "+۸۰۰,۰۰۰ تومان",
                  status: "تکمیل شده",
                  isPositive: true,
                  icon: ShoppingBag,
                  iconBg: "bg-[#EFF7F4] text-[#1D616A] border border-[#BCD8D1]",
                },
              ].map((tx, idx) => (
                <div key={idx} className="flex items-center justify-between gap-3 text-right">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-8 h-8 rounded-xl ${tx.iconBg} flex items-center justify-center shrink-0`}>
                      <tx.icon size={15} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-800 truncate">{tx.title}</div>
                      <div className="text-[10px] text-slate-400 font-medium">{tx.date}</div>
                    </div>
                  </div>

                  <div className="text-left shrink-0">
                    <div className={`text-xs font-black ${tx.isPositive ? "text-[#1D616A]" : "text-slate-900"}`}>
                      {tx.amount}
                    </div>
                    <span className="text-[9px] font-semibold text-slate-400 block">
                      {tx.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Fast Listing Modal */}
      <FastListingModal
        isOpen={isFastListingOpen}
        onClose={() => setIsFastListingOpen(false)}
        onListingCreated={() => {
          fetchStats();
    fetchBankAccounts();
        }}
      />
    </div>
  );
}
