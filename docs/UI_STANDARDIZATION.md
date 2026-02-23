# RentMate UI Standardization Standards

## 1. Typography 🔤
- **Hebrew Font**: `Assistant` - Modern, clean, and optimized for RTL readability.
- **English Font**: `IBM Plex Sans` - Balanced, professional, and conveys financial trust.
- **Implementation**: Languages will use their respective font-family via CSS `:lang()` or conditional classes.
- **Sizes**:
    - Page Title: `text-3xl font-bold`
    - Section Header: `text-xl font-semibold`
    - Body: `text-base`
    - Small/Muted: `text-sm`

## 2. Buttons & Actions 🔘
- **Primary Action (Saving, Submitting)**:
    - Color: `bg-primary` (Deep Teal)
    - Size: Standardize on `h-11 px-6` for mobile friendliness.
- **Secondary/Utility Action (Adding, Searching)**:
    - Color: `bg-secondary` (Harvest Gold)
- **Floating Action Buttons (FAB)**:
    - Location: Bottom-Right corner.
    - Style: Circle button, `shadow-lg`, `bg-secondary`.
    - Icon Size: `w-6 h-6`.

## 3. Wizards & Modals 🪄
- **Interaction**: All multi-step processes (Add Property, Add Contract) must be **Modal-based**.
- **Width**: Standardize on `max-w-xl` for consistency on mobile/tablet.
- **Navigation**: Progress bar at the top, "Back" and "Next/Save" buttons at the bottom.

## 4. Icons 🎭
- **Size**: All standalone action icons (like "+") should be `w-6 h-6`.
- **Stroke Width**: `stroke-2` for better visibility on small screens.

## 5. Spacing & Containers 📐
- **Card Padding**: Standardize on `p-6` for desktop/tablet and `p-4` for mobile.
- **Corner Radius**: All cards and buttons must use `rounded-xl` (or `rounded-2xl` for large dashboard widgets).
- **Section Spacing**: Maintain `space-y-6` between major UI sections.

## 6. Visual Styles ✨
- **Cards**: Use `bg-card` for most content. Use `glass-premium` only for overlay elements or high-priority dashboard widgets.
- **Form Labels**: Standardize on `text-sm font-medium text-foreground/80`.
## 7. Calendars & Date Pickers 📅
- **Component**: Always use the standardized `DatePicker` component (`src/components/ui/DatePicker.tsx`).
- **Interaction**: Date selection should happen within a modal or centralized popover to maintain mobile accessibility.
- **Visual Style**:
    - **Header**: "Select Date" with a close (X) button.
    - **Selection**: Rounded corners (`rounded-xl`) and a clear highlight for the selected date (`bg-primary`).
    - **Navigation**: Use dropdowns for Year/Month navigation for better accessibility in long-range selections.
- **Localization**: Default to Israeli format (`DD/MM/YYYY`) and support Hebrew months/days.
