# Design System Specification: Estate Trust (Unified)

## 1. Overview & Creative North Star: "The Architectural Ledger"
This design system is built to transform real estate management into a professional, reliable, and highly accessible digital experience. It emphasizes stability, order, and absolute clarity, ensuring that property owners can manage their assets with confidence.

## 2. Color Palette (High Contrast & Professional)
| Category | Hex Code | Usage | 
| :--- | :--- | :--- | 
| Primary (Deep Navy) | #0D47A1 | Primary actions, headers, active states, and brand emphasis. | 
| Secondary (Soft Blue) | #E3F2FD | Backgrounds for cards, light emphasis, and subtle UI separators. | 
| Background | #F5F7FA | Main application background for clean separation. | 
| Surface | #FFFFFF | Card backgrounds, modals, and container surfaces. | 
| Text - Primary | #1A237E | Headings, labels, and critical information (High Contrast). | 
| Text - Body | #37474F | Standard body text and descriptive content. | 
| Border | #CFD8DC | Subtle borders for inputs, cards, and dividers. | 
| Success (Paid) | #2E7D32 | Positive status indicators, successful payments, "Paid" badges. | 
| Alert (Pending/Action) | #C62828 | Critical alerts, overdue payments, required actions. | 
| Warning (Upcoming) | #F9A825 | Pending tasks, upcoming deadlines. |

## 3. Typography (Accessibility & Hebrew Optimized)
Primary Hebrew Fonts: Assistant, Heebo, or Rubik. Fallback Fonts: Plus Jakarta Sans, Inter, system-ui.

| Level | Size (px) | Weight | Line Height | Usage | 
| :--- | :--- | :--- | :--- | :--- | 
| H1 (Display) | 32px | 700 (Bold) | 1.2 | Main page titles. | 
| H2 (Section) | 24px | 600 (Semi-Bold) | 1.3 | Card headers, major section titles. | 
| H3 (Subhead) | 20px | 600 (Semi-Bold) | 1.4 | Subsection headers within cards. | 
| Body (Large) | 18px | 400 (Regular) | 1.6 | Primary information, data points. | 
| Body (Base) | 16px | 400 (Regular) | 1.5 | General descriptions, secondary text (MINIMUM). | 
| Label / Caption | 16px | 500 (Medium) | 1.4 | Field labels, graph axes, small metadata. |

Note: All text colors must maintain a contrast ratio of at least 4.5:1 (7:1 preferred for titles) against their backgrounds. Minimum font size is 16px for all readable text.

## 4. Spacing & Layout (Gaps & Margins)
- **Grid**: 8px Baseline Grid. All spacing should be multiples of 4 or 8.
- **Page Side Gaps**: 20px (horizontal) on mobile devices to prevent content from touching screen edges.
- **Card Padding**: 24px internal padding for comfortable data breathing room.
- **Vertical Element Gap**: 16px to 24px vertical spacing between cards/sections.
- **Inline Gaps**: 12px to 16px between elements within a component (e.g., icon and text).

## 5. Components & Effects
**Elevation & Depth**
- Low Elevation (Cards): `box-shadow: 0px 4px 12px rgba(13, 71, 161, 0.08);`
- High Elevation (Modals): `box-shadow: 0px 8px 24px rgba(0, 0, 0, 0.15);`

**Border Radius**
- Large (Cards/Modals): `border-radius: 16px;`
- Medium (Buttons/Inputs): `border-radius: 12px;`
- Small (Badges/Tags): `border-radius: 8px;`

**Buttons**
- Primary State: Background `#0D47A1`, Text `#FFFFFF`, Bold.
- Hover/Active: Scale 0.98, Slight darken of background.
- Minimum Hit Area: 48px x 48px for touch accessibility.

**Input Fields**
- Style: Background `#FFFFFF`, Border 1px solid `#CFD8DC`, Focus Border 2px solid `#0D47A1`.
- Label: 16px Semi-Bold, placed directly above the field.

## 6. Support Assistant Icon (Chatbot)
- Placement: Fixed in the Top Header (trailing side).
- Styling:
  - Container: Circular or Rounded Square (8px) background.
  - Background Color: `#E3F2FD` (Secondary Light Blue) or White.
  - Icon Color: `#0D47A1` (Primary Navy).
  - Interaction: Subtle pulse or highlight on hover/tap.
  - Size: 40px x 40px icon button container.

## 7. Data Visualization (Graphs)
- Line/Area: Bold Navy line (`#0D47A1`) with a soft gradient fill (`#0D47A1` at 10% opacity).
- Axes Labels: Minimum 16px font size, High Contrast Navy/Slate color.
- Grid Lines: Light gray (`#ECEFF1`), 1px width.
- Data Points: High contrast markers with tooltips showing exact values.
