# RentMate Development Guidelines

## Core Principles

### 1. Security & Privacy First 🔒
- **All code changes must prioritize security and privacy**
- Implement proper authentication and authorization checks
- Use Row Level Security (RLS) on all database tables
- Never expose sensitive user data
- Validate and sanitize all user inputs
- Follow the principle of least privilege
- Encrypt sensitive data in transit and at rest

### 2. Mobile First 📱
- **Assume users are primarily on mobile devices**
- Design and test all UI on mobile screens first
- Use responsive layouts that work on small screens
- Optimize touch targets (minimum 44x44px)
- Minimize data usage and optimize performance
- Test on real mobile devices when possible
- Ensure fast load times on mobile networks

### 3. Keep It Simple ✨
- **User experience should be easy and intuitive**
- Minimize clicks and steps to complete tasks
- Use clear, concise language (Hebrew & English)
- Avoid overwhelming users with options
- Provide helpful feedback and error messages
- Design for non-technical users
- When in doubt, choose simplicity over features

### 4. Operational Verify & Update ✅
- **Mandatory Deployment Protocol**:
    - **Step 1: Code Review**: Every deployment MUST be preceded by a comprehensive code review and marked as "OK".
    - **Step 2: Staging Verification**: All non-trivial changes MUST be deployed and verified on the **RentMate TESTS** environment (Staging) before production.
    - **Step 3: Pre-flight Verification**: Run all tests and build checks on the staging/feature branch.
    - **Step 4: Execution**: If staging verification is successful and pre-flight checks pass, merge to `main` for production deployment.
    - **Step 5: Post-Deployment Verification**: Every production deployment must be verified immediately.
    - Check `version.json` and key features on production.
    - **Update the user** with success/failure status immediately after verification.

### 5. Legal Compliance ⚖️
- **Strict Adherence to Israeli Law**:
    - **Spam Law (Section 30A)**: All marketing emails MUST include "פרסומת:" in the subject line. Explicit consent (opt-in) is required. Unsubscribe links must be functional and easy to find.
    - **Privacy**: User data must be processed according to the Privacy Protection Law.
    - **Accessibility**: Services must meet WCAG 2.1 AA standards as per the Equal Rights for Persons with Disabilities Law.
    - **Consumer Protection**: Cancelation policies and pricing transparency must be clear.

---

*These guidelines ensure RentMate remains secure, accessible, and user-friendly for Israeli landlords managing their properties on the go.*
