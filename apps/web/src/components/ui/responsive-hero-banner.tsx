"use client";
import { RippleButton } from "@/components/magicui/ripple-button";


import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { LoqmeLogo } from './LoqmeLogo';

export interface NavLink {
    label: string;
    href: string;
    isActive?: boolean;
}

export interface Partner {
    name: string;
    category?: string;
    logoUrl?: string;
    href?: string;
}

export interface ResponsiveHeroBannerProps {
    logoUrl?: string;
    backgroundImageUrl?: string;
    navLinks?: NavLink[];
    ctaButtonText?: string;
    ctaButtonHref?: string;
    badgeLabel?: string;
    badgeText?: string;
    title?: string;
    titleLine2?: string;
    description?: string;
    primaryButtonText?: string;
    primaryButtonHref?: string;
    secondaryButtonText?: string;
    secondaryButtonHref?: string;
    partnersTitle?: string;
    partners?: Partner[];
}

const defaultNavLinks: NavLink[] = [
    { label: "صفحه اصلی", href: "/", isActive: true },
    { label: "کاوش محله", href: "#categories" },
    { label: "دسته‌بندی‌ها", href: "#categories" },
    { label: "فلسفه لقمه", href: "#mission" },
    { label: "نحوه کارکرد", href: "#how-it-works" }
];

const defaultPartners: Partner[] = [
    { name: "نانوایی سنتی برکت", category: "سنگک و بربری داغ", href: "#categories" },
    { name: "کافه بیکری لمیز", category: "قهوه و کروسان تازه", href: "#categories" },
    { name: "قنادی و شیرینی الف", category: "شیرینی روز و دسر", href: "#categories" },
    { name: "نان فانتزی سحر", category: "باگت و نان تست", href: "#categories" },
    { name: "کافه رستوران ژیوان", category: "ساندویچ و سالاد", href: "#categories" }
];

export const ResponsiveHeroBanner: React.FC<ResponsiveHeroBannerProps> = ({
    backgroundImageUrl = "/hero-banner.jpg",
    navLinks = defaultNavLinks,
    ctaButtonText = "ورود / ثبت‌نام",
    ctaButtonHref = "/login",
    badgeLabel = "جدید",
    badgeText = "تخفیف‌های ۵۰٪ تا ۷۰٪ روی خوراکی‌های تازه روزانه",
    title = "نجات غذای تازه و باکیفیت",
    titleLine2 = "از دورریز روزانه محله‌تان",
    description = "کشف بسته‌های شگفت‌انگیز و خریدهای لحظه‌ای از کافه‌ها، نانوایی‌ها و قنادی‌های برتر با همان کیفیت عالی و قیمتی باورنکردنی",
    primaryButtonText = "مشاهده بسته‌های امروز",
    primaryButtonHref = "#categories",
    secondaryButtonText = "نحوه کارکرد سامانه",
    secondaryButtonHref = "#how-it-works",
    partnersTitle = "با همکاری برترین کافه‌ها، نانوایی‌ها و قنادی‌های ارومیه و تهران",
    partners = defaultPartners
}) => {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const handleSmoothScroll = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
        if (!href) return;
        const hashIndex = href.indexOf('#');
        if (hashIndex !== -1) {
            const hash = href.substring(hashIndex);
            const targetId = hash.substring(1);
            const elem = document.getElementById(targetId);
            if (elem) {
                e.preventDefault();
                elem.scrollIntoView({ behavior: 'smooth', block: 'start' });
                setMobileMenuOpen(false);
            }
        }
    };

    return (
        <section className="w-full isolate min-h-[90vh] sm:min-h-[92vh] overflow-hidden relative flex flex-col justify-between select-none">
            {/* Background Image: Original woman character holding LOQME bags */}
            <div className="absolute inset-0 z-0">
                <Image
                    src={backgroundImageUrl}
                    alt="Friendly customer holding Loqme bags"
                    fill
                    priority
                    className="object-cover object-center brightness-95 scale-100"
                />
                {/* Natural, balanced overlay: keeps the woman character vibrant while maintaining text contrast */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/50 pointer-events-none" />
                <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/10" />
            </div>

            {/* Top Floating Pill Navigation */}
            <header className="z-20 pt-5 sm:pt-6 px-4 sm:px-6 lg:px-8 w-full max-w-7xl mx-auto">
                <div className="flex items-center justify-between">
                    {/* Brand Logo & Name (Using exact user logo) */}
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2.5 py-1.5 px-3.5 rounded-full bg-white/10 hover:bg-white/15 ring-1 ring-white/15 backdrop-blur-md transition-all shadow-lg group shrink-0"
                    >
                        <div className="w-8 h-8 rounded-full bg-loqme-primary-600 flex items-center justify-center p-1.5 shadow-inner ring-1 ring-emerald-400/40 group-hover:scale-105 transition-transform overflow-hidden shrink-0">
                            <LoqmeLogo variant="icon" size={20} theme="white" />
                        </div>
                        <div className="flex flex-col text-right">
                            <span className="font-black text-base tracking-tight text-white leading-none">لقمه</span>
                            <span className="text-[10px] tracking-wider text-emerald-300 font-sans font-semibold uppercase mt-0.5">Loqme</span>
                        </div>
                    </Link>

                    {/* Desktop Floating Pill Navigation Bar */}
                    <nav className="hidden md:flex items-center gap-2">
                        <div className="flex items-center gap-1.5 rounded-full bg-white/10 px-2 py-1.5 ring-1 ring-white/15 backdrop-blur-md shadow-2xl">
                            {navLinks.map((link, index) => (
                                <a
                                    key={index}
                                    href={link.href}
                                    onClick={(e) => handleSmoothScroll(e, link.href)}
                                    className={`px-3.5 py-1.5 text-xs lg:text-sm font-medium rounded-full transition-all cursor-pointer ${
                                        link.isActive
                                            ? 'text-white bg-white/15 shadow-sm'
                                            : 'text-white/80 hover:text-white hover:bg-white/10'
                                    }`}
                                >
                                    {link.label}
                                </a>
                            ))}
                            <Link
                                href={ctaButtonHref}
                                className="mr-2 inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-1.5 text-xs lg:text-sm font-bold text-loqme-neutral-900 hover:bg-emerald-50 hover:shadow-md transition-all shadow-sm group"
                            >
                                <span>{ctaButtonText}</span>
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="w-3.5 h-3.5 group-hover:-translate-x-0.5 group-hover:-translate-y-0.5 transition-transform rtl:rotate-90"
                                >
                                    <path d="M7 7h10v10" />
                                    <path d="M7 17 17 7" />
                                </svg>
                            </Link>
                        </div>
                    </nav>

                    {/* Mobile Hamburger Toggle Button */}
                    <RippleButton
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/20 backdrop-blur-md active:scale-95 transition-all text-white"
                        aria-expanded={mobileMenuOpen}
                        aria-label="منوی ناوبری"
                    >
                        {mobileMenuOpen ? (
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="4" y1="6" x2="20" y2="6" />
                                <line x1="4" y1="12" x2="20" y2="12" />
                                <line x1="4" y1="18" x2="20" y2="18" />
                            </svg>
                        )}
                    </RippleButton>
                </div>

                {/* Mobile Slide-down Drawer */}
                <AnimatePresence>
                    {mobileMenuOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                            className="md:hidden mt-3 rounded-2xl bg-loqme-neutral-100/95 ring-1 ring-white/20 backdrop-blur-xl p-4 shadow-2xl flex flex-col gap-2"
                        >
                            {navLinks.map((link, index) => (
                                <a
                                    key={index}
                                    href={link.href}
                                    onClick={(e) => handleSmoothScroll(e, link.href)}
                                    className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                                        link.isActive
                                            ? 'bg-white/15 text-white font-bold'
                                            : 'text-white/80 hover:bg-white/10 hover:text-white'
                                    }`}
                                >
                                    {link.label}
                                </a>
                            ))}
                            <div className="pt-2 border-t border-white/10">
                                <Link
                                    href={ctaButtonHref}
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-loqme-neutral-900 hover:bg-emerald-50 shadow-md"
                                >
                                    <span>{ctaButtonText}</span>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 rtl:rotate-90">
                                        <path d="M7 7h10v10" />
                                        <path d="M7 17 17 7" />
                                    </svg>
                                </Link>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </header>

            {/* Central Hero Headline & CTA Area — Positioned so character's face & eyes are 100% visible */}
            <div className="z-10 relative flex-1 flex items-center justify-center pt-28 sm:pt-36 md:pt-40 pb-10 sm:pb-14 px-4 sm:px-6">
                <div className="max-w-4xl mx-auto text-center flex flex-col items-center">
                    {/* Massive Bold Persian Heading */}
                    <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl leading-tight sm:leading-tight md:leading-tight font-black text-white tracking-tight animate-fade-slide-in-1 drop-shadow-md">
                        {title}
                        <br className="hidden sm:block" />
                        <span className="text-loqme-primary-600 drop-shadow-sm block sm:inline sm:mr-2">
                            {titleLine2}
                        </span>
                    </h1>

                    {/* Descriptive Lead Paragraph */}
                    <p className="sm:text-lg animate-fade-slide-in-2 text-sm md:text-base text-teal-50 max-w-2xl mt-4 sm:mt-5 leading-relaxed font-medium drop-shadow-sm">
                        {description}
                    </p>

                    {/* Glassmorphic Pill Badge — Safely placed between description and buttons, AWAY from the character's face/eyes */}
                    <div className="mt-5 mb-2 inline-flex items-center gap-2.5 rounded-full bg-white/20 hover:bg-white/25 px-4 py-1.5 ring-1 ring-white/30 backdrop-blur-md animate-fade-slide-in-3 shadow-lg transition-colors cursor-default text-white">
                        <span className="inline-flex items-center text-xs font-black text-loqme-neutral-900 bg-loqme-primary-600 rounded-full py-0.5 px-2.5 shadow-sm">
                            {badgeLabel}
                        </span>
                        <span className="text-xs sm:text-sm font-bold text-white">
                            {badgeText}
                        </span>
                    </div>

                    {/* Action Pill Buttons with Smooth Scrolling */}
                    <div className="flex flex-col sm:flex-row sm:gap-4 mt-6 sm:mt-7 gap-3 items-center justify-center w-full max-w-md animate-fade-slide-in-4">
                        <a
                            href={primaryButtonHref}
                            onClick={(e) => handleSmoothScroll(e, primaryButtonHref)}
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 bg-loqme-primary-600 hover:bg-loqme-primary-700 border border-teal-400/80 text-sm font-bold text-white rounded-full py-3.5 px-7 shadow-xl hover:scale-[1.03] active:scale-[0.98] transition-all cursor-pointer group"
                        >
                            <span>{primaryButtonText}</span>
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="18"
                                height="18"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="w-4 h-4 group-hover:-translate-x-1 transition-transform rtl:rotate-180"
                            >
                                <path d="M5 12h14" />
                                <path d="m12 5 7 7-7 7" />
                            </svg>
                        </a>
                        <a
                            href={secondaryButtonHref}
                            onClick={(e) => handleSmoothScroll(e, secondaryButtonHref)}
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-white/15 hover:bg-white/25 border border-white/30 px-6 py-3.5 text-sm font-medium text-white transition-all backdrop-blur-md cursor-pointer"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 rtl:rotate-180 text-loqme-primary-600">
                                <path d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z" />
                            </svg>
                            <span>{secondaryButtonText}</span>
                        </a>
                    </div>
                </div>
            </div>

            {/* Bottom Partners Strip */}
            <div className="z-10 relative pb-10 sm:pb-12 px-4 sm:px-6 w-full max-w-6xl mx-auto">
                <p className="animate-fade-slide-in-1 text-xs md:text-sm text-white/80 text-center font-medium tracking-wide">
                    {partnersTitle}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 animate-fade-slide-in-2 text-white/95 mt-5 items-center justify-items-center gap-2.5 sm:gap-3.5">
                    {partners.map((partner, index) => (
                        <a
                            key={index}
                            href={partner.href || "#categories"}
                            onClick={(e) => handleSmoothScroll(e, partner.href || "#categories")}
                            className="w-full flex flex-col items-center justify-center py-2.5 px-3 rounded-2xl bg-white/10 hover:bg-white/20 ring-1 ring-white/20 hover:ring-white/35 backdrop-blur-md transition-all cursor-pointer group"
                        >
                            <span className="text-xs sm:text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">
                                {partner.name}
                            </span>
                            {partner.category && (
                                <span className="text-[10px] text-white/70 group-hover:text-white/90 transition-colors mt-0.5 font-medium">
                                    {partner.category}
                                </span>
                            )}
                        </a>
                    ))}
                </div>

                {/* Smooth Scroll Down Indicator */}
                <div className="mt-8 flex justify-center">
                    <a
                        href="#categories"
                        onClick={(e) => handleSmoothScroll(e, '#categories')}
                        className="inline-flex items-center gap-2 text-xs text-white/70 hover:text-white transition-colors cursor-pointer group bg-black/20 hover:bg-black/40 px-4 py-1.5 rounded-full border border-white/10 backdrop-blur-sm"
                    >
                        <span>مشاهده پیشنهادهای شگفت‌انگیز محله</span>
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="w-3.5 h-3.5 animate-bounce text-loqme-primary-600"
                        >
                            <path d="M12 5v14" />
                            <path d="m19 12-7 7-7-7" />
                        </svg>
                    </a>
                </div>
            </div>

            {/* Seamless Transition to White Page Foundation */}
            <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-loqme-neutral-50 via-[#FAF7F5]/40 to-transparent" />
        </section>
    );
};

export default ResponsiveHeroBanner;
