"use client";

import React from 'react';
import ResponsiveHeroBanner from './responsive-hero-banner';

export const HeroDemo: React.FC = () => {
    return (
        <ResponsiveHeroBanner
            badgeLabel="جدید"
            badgeText="تخفیف‌های ۵۰٪ تا ۷۰٪ روی خوراکی‌های تازه روزانه"
            title="نجات غذای تازه و خوش‌طعم"
            titleLine2="از دورریز روزانه محله‌تان"
            description="کشف بسته‌های شگفت‌انگیز و خریدهای لحظه‌ای از کافه‌ها، نانوایی‌ها و قنادی‌های برتر با همان کیفیت اولیه و قیمتی باورنکردنی"
            primaryButtonText="مشاهده بسته‌های امروز"
            primaryButtonHref="/explore"
            secondaryButtonText="راهنمای سفارش و تحویل"
            secondaryButtonHref="#how-it-works"
            ctaButtonText="ورود / ثبت‌نام"
            ctaButtonHref="/login"
            partnersTitle="با همکاری برترین کافه‌ها، نانوایی‌ها و قنادی‌های ارومیه و تهران"
        />
    );
};

export default HeroDemo;
