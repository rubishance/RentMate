# Task: Major UI/UX Upgrade - "The Zen Landlord"

## Strategy
Transform RentMate into a minimalist, alert-centric application focused on solo landlords. The design will prioritize future awareness (timeline) and ease of use (quick entry).

## Visual Direction
- **Style**: Ultra-Minimalist.
- **Palette**: Slate-based neutrals. High contrast for primary actions.
- **Typography**: Outfit (Headings) + Inter (Body).
- **Components**: Floating navigation, shadow-based depth instead of borders, bento-lite dashboard for timeline awareness.

## Phases

### Phase 1: Foundation Refactor
- [ ] Update `index.css` with minimalist design tokens.
- [ ] Refine `AppShell.tsx` (Sidebar/Nav) for a cleaner "floating" look.
- [ ] Improve `TopBar` / Header for less clutter.

### Phase 2: Dashboard "Control Center"
- [ ] Redesign `Dashboard.tsx` to feature a "Next Big Event" hero.
- [ ] Refine the `TimelineWidget` to be the core navigation element.
- [ ] Simplify `SmartActionsWidget`.

### Phase 3: Streamlined Flows
- [ ] Optimize "Add Property" modal for speed (Step-less or minimal-step).
- [ ] Ensure "Add Contract" wizard remains AI-focused but feels lighter.

### Phase 4: Long-term User "Wow"
- [ ] Improve Index Calculation UI in `Contracts.tsx` and `Dashboard.tsx`.
- [ ] Refine "Bills Auto Archive" visibility.

## Implementation Details

### index.css updates
- Remove harsh borders from cards.
- Add subtle shadow presets (`shadow-minimal`, `shadow-premium`).
- Soften radius to `2rem` for a more "organic/app" feel.

### Dashboard Layout
- Hero Section: "Good morning, [Name]. Your next rent collection is in 3 days."
- Action Bar: Large, simple icons for 2 core actions.
- Timeline: Vertical, clean, scannable.

## Verification
- [ ] Run `ux_audit.py`.
- [ ] Check responsive breakpoints (375px, 1024px, 1440px).
- [ ] Ensure Dark Mode remains high-contrast but soft on the eyes.
