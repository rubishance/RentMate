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
    - Every push/deployment must be verified immediately.
    - Check `version.json` and key features on production.
    - **Update the user** with success/failure status immediately after verification.
    - Never assume a deployment succeeded without proof.

---

*These guidelines ensure RentMate remains secure, accessible, and user-friendly for Israeli landlords managing their properties on the go.*
