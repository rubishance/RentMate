---
name: rentmate-brand-design
description: Strict custom design rules, premium component animations, and aesthetic requirements specific to RentMate.
---

# RentMate Brand Design Rules

This skill outlines the strict styling, interaction, and accessibility rules unique to RentMate. It overrides general design advice (like generic Tailwind examples) to ensure absolute consistency across the entire app.

## 1. Brand Identity & Strict Color Mapping
RentMate uses a curated dual-theme setup via CSS variables mapped in `index.css`. **Do not use standard Tailwind generic colors (e.g., `bg-blue-500` or `text-gray-900`)**. Always map directly to the defined semantic variables to guarantee flawless Light/Dark transitions.

*   **Backgrounds:** Use `--background` (Crisp Off-White in Light, Deep Navy in Dark).
*   **Cards & Panels:** Use `--card` (Pure White in Light, Darker Navy in Dark) to create subtle, elegant elevation above the background layer.
*   **Primary Actions:** Use `--primary` (Deep Navy in Light, Bright High-Contrast Blue in Dark) for primary calls-to-action (CTAs) and active states. The dark mode primary must pop against the deep navy background (e.g., `hsl(215 100% 70%)`).
*   **Secondary/Success Actions:** Use `--secondary` (Sage Green). This remains consistent across both modes.
*   **Text/Foregrounds:** Use `--foreground` for primary reading text, `--muted-foreground` for secondary/fainter copy.
*   **The "Purple Ban":** Strict exclusion of any violet or purple colors anywhere in the UI.

## 2. Typography & Readability
RentMate serves a diverse set of users; readability is paramount.
*   **Base Readability Rule:** Default body copy must easily accommodate mature users. The absolute minimum is `text-sm`, but `text-base` is preferred for standard paragraph copy.
*   **Avoid Thin Weights:** Do not use ultra-thin or overly condensed font styles. High-contrast typography is mandatory to assist with vision impairments.
*   **High-Contrast Secondary Text:** When using muted colors (e.g., `--muted-foreground`), ensure the contrast ratio comfortably accommodates mature users (40+). For dark mode, muted text must be significantly legible and bright (e.g., Lightness > 80%, such as `hsl(215 20% 82%)`).
*   **Bilingual Fonts:**
    *   *English (`dir="ltr"`):* `font-english` or `font-sans` (Inter/IBM Plex Sans).
    *   *Hebrew (`dir="rtl"`):* `font-hebrew` (Assistant) or `font-heading` (Outfit/Assistant combinations).

## 3. Premium Component Interactions
RentMate must feel dynamic and expensive. Avoid static 'flat' components.
*   **Button Hover States:** All primary, secondary, and destructive solid buttons MUST include the "Aurora Fluid Fill" active interaction state. This is achieved natively via the global `Button.tsx` component. The effect characteristics are:
    *   **Solid Base:** Renders as a standard solid button (e.g., `bg-primary`) at rest.
    *   **Ambient Conic Gradient:** A very slow spinning background gradient (`animate-[spin_20s_linear_infinite]`) containing localized brand colors (e.g., mixing Primary Navy and Secondary Sage Green).
    *   **Frosted Glass Reveal:** A heavy blur layer (`backdrop-blur-3xl`) that turns semi-transparent on hover (e.g., `group-hover:bg-primary/50`), revealing the moving fluid fill beneath the solid surface.
    *   **Magnetic Scale & Shadow:** Physical press/lift expansion (`hover:scale-[1.02]`, `active:scale-[0.98]`) alongside a massive soft colored shadow matching the button variant (`hover:shadow-[0_0_35px_-10px_hsl(var(--primary))]`).
*   **Consistent Animations:** All UI entrances (like cards loading in, modals appearing) must use standardized Framer Motion spring physics to maintain a unified "bounce and settle" premium feel:
    *   `transition={{ duration: 0.6, type: "spring", bounce: 0.4 }}`

## 4. General Aesthetic Rules
*   **Mobile-First Focus:** RentMate is primarily a mobile application experience. All designs, layouts, and interactions MUST be designed for mobile screens first (`sm` and below in Tailwind), ensuring appropriately sized touch targets and full-width optimized user flows, before being progressively enhanced for larger screens.
*   **The "Template Ban":** Do not rely on standard, generic web layout templates. RentMate pages should feature custom, thoughtful layouts.
*   **Glassmorphism:** Use touches of blurred backgrounds (e.g. `bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl`) selectively for sticky headers or prominent overlay cards.

## 5. Stitch-Optimized AI Iteration (Google Stitch Protocol)
When iterating on RentMate designs or crafting prompts for new components, automatically apply these Google Stitch principles:
*   **RentMate Vibe Adjectives:** Always ground design generation with RentMate's core vibes: *"Premium, High-Contrast, Professional yet Approachable"*. This ensures any AI-assisted layout output matches the core identity.
*   **Incremental Changes (No Layout Jumps):** Never mix structural layout overhauls with micro-UI surface tweaks in a single step. Focus iterations tightly (e.g., update *only* the spacing, then *only* the button shadow).
*   **Precise Targeting:** Reference specific semantic elements clearly (e.g., "the primary call-to-action button in the property modal") to avoid collateral damage during generative updates.
*   **Imagery Control:** Any structural imagery or assets developed during the design phase must align with the RentMate aesthetic: *"Clean, minimalist, real estate focused, leveraging neutral backgrounds with the Sage Green/Navy brand accents."*
