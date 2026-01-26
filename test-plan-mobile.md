# 📱 Mobile Test Plan: RentMate "Zero-Touch" Release

> **Goal:** Verify that 100% of the application's buttons, features, and the new Autopilot CRM work perfectly on mobile devices.

---

## 🏗️ 1. Test Environment
- **Devices:** iPhone 14 (390x844), Pixel 7 (412x915).
- **Browsers:** Mobile Safari, Chrome Mobile.
- **Tools:** Playwright (Emulation), Manual UI Audit.

---

## 🧪 2. Phase 1: Authentication & Onboarding
| Feature | Action | Verification |
|---------|--------|--------------|
| **Signup** | Register new user | Keyboard doesn't hide "Create Account" button. |
| **Login** | Sign in | "Forgot Password" link is touch-friendly (min 44px). |
| **Welcome** | Landing Page | Hero CTA is centered and scaled for mobile. |

---

## 🏠 3. Phase 2: Property & Contract Management
| Feature | Action | Verification |
|---------|--------|--------------|
| **Dashboard** | View Glass Cards | Horizontal scroll/stacking works; no text overflow. |
| **Add Property** | Fill form | Form is a single vertical column; no horizontal scroll. |
| **AI Scanner** | Upload contract | Photo upload works on mobile/camera access. |
| **Contract View** | Detailed breakdown | Notice periods & extension options visible on small screen. |

---

## 💰 4. Phase 3: Financials & Payments
| Feature | Action | Verification |
|---------|--------|--------------|
| **Payments List** | Filter/Sort | Filter drawer opens smoothly; "Mark as Paid" button accessible. |
| **Calculator** | Standard/Recon | Input fields handle number keyboard; results are legible. |
| **Invoices** | View/Download | PDF view opens in mobile browser without styling break. |

---

## 🤖 5. Phase 4: Autopilot & CRM (The New System)
| Feature | Action | Verification |
|---------|--------|--------------|
| **Settings** | Toggle Autopilot | Switch is large enough for thumb; status updates instantly. |
| **Notification Preference** | Channel Toggles | SMS/Email checkboxes are spaced correctly. |
| **Action Inbox** | Approve AI Draft | Textarea is editable on mobile without layout break. |
| **Deep Logs** | Search/Filter | Table transforms into vertical cards or horizontal scroll. |

---

## 🛠️ 6. Phase 5: Admin Controls
| Feature | Action | Verification |
|---------|--------|--------------|
| **User Mgmt** | View Details | Admin can view user health/stats without horizontal scroll. |
| **Analytics** | View Charts | Recharts icons & tooltips respond to "Tap" instead of "Hover". |
| **System Settings** | Update Values | Save button is sticky or always within reach. |

---

## 🚩 7. Critical Mobile UX Audit
- [ ] **Touch Targets:** No button is smaller than 44x44px.
- [ ] **Navigation:** Bottom bar (Mobile) vs Sidebar (Desktop).
- [ ] **Readability:** Font size minimum 16px to prevent iOS auto-zoom on focus.
- [ ] **Performance:** Pages load in < 2 seconds on 4G emulation.
- [ ] **Safe Areas:** Notch/Home Indicator doesn't overlap UI.

---

## 🚀 8. Execution Strategy
1. **Automated Scan:** Run `playwright_runner.py` with `--mobile` flag on all routes.
2. **Visual Diff:** Check responsive breakpoints in DevTools.
3. **Manual Trap:** Real-device testing for haptic feedback and gestures.
