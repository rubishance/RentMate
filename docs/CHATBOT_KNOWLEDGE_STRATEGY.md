# RentMate Chatbot Knowledge Strategy
> **Goal:** Empower users with immediate answers while strictly avoiding legal or financial advisory liability.

## 🛡️ The "Zone of Safety" Protocol
To ensure the chatbot never crosses the line into advice, all content must fall into these three categories:
1.  **Technical Support:** How to use the app.
2.  **Factual Definitions:** "What is X?", not "Should I use X?".
3.  **Process Logistics:** Checklists and standard procedures (non-legal).

---

## 📚 Recommended Data Sources

### 1. The RentMate "User Manual" (Technical)
*The core source. Answers "How do I...?" questions.*
*   **Source Data:**
    *   Step-by-step guides for every feature (Add Property, Create Contract, Scan Bill).
    *   Troubleshooting flows (Login issues, Image upload failed).
    *   Explanation of all form fields (e.g., "What does 'Grace Period' mean in the settings?").
*   **User Value:** Immediate tech support without waiting for a human.

### 2. The "Landlord's Dictionary" (Educational)
*Defines terms without recommending them.*
*   **Source Data:**
    *   **Glossary of Hebrew Rental Terms:**
        *   *Madad* (CPI)
        *   *Arev* (Guarantor) vs. *Arev Tomech*
        *   *Shtar Chov* (Promissory Note)
    *   **Tax Track Definitions:** Plain summary of the 3 tracks (10%, Ftor, Mas Shuli) citing the Tax Authority, **without** recommendation.
*   **User Value:** Clarifies confusing jargon instantly.

### 3. Logistical Checklists (Operational)
*Standard operating procedures that are practical, not legal.*
*   **Source Data:**
    *   **Apartment Handover Protocol:** List of things to check (Water meter, Paint condition, Keys count).
    *   **Winter Maintenance Checklist:** (Check gutters, boiler service).
    *   **Utility Transfer Guide:** How to technically switch names on bills (Municipality, Electrical Corp links).
*   **User Value:** Helps landlords stay organized and professional.

### 4. Communication Templates (Soft Skills)
*Drafts for human interactions.*
*   **Source Data:**
    *   "Polite reminder for late rent."
    *   "Notification of upcoming maintenance visit."
    *   "Goodbye message and deposit return update."
*   **User Value:** Saves time and reduces friction with tenants.

---

## ⛔ "Red Zone" Data (DO NOT INCLUDE)
*   **Legal Interpretations:** "Is this contract valid?", "Can I kick him out?".
*   **Financial Strategy:** "Should I raise the rent?", "Which tax track saves me more money?".
*   **Personal Data:** Specific user contracts or tenant private info (unless part of a secured, separate flow).

## 🚀 Implementation Plan
1.  **Export:** Create PDF/Markdown versions of the above categories.
2.  **Upload:** Add to the NotebookLM notebook.
3.  **Prompt Engineering:** Add a system instruction: *"You are an operational assistant. If asked for legal/financial advice, explicitly state you cannot provide it and refer the user to a professional."*
