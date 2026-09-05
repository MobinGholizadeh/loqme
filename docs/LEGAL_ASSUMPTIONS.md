# Legal & Regulatory Assumptions Registry — Loqme (لقمه)

> **CRITICAL MANDATE**: Do NOT turn uncertainty into fact.  
> The following table tracks operational and legal assumptions governing the Loqme platform within the Islamic Republic of Iran.  
> Every entry remains tagged as `UNVERIFIED` until formally reviewed and signed off by qualified Iranian legal counsel and guild representatives.

---

## 1. Legal Assumptions Registry

| ID | Domain / Assumption | Rationale | Risk Level | Current Status | Required Validation | Owner |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **LEG-01** | **Marketplace Intermediary Relationship**<br>Loqme acts as an electronic intermediary/broker (واسطه الکترونیکی) facilitating transactions, not as the physical food manufacturer. | Electronic Commerce Law of Iran (قانون تجارت الکترونیک). Loqme provides software, payment processing, and listing discovery. | **High** | `UNVERIFIED` | Formal legal opinion confirming platform liability shields under Article 37 & 38. | Legal Counsel |
| **LEG-02** | **Merchant Food Safety Liability**<br>The merchant bears sole legal liability for food freshness, hygiene, ingredient compliance, and preparation standards. | Guild regulations (قانون نظام صنفی) place product quality obligations on the licensed storefront selling the goods. | **High** | `UNVERIFIED` | Merchant Terms of Service (قرارداد همکاری) clause review by commercial attorney. | Legal Counsel |
| **LEG-03** | **Customer Cooling-Off Exception**<br>Surprise Bags and perishable food orders are exempt from standard 7-day e-commerce return rights once pickup window commences. | Article 38 of the Iranian E-Commerce Law explicitly excludes perishable goods (کالاهای فاسدشدنی) from the 7-day withdrawal period. | **Medium** | `UNVERIFIED` | Consumer Protection Organization (سازمان حمایت مصرف‌کنندگان) alignment check. | Legal Counsel |
| **LEG-04** | **Strict Ban on Expired Products**<br>Selling goods past manufacturer expiration date (تاریخ انقضا) is a criminal offense and completely barred. | Ministry of Health (وزارت بهداشت) and Penal Code regulations strictly penalize expired food distribution. | **Critical** | `VALIDATED (INTERNAL)` | Review of Ministry of Health executive bylaws regarding near-date vs expired distinction. | Safety Lead |
| **LEG-05** | **Legality of Near-Date / Surplus Discounting**<br>Discounting safe, unexpired, near-date packaged goods and freshly baked surplus is legally permissible. | Guild laws allow promotional sales and clearance discounting (حراج و تخفیف صنفی) provided goods are unexpired. | **Medium** | `UNVERIFIED` | Confirmation from Chamber of Guilds (اتاق اصناف ایران). | Operations Lead |
| **LEG-06** | **Online Payment Gateway & E-Namad**<br>Loqme can operate payment gateway routing under marketplace E-Namad (نماد اعتماد الکترونیکی) certification. | Shaparak / Central Bank rules govern payment service providers (PSP) and marketplace sub-accounts. | **High** | `UNVERIFIED` | E-Namad application for marketplace business model and guild approval. | FinOps Lead |
| **LEG-07** | **Business & Guild Licensing (اتحادیه)**<br>Operating a hyper-local food surplus marketplace requires a Virtual Business Union license (اتحادیه کشوری کسب‌وکارهای مجازی). | Ministry of Industry, Mine and Trade (صمت) regulations on online retail intermediaries. | **High** | `UNVERIFIED` | Application submission to the Virtual Business Union. | Operations Lead |
| **LEG-08** | **Refund & Cancellation Governance**<br>If a merchant is closed or items are demonstrably spoiled at pickup, Loqme can unilaterally refund the customer and debit merchant balance. | Platform dispute resolution terms incorporated into merchant partnership agreement. | **Medium** | `UNVERIFIED` | Contractual enforceability under Iranian Civil Code contract law (ماده ۱۰ قانون مدنی). | Legal Counsel |
| **LEG-09** | **Taxation & VAT (مالیات بر ارزش افزوده)**<br>Platform commission (10%) is subject to standard VAT, while underlying basic food items follow statutory food tax exemptions. | Iranian VAT Act (قانون مالیات بر ارزش افزوده مصوب ۱۴۰۰). Basic agricultural/food products are exempt; platform service fee is taxable. | **High** | `UNVERIFIED` | Official tax consultant ruling from Iranian National Tax Administration (سازمان امور مالیاتی). | FinOps Lead |
| **LEG-10** | **Customer Data Protection & Cybercrime Law**<br>Storage of customer phone numbers, addresses, and order history complies with Iranian Cybercrime Law (قانون جرایم رایانه‌ای). | Platform must protect user personal privacy and store data on domestic infrastructure. | **Medium** | `UNVERIFIED` | Privacy Policy and domestic hosting compliance audit (مرکز ملی فضای مجازی). | Security Lead |

---

## 2. Policy for Updating Legal Assumptions

1. **Never Assume Clearance Without Proof**: An item status changes from `UNVERIFIED` to `VALIDATED` only when supported by written legal opinion, official license certificate, or signed guild documentation.
2. **Review Cadence**: The Legal Assumptions Registry must be audited at the completion of each major development milestone (M06, M08, and M11).
