# Creating a Pro Tutorial with NotebookLM & RentMate

You have high-quality knowledge files separated by subject in the `docs/knowledge_base` folder. Follow these steps to create a "WOW" tutorial experience for your users.

## Step 1: Upload to NotebookLM
1. Open [NotebookLM](https://notebooklm.google.com/).
2. Create a new Notebook named **"RentMate Master Class"**.
3. Upload the following files from your local `docs/knowledge_base` folder:
   - `01_App_Navigation.md`
   - `02_Calculator_Ledger.md`
   - `03_Property_Documents.md`
   - `04_Subscriptions_Admin.md`
   - `05_AI_Intelligence.md`
   - (Optional) Any of your legal articles from `src/content/articles`

## Step 2: Generate the "Audio Overview" (Podcast)
This is the most engaging way to teach new users.
1. In the right-hand panel, click **"Notebook Guide"**.
2. Click **"Audio Overview"** -> **"Generate"**.
3. **The Result:** NotebookLM will create a conversational deep-dive between two hosts who will discuss RentMate's features, the "Running Ledger" logic, and the Israeli rental market.
4. **Usage:** You can download this audio and put it on your landing page as a "5-minute audio guide."

## Step 3: Create a "Cheat Sheet" for your Bot
Even though I've updated the bot's core knowledge, you can use NotebookLM to create "Scenario Scripts":
1. Ask NotebookLM: *"Create a list of 10 common questions a landlord might ask about CPI linkage, and provide short, professional answers based on the sources."*
2. Copy these answers into the `knowledge.ts` file in your Supabase Edge Function to make the bot even smarter.

## Step 4: Generate a Visual Tutorial
Ask NotebookLM: *"Generate a step-by-step checklist for a new landlord who has just signed up to RentMate. Make it friendly and professional."*

## Why separate files?
By using separate files for each subject, NotebookLM can better distinguish between **Legal Knowledge** (how law works) and **App Functionality** (how buttons work), resulting in more accurate and less confused tutorials.
