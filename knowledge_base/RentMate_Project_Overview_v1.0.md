# RentMate Project Overview - v1.0

## Technology Stack
- **Frontend**: React (Vite), Tailwind CSS, Framer Motion, Lucide Icons.
- **Backend/Database**: Supabase (PostgreSQL, Auth, Storage, Edge Functions).
- **AI Engine**: OpenAI (GPT-4o-mini) via Supabase Edge Functions.
- **PDF Generation**: jsPDF, AutoTable.
- **State Management**: React Hooks (useState, useEffect, useContext).

## Core Modules
1. **Property Management**: Address, media (photos/videos), utility bill tracking.
2. **Contract Management**: Rent linkage (CPI), automated payment schedules, AI contract scanning.
3. **Financial Dashboard**: Income vs Expense analysis, Tax track selection (10% vs Marginal).
4. **Document Hub**: Organized folders for warranties, insurance, and legal documents.
5. **Short Links & Redirects**: Quick access links for sharing contract details or payment requests.

## Implementation Principles
- **Clean Code**: Concise, functional-first approach.
- **Privacy First**: Explicit user consent (`ai_data_consent`) required for AI features.
- **Localization**: Full support for Hebrew (RTL) and English (LTR).
