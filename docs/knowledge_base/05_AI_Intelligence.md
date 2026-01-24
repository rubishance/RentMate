# RentMate: AI Assistance & Knowledge Base

RentMate integrates advanced Artificial Intelligence to simplify legal and financial complexities for landlords.

## 1. The Support Chatbot (RentMate AI)
- **Voice Supported**: Users can speak to the bot in Hebrew (`he-IL`) using integrated speech recognition.
- **Context Aware**: The bot knows about the user's specific context (contracts, payments) if authenticated.
- **Multilingual**: Intelligent language detection (Hebrew/English) ensures the user is answered in their preferred language.
- **Tools (Functions)**: The bot can perform actions like `search_contracts` to find data without the user navigating the UI.

## 2. AI Contract Analysis & Verification
- **Optical Character Recognition (OCR)**: Analyzes uploaded rental agreements to extract key data.
- **Extraction & Verification**: Automatically identifies Start/End Dates, Monthly Rent, and Index rules. To mitigate **extraction errors**, the system requires users to review and confirm all AI-extracted data before it is saved to the ledger.
- **Document Integration**: The system accounts for external costs such as utility bills (gas, electricity, water, and Arnona) and maintenance fees, ensuring they are integrated into the property's financial overview.

## 3. Legal Knowledge Base
The app includes a library of professionally written articles covering Israeli rental law:
- **CPI Linkage Guide**: Explaining how the Madad works.
- **Tax Obligations**: Guide to the 10% tax route vs. exempt sum.
- **Security Deposits**: Types of guarantees in Israel (Bank Guarantee vs. Promissory Note).
- **Eviction Process**: Legal steps for non-paying tenants under Israeli law.

## 4. Technology Stack
- **Model**: OpenAI GPT-4o-mini / Gemini Flash (configurable).
- **Architecture**: Supabase Edge Functions for secure, server-side processing.
- **Security**: Usage limits are enforced per user to prevent abuse and manage costs.
