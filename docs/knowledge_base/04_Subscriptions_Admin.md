# RentMate: Subscription Plans & Admin Controls

RentMate uses a tier-based model to accommodate everything from single-unit landlords to large real-estate management firms.

![Pricing](./images/pricing.png)

## 1. Subscription Tiers & Restrictions
- **Free Forever**: 
  - 1 Property
  - Basic Contract Tracking
  - Standard Calculator
  - Basic Support Chatbot
  - *Note*: Advanced Ledger Calculations and AI Analysis are restricted in this tier.
- **Pro (Landlord)**:
  - Up to 5 Properties
  - AI Contract Analysis
  - Unlimited Document Storage
  - Advanced Ledger Calculations
- **Business (Manager)**:
  - Unlimited Properties
  - Priority Support
  - Team/Admin Access
  - White-labeled Invoices

## 2. Admin Capabilities
Administrators (identified by `role: 'admin'` and `is_super_admin: true`) have access to:
- **User Management**: View all users, reset passwords, change plan levels, or impersonate a user for support.
- **System Settings**: Global maintenance mode, API toggles, and feature flags.
- **AI Analytics**: Monitor how many tokens and messages the AI chatbot is consuming system-wide.
- **Broadcasts**: Send mass emails/notifications to the entire user base about updates or legal changes in Israel.

## 3. Stripe Integration
- **Billing Portal**: Users can manage their subscriptions through a secure Stripe-hosted portal.
- **Invoice Tracking**: Historical invoices are available for tax purposes in the Settings section.
- **Automated Grace Period**: Handling of expired credit cards or failed payments without immediate data loss.
