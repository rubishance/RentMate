---
name: framer-motion-patterns
description: Standardized Framer Motion scroll animations, premium UI interactions, and accessibility rules guidelines.
---

# Framer Motion Style Guidelines

RentMate differentiates itself with a premium, slick, and dynamic interface. `framer-motion` handles UI choreography.

## 1. Premium & Performant Animations
*   **Performance Rule:** Only animate layout properties hardware-accelerated by the browser: `transform` (`scale`, `x`, `y`) and `opacity`. Directly animating `height`, `width`, `top`, or `left` causes expensive layout thrashing and should be avoided.
*   **Scroll Interactions:** Employ consistent slide-in-from-the-side and fade-up components as users scroll (often used on the Coming Soon and marketing pages) utilizing `whileInView` and `viewport`.

## 2. Configuration & Consistency
*   **Springs Over Tweens:** Use spring physics transitions for a premium, natural sensation instead of linear easing: `transition={{ type: 'spring', stiffness: 100, damping: 20 }}`.
*   Standardize `variants` objects for layout grids and lists (leveraging `staggerChildren` to elegantly load rows/cards).

## 3. Accessibility & Responsiveness
*   **Reduced Motion Context:** Always respect client OS preferences. Hook into `useReducedMotion()`. When `true`, fallback natively to simple instantaneous layouts or raw opacity fades.
*   **Device Awareness:** Complex, heavy-node animations should be potentially simplified on mobile devices to save battery life and maintain flawless 60fps scrolling. Use media matchers or customized viewport logic inside Framer motion constraints.
