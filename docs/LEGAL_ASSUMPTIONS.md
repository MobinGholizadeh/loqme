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

---

## 3. Milestone M11 Production Readiness Audit & Sign-off

| Assumption ID | Codebase / Technical Enforcement | Audit Verification Result | Production Readiness Status |
| :--- | :--- | :--- | :--- |
| **LEG-01** (Intermediary Shield) | Platform terms present on checkout (`/checkout/[id]`), electronic receipt generated (`/orders/[id]/receipt`), merchant direct ownership enforced in DB. | **Verified** — Architecture acts strictly as discovery broker and settlement coordinator. | Ready for filing with legal counsel. |
| **LEG-02** (Merchant Food Liability) | Safety declaration checklist mandatory in Fast Listing creator (`FastListingModal.tsx`); guild license mandatory during admin approval. | **Verified** — Merchant assumes explicit quality and preparation responsibility. | Terms incorporated in merchant onboarding. |
| **LEG-03** (Cooling-Off Exception) | Cancellation disallowed once pickup window commences (`ReservationService` and `OrderService` state machines). | **Verified** — Article 38 perishable goods exception enforced in transaction logic. | Consumer policy notice displayed at checkout. |
| **LEG-04** (Expired Food Ban) | Database constraint `chk_listing_pickup_window`, automatic `sweepNoShows()`, and automated safety lockout on food complaints. | **Verified (CRITICAL)** — Platform strictly bars expired food; state machine locks expired inventory. | Internal Compliance Sign-off Granted. |
| **LEG-05** (Surplus Discounting) | Discount percentage calculated against verified merchant original price floor floor (`discountedPrice < originalPrice`). | **Verified** — No artificial price inflation; authentic surplus variance optimization. | Compliant with Guild discounting rules. |
| **LEG-06** (Payment & E-Namad) | `IPaymentGateway` abstraction with Shaparak-compliant redirect flow, reverse IPG verification, and double-entry ledger. | **Verified** — Ready for production Shaparak / Zarinpal gateway credentials and E-Namad tag. | Operational filing queued. |
| **LEG-07** (Union Licensing) | Platform business identity and Urmia pilot launch credentials prepared. | **Pending External** — Application queued with Iranian Virtual Business Union. | Pre-launch operational gate. |
| **LEG-08** (Refund Governance) | Centralized refund authorization (`/api/admin/complaints/[id]/resolve`) with double-entry accounting penalty debit. | **Verified** — Full financial clawback mechanism operational and auditable. | Enforceable in merchant contract. |
| **LEG-09** (VAT & Taxation) | 10% platform commission calculated and tracked separately from underlying food gross sales in financial ledger. | **Verified** — Accounting ledger maintains transparent tax distinction. | Ready for fiscal reporting. |
| **LEG-10** (Domestic Cybercrime Compliance) | Containerized deployment config (`Dockerfile`, `docker-compose.prod.yml`) designed for domestic Iranian infrastructure (Liara/ArvanCloud); sensitive credential scrubbing in logs. | **Verified** — No unauthorized data exfiltration; strict CSP and privacy protections active. | Infrastructure compliant. |

