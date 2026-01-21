# Deployment Guide for AYDesign

This project is built with **Next.js 14** and optimized for deployment on **Vercel**.

## Prerequisites
- A [Vercel Account](https://vercel.com/signup) (Free).
- A [GitHub Account](https://github.com) (for CI/CD).

## Steps to Deploy

1.  **Push to GitHub**
    - Initialize a git repository in this folder if not already done:
      ```bash
      git init
      git add .
      git commit -m "Initial commit"
      ```
    - Create a new repository on GitHub and push your code.

2.  **Import to Vercel**
    - Go to your Vercel Dashboard and click **"Add New..."** -> **"Project"**.
    - Import your GitHub repository.
    - Vercel will auto-detect Next.js.
    - **Environment Variables**: No special variables needed for the basic setup.
    - Click **Deploy**.

## Domain Setup
- Once deployed, go to **Settings** -> **Domains** in your Vercel project.
- Add your custom domain (e.g., `aydesign.com`).
- Follow the DNS configuration instructions provided by Vercel.

## Updating Content
- To update the site (blog posts, portfolio items), simply edit the code/content locally.
- Commit and push to GitHub (`git push`).
- Vercel will automatically redeploy the new version.
