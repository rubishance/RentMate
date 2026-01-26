# 📝 Strategic Plan: Unified Customer Service CRM

This document outlines the implementation plan for a centralized **Customer Service CRM** in RentMate. 
**Goal:** A single interface for admins to view and manage all interactions with a user (Bot, Human, Email, Phone).

---

## 🏗️ 1. Architecture & Data Strategy

### Current State:
- **Bot Chats:** Stored in `ai_conversations`.
- **Support Tickets:** Stored in `support_tickets` and `ticket_comments`.
- **Notes/Calls/Emails:** Logged manually in `crm_interactions`.

### Proposed Unified Feed:
We will create a **Unified Service** that pulls from these sources. We won't move data, but rather aggregate it via a database View or a complex Select in the frontend service.

#### 🛠️ Database Updates (PostgreSQL):
```sql
-- 1. Expand Interaction Types
-- Already exists: note, call, email, support_ticket, chat (bot)
-- Add: human_chat

-- 2. New Tables for Real-time Human Support
CREATE TABLE human_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    admin_id UUID REFERENCES auth.users(id), -- Assigned admin
    status TEXT DEFAULT 'active', -- active, closed
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE human_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES human_conversations(id),
    sender_id UUID REFERENCES auth.users(id),
    sender_role TEXT, -- 'user' or 'admin'
    content TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 📱 2. UI/UX: The "Client Hub" Command Center

The existing `/admin/client/:id` page (ClientProfile.tsx) will be transformed into the **Contextual Command Center**.

### A. Unified Timeline (The Feed)
- **Aggregated View:** A reverse-chronological list combining:
    - 🤖 **Bot Transcripts:** Previews of AI conversations.
    - 👥 **Human Chats:** Real-time message exchange logs.
    - 📞 **Phone Logs:** Manual notes from calls.
    - ✉️ **Emails:** Logs of system-sent notifications or manual email logs.
    - 🎫 **Tickets:** Current status and history of escalated issues.
- **Filtering:** Tabbed or checkbox-based filters (e.g., "See only calls", "See only AI messages").

### B. Human-in-the-Loop Chat
- A dedicated "Live Chat" panel on the right side of the Client Hub.
- If a user clicks "Speak to Human" in the bot interface, the admin receives a browser notification.
- Admin can instantly see the **Bot Context** (what the AI was discussing) and take over.

### C. Enhanced Logging Forms
- **Call Logger:** One-click "Log Call" button with templates for common results (Busy, Left message, Detailed notes).
- **Email Logger:** Ability to "Mark as Sent" for offline emails or potentially integrate with an email API.

---

## 🚀 3. Implementation Phases

### Phase 1: Unified Feed (Read-Only)
- Update `crm.service.ts` to aggregate `ai_conversations` and `crm_interactions`.
- Finalize the layout of the "Timeline" in `ClientProfile.tsx`.
- *Status: Ready to implement UI.*

### Phase 2: Manual Communication Suite
- Add the enhanced logging forms for Phone and Email.
- Implement "Interaction Status" (Open/Closed/Follow-up required).

### Phase 3: Live Human Chat (The Bridge)
- Implement `human_conversations` tables.
- Add "Escalation Logic" to the AI Chatbot.
- build the Admin Chat Dashboard.

---

## ❓ Design Questions for User
1. **Chat Handover:** Should the AI bot be completely disabled while a human is chatting, or should they co-exist?
2. **Email Integration:** Do you want to physically *send* emails from this CRM, or just *document* that you sent them elsewhere?
3. **Visibility:** Should users see the internal "Notes" admins write about them, or should those remains strictly internal? (Current thought: Internal only).

---

**Please add your comments/changes directly to this file or reply in the chat!**
