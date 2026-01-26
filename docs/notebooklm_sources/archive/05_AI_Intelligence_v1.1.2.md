# RentMate: AI Intelligence & Extraction (v1.1.2)

RentMate integrates advanced Artificial Intelligence to simplify the complexities of property management, legal jargon, and financial record-keeping.

## 1. The Support Chatbot (RentMate AI)
- **Multilingual Intelligence**: Automatically detects the user's language (**Hebrew** or **English**) and responds accordingly.
- **Context Awareness**: If a user is logged in, the AI understands their property context and can answer questions about their specific contracts or payments.
- **Voice Capabilities**: Supports **Hebrew Speech-to-Text (`he-IL`)**, allowing landlords to speak their queries on the go.
- **Actionable Tools**: The bot can execute functions like `search_contracts` to fetch data during a conversation without the user needing to leave the chat.

## 2. AI Contract Analysis (Extraction)
- **Vision-based Analysis**: Scans uploaded rental contracts (images/PDFs) using world-class OCR technology.
- **Data Points**: Extracts Tenant Names, ID numbers, Rent Amounts, and **Index Linkage Rules**.
- **Human-in-the-loop**: To ensure 100% accuracy, the system follows a "Review & Confirm" protocol. Users must verify the extracted fields before they are permanent.

## 3. Support & Knowledge Strategy
The AI follows a strict **"Safe Support"** protocol:
- It provides operational and technical guidance (e.g., "How to add a payment").
- It provides factual definitions (jargon).
- **CRITICAL**: If asked for legal or financial strategy (e.g., "Should I sue my tenant?"), the AI is instructed to politely refuse and recommend professional consultation.

---

## 4. Technology Backend
- **Core Models**: Powered by OpenAI GPT-4o-mini and Google Gemini Flash.
- **Security**: Supabase Edge Functions manage all AI requests server-side, ensuring user data never leaks into training sets.
- **Efficiency**: Image-to-JSON extraction allows for manual error mitigation while saving hours of data entry.
