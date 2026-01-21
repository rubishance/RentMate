# NotebookLM Integration Workflow

This guide explains how to use NotebookLM (free version) to enhance RentMate's chatbot knowledge and create tutorial content.

---

## Part 1: Enhancing Chatbot Knowledge

### Step 1: Prepare Source Documents

1. **Gather RentMate documentation**:
   - User guides
   - Feature descriptions
   - FAQ documents
   - Legal/tax information for Israel
   - Troubleshooting guides

2. **Organize by topic**:
   - Getting Started
   - Features
   - Troubleshooting
   - Legal & Financial FAQ

### Step 2: Create NotebookLM Notebook

1. Go to [NotebookLM](https://notebooklm.google.com/)
2. Click "New Notebook"
3. Name it: "RentMate Knowledge Base - [Language]"
4. Upload your source documents (PDF, DOCX, or paste text)

### Step 3: Generate Knowledge Content

1. **Study Guide**: Click "Generate Study Guide"
   - Comprehensive overview of all content
   - Organized by topics
   - Perfect for chatbot knowledge base

2. **FAQ**: Click "Generate FAQ"
   - Question-answer format
   - Great for common user queries

3. **Briefing Doc**: Click "Generate Briefing Doc"
   - Executive summary
   - Key points highlighted

### Step 4: Export to Knowledge Files

**Option A: Google Docs (Recommended)**
1. Click "Send to Google Docs" on any generated content
2. Open the Google Doc
3. Copy sections relevant to each knowledge file:
   - Getting Started → `getting-started.md`
   - Features → `features.md`
   - Troubleshooting → `troubleshooting.md`
   - Legal FAQ → `legal-faq.md`

**Option B: Direct Copy-Paste**
1. Select the generated content
2. Copy (Ctrl+C / Cmd+C)
3. Paste into the appropriate `.md` file in:
   - Hebrew: `supabase/functions/chat-support/knowledge/he/`
   - English: `supabase/functions/chat-support/knowledge/en/`

### Step 5: Update Knowledge Files

1. Open the target knowledge file (e.g., `features.md`)
2. Paste the NotebookLM-generated content
3. Format as Markdown:
   - Use `#` for main headings
   - Use `##` for subheadings
   - Use `**bold**` for emphasis
   - Use `-` for bullet points
4. Save the file

### Step 6: Test the Chatbot

1. Deploy the updated Edge Function:
   ```bash
   supabase functions deploy chat-support
   ```

2. Open RentMate app
3. Click the chat bubble
4. Ask questions in Hebrew or English:
   - "איך מוסיפים נכס?" (Hebrew)
   - "How do I add a property?" (English)

5. Verify the chatbot uses the new knowledge

---

## Part 2: Creating Tutorial Content

### Step 1: Generate Tutorial Scripts

1. **Create a new NotebookLM notebook**: "RentMate Tutorials - [Feature]"
2. Upload:
   - Feature documentation
   - Screenshots of the feature
   - User flow diagrams (if available)

3. **Generate Audio Overview** (Deep Dive):
   - Click "Generate Audio Overview"
   - NotebookLM creates a podcast-style explanation
   - Download the audio file (MP3)

4. **Generate Study Guide**:
   - This becomes your tutorial script
   - Organized step-by-step

### Step 2: Create Image Prompts

Use the `tutorial-generator.py` script (coming next) to convert NotebookLM output into image generation prompts.

**Manual method:**
1. Read the Study Guide
2. For each step, create a detailed prompt:
   ```
   Example:
   "Clean, modern UI screenshot of RentMate dashboard showing:
   - Top navigation bar with 'Properties', 'Contracts', 'Payments' tabs
   - Welcome message in Hebrew: 'שלום, [User Name]'
   - 3 property cards with images, addresses, and rent amounts
   - '+' button in bottom right corner
   - Glass morphism design with soft shadows
   - Mobile-first responsive layout"
   ```

3. Use prompts with:
   - **DALL-E 3** (via ChatGPT Plus)
   - **Midjourney** (Discord bot)
   - **Stable Diffusion** (local or online)

### Step 3: Create Tutorial Videos

**Option A: Screen Recording + NotebookLM Audio**
1. Use OBS Studio or Loom to record screen
2. Navigate through RentMate features
3. Replace audio with NotebookLM Audio Overview
4. Edit with DaVinci Resolve (free) or Adobe Premiere

**Option B: AI Video Generation**
1. Use NotebookLM Study Guide as script
2. Upload to:
   - **HeyGen** (AI avatar presenter)
   - **Synthesia** (AI video from text)
   - **InVideo AI** (text-to-video)
3. Combine with RentMate screenshots

**Option C: Animated Explainer**
1. Use Canva Pro or After Effects
2. Import generated images
3. Add transitions and animations
4. Sync with NotebookLM audio

### Step 4: Organize Tutorial Assets

```
public/tutorials/
├── videos/
│   ├── he/
│   │   ├── 01-getting-started.mp4
│   │   ├── 02-add-property.mp4
│   │   ├── 03-create-contract.mp4
│   │   ├── 04-scan-contract.mp4
│   │   ├── 05-manage-payments.mp4
│   │   └── 06-linkage-calculator.mp4
│   └── en/
│       └── (same structure)
├── images/
│   ├── he/
│   │   ├── dashboard-overview.png
│   │   ├── add-property-step1.png
│   │   ├── add-property-step2.png
│   │   └── ...
│   └── en/
│       └── (same structure)
└── content/
    ├── he/
    │   └── tutorials.json
    └── en/
        └── tutorials.json
```

### Step 5: Create Tutorial Metadata

Create `tutorials.json` for each language:

```json
{
  "tutorials": [
    {
      "id": "getting-started",
      "title": "התחלת עבודה עם RentMate",
      "description": "למד כיצד להירשם, להוסיף נכס ראשון וליצור חוזה",
      "category": "basics",
      "duration": "5:30",
      "videoUrl": "/tutorials/videos/he/01-getting-started.mp4",
      "thumbnail": "/tutorials/images/he/getting-started-thumb.png",
      "steps": [
        {
          "title": "הרשמה למערכת",
          "image": "/tutorials/images/he/signup.png",
          "description": "לחץ על 'התחברות' ובחר 'הרשמה'"
        },
        {
          "title": "הוספת נכס ראשון",
          "image": "/tutorials/images/he/add-property.png",
          "description": "מלא את פרטי הנכס והעלה תמונות"
        }
      ]
    }
  ]
}
```

---

## Part 3: Maintenance & Updates

### Monthly Knowledge Update

1. **Collect new content**:
   - New features released
   - User feedback and common questions
   - Updated legal/tax information

2. **Update NotebookLM notebook**:
   - Add new source documents
   - Regenerate Study Guide and FAQ

3. **Update knowledge files**:
   - Copy updated sections
   - Paste into relevant `.md` files
   - Deploy updated Edge Function

### Tutorial Updates

1. **When to update**:
   - UI changes
   - New features added
   - User confusion detected (analytics)

2. **Update process**:
   - Record new screen captures
   - Update NotebookLM with new documentation
   - Regenerate Audio Overview if needed
   - Replace old tutorial files

---

## Tips for Best Results

### NotebookLM Best Practices

1. **Upload quality sources**:
   - Clear, well-structured documents
   - Accurate information
   - Up-to-date content

2. **Use specific prompts**:
   - Instead of "Generate FAQ", ask:
     "Generate FAQ focusing on common user issues with property management and Israeli rental law"

3. **Iterate**:
   - Generate multiple versions
   - Compare and combine best parts

4. **Language consistency**:
   - Create separate notebooks for Hebrew and English
   - Don't mix languages in one notebook

### Image Generation Tips

1. **Be specific**:
   - Mention UI elements, colors, layout
   - Reference "RentMate" and "Glass Bionic" design
   - Specify Hebrew text if needed

2. **Consistency**:
   - Use same art style across all images
   - Maintain color scheme (black, white, glass effects)

3. **Accessibility**:
   - High contrast for readability
   - Clear, large text
   - Avoid clutter

### Video Production Tips

1. **Keep it short**:
   - 3-5 minutes per tutorial
   - Focus on one feature at a time

2. **Add subtitles**:
   - Essential for accessibility
   - Helps non-native speakers
   - Use YouTube auto-captions or Rev.com

3. **Mobile-friendly**:
   - Test on mobile devices
   - Ensure text is readable on small screens

---

## Troubleshooting

### NotebookLM Issues

**Problem**: Generated content is too generic
- **Solution**: Add more specific source documents, use custom prompts

**Problem**: Hebrew text is incorrect
- **Solution**: Use Hebrew-language sources, verify with native speaker

**Problem**: Can't export to Google Docs
- **Solution**: Use copy-paste method, or use browser extension "Massive Mark"

### Chatbot Issues

**Problem**: Chatbot not using new knowledge
- **Solution**: Verify files are in correct directory, redeploy Edge Function

**Problem**: Chatbot responds in wrong language
- **Solution**: Check `detectLanguage()` function, test with clear Hebrew/English messages

### Tutorial Issues

**Problem**: Videos too large to host
- **Solution**: Compress with HandBrake, or use YouTube/Vimeo embedding

**Problem**: Images not loading
- **Solution**: Check file paths in `tutorials.json`, verify files uploaded to Supabase Storage

---

## Next Steps

1. ✅ Knowledge files created (Hebrew + English)
2. ✅ Chatbot updated to load dynamically
3. ⏳ Create `tutorial-generator.py` script
4. ⏳ Build `TutorialsPage.tsx` component
5. ⏳ Generate first batch of tutorial content
6. ⏳ Deploy and test

**Estimated time to complete**: 2-3 days
**Cost**: $0-150 (mostly for optional AI video tools)
