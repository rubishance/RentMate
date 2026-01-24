---
name: google-stitch
description: "AI UI/UX design and code generation intelligence. Based on Google's Stitch platform. Enhances design prompts, provides assistant protocols, and implements the Effective Prompting Guide. Actions: design, build, create, refactor, enhance. Projects: web app, mobile app, dashboard, landing page. Style: incremental refinement, adjective-based vibes, theme control."
---

# Google Stitch - Design Intelligence

Google Stitch is an AI-powered UI generation and design iteration tool. This skill enables the agent to interface with the Stitch philosophy (and MCP server if available) to create high-fidelity, production-ready designs with Tailwind CSS.

## When to Apply

Reference these guidelines when:
- Designing new user interfaces or mobile screens
- Refining existing designs through incremental prompts
- Enhancing raw user design ideas into "Stitch-optimized" prompts
- Implementing high-fidelity mockups using Tailwind CSS

## Core Protocols

### 1. Protocol A: The Enhancer
When a user provides a vague design request (e.g., "make a workout app"), apply Protocol A to generate a structured, high-fidelity prompt.

**Workflow:**
1. Analyze the raw intent.
2. Apply the **Stitch Effective Prompting Guide** (see below).
3. Generate a refined, detailed prompt that specifies vibe, layout, and components.
4. Save the enhanced prompt to a file (e.g., `design_spec.md`).

### 2. Protocol B: The Assistant (Stitch MCP)
If the `stitch` MCP server is available, use its tools to:
- `stitch.listProjects()`: Browse existing design projects.
- `stitch.getScreenCode(screenId)`: Fetch the actual HTML/Tailwind code for a screen.
- `stitch.generateScreen(prompt)`: Call the AI to generate a new UI.
- `stitch.updateScreen(screenId, prompt)`: Apply incremental changes to an existing screen.

## Effective Prompting Guide

### Starting a Project
- **High-Level vs Detailed**: Start with a broad concept for brainstorming ("An app for marathon runners") or be specific for direct results ("An app for marathon runners to find partners and train").
- **Vibe Adjectives**: Always use 2-3 adjectives to set the theme ("vibrant and encouraging", "minimalist and focused"). This automatically sets fonts, colors, and imagery.

### Refining by Iteration
- **Incremental Changes**: Make only **one or two** specific adjustments per prompt. Stitch works best when focused.
- **Identify Target Specifically**: Reference elements like "the primary button in the hero section" or "the navigation bar".
- **Describe Imagery**: Be specific about image content and style ("Macro photo of ocean water", "Neutral, minimal colors").

### Controlling the Theme
- **Colors**: Request specific colors ("Forest green") or describes moods ("Warm and inviting").
- **Typography & Borders**: Use UI keywords ("serif font for headings", "fully rounded corners", "2px solid black border").
- **Language**: One-shot localization ("Switch all product copy to Spanish").

## Pro Tips for Professional UI
- **No Layout Jumps**: Don't mix structural changes (layout) with UI component tweaks in one prompt.
- **Save Iterations**: Encourage saving a "screenshot" or version after every successful change.
- **UI/UX Keywords**: Use standard terms: *navigation bar, call-to-action, card layout, hero section*.

## Script Utility
Use the provided script to search for design patterns:
```bash
python .agent/skills/stitch/scripts/stitch_helper.py --enhance "vague prompt"
```
