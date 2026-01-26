# RentMate Project Overview - v1.2.0

## System Architecture
RentMate is a full-stack property management platform designed for the Israeli market.

### Core Stack
- **Frontend**: React (Vite) + Tailwind CSS + Framer Motion.
- **Backend**: Supabase (PostgreSQL, Realtime, Storage).
- **Automation**: Deno Edge Functions (Supabase Functions).
- **Communication**: Net HTTP extensions for email/notifications.

### Data Model
- **Properties**: The central unit, containing address, type, and ownership.
- **Contracts**: Linkage logic (CPI), periodicity, and tenant relationships.
- **Documents**: Bucket-based storage (`secure_documents`) with category metadata.
- **Index Data**: Time-series storage of CBS economic indices.

### Unique Selling Points
1. **AI Contract Scanner**: OCR + NLP extraction of legal terms into database records.
2. **Dynamic Linkage Engine**: Native support for Israeli CPI calculations.
3. **Conversational Manager**: A chatbot that doesn't just answer questions but performs actions (logging expenses, filing receipts).
4. **Multilingual Shell**: Dynamic RTL/LTR switching for Hebrew and English users.
