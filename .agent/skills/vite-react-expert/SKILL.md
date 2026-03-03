---
name: vite-react-expert
description: Vite environment variable rules, React Router DOM v7 data loading, and Vite build optimization for RentMate's SPA.
---

# Vite & React SPA Expert

RentMate is a React Single Page Application (SPA) powered by Vite. **Do NOT apply generic Next.js App Router rules here.**

## 1. Environment Variables
*   **Prefix Requirement:** Must strictly use the `VITE_` prefix to be securely accessible in the client bundle. (e.g., `VITE_SUPABASE_URL`).
*   **Access Pattern:** Access via `import.meta.env.VITE_VARIABLE_NAME`. Never attempt to use `process.env`.
*   **Typing:** Standardize typing for `ImportMetaEnv` within a `vite-env.d.ts` file to ensure TS strictness on variables.

## 2. React Router v7
*   Utilize `react-router-dom` exclusively for routing.
*   Implement `ErrorBoundary` components around critical route layers (like dashboards or complex contract views) so UI segments fail gracefully without crashing the whole application.
*   Leverage route loaders where possible, or combine with data fetching libraries appropriately.

## 3. Build & Optimization
*   **Code Splitting:** RentMate uses heavy third-party assets (`pdfjs-dist`, `framer-motion`, `recharts`, `react-day-picker`). Split these into explicit `manualChunks` in `vite.config.ts` to keep the primary JS bundle sizes highly optimized.
*   Ensure asset optimizations (image loading, lazy imports for complex settings pages) to maintain rapid Initial Load Performance metric goals.
