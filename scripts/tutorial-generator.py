#!/usr/bin/env python3
"""
Tutorial Content Generator for RentMate

This script converts NotebookLM Study Guide outputs into:
1. Detailed image generation prompts
2. Video storyboards
3. Tutorial JSON structure

Usage:
    python scripts/tutorial-generator.py <input_file> <output_dir> [--language he|en]

Example:
    python scripts/tutorial-generator.py notebooklm-output.md public/tutorials --language he
"""

import argparse
import json
import os
import re
from pathlib import Path
from typing import List, Dict, Any


class TutorialGenerator:
    def __init__(self, language: str = 'he'):
        self.language = language
        self.design_system = {
            'style': 'Glass Bionic 2.0',
            'colors': ['black', 'white', 'glass effects', 'soft shadows'],
            'typography': 'Inter font family',
            'layout': 'Mobile-first responsive'
        }
    
    def parse_markdown(self, content: str) -> List[Dict[str, Any]]:
        """Parse NotebookLM markdown output into structured sections."""
        sections = []
        current_section = None
        
        lines = content.split('\n')
        
        for line in lines:
            # Main heading (# Title)
            if line.startswith('# '):
                if current_section:
                    sections.append(current_section)
                current_section = {
                    'title': line[2:].strip(),
                    'subsections': [],
                    'content': []
                }
            
            # Subheading (## Subtitle)
            elif line.startswith('## ') and current_section:
                current_section['subsections'].append({
                    'title': line[3:].strip(),
                    'content': []
                })
            
            # Content
            elif line.strip() and current_section:
                if current_section['subsections']:
                    current_section['subsections'][-1]['content'].append(line.strip())
                else:
                    current_section['content'].append(line.strip())
        
        if current_section:
            sections.append(current_section)
        
        return sections
    
    def generate_image_prompt(self, section: Dict[str, Any], step_num: int) -> str:
        """Generate detailed image prompt for AI image generators."""
        title = section.get('title', 'RentMate Feature')
        content = ' '.join(section.get('content', []))
        
        # Extract UI elements from content
        ui_elements = self._extract_ui_elements(content)
        
        prompt = f"""Professional UI screenshot of RentMate app - {title}

Design Style: {self.design_system['style']}
- Clean, modern interface with glassmorphism effects
- Black and white color scheme with subtle gradients
- Soft shadows and depth
- {self.design_system['typography']}
- {self.design_system['layout']}

UI Elements:
{ui_elements}

Language: {'Hebrew (RTL layout)' if self.language == 'he' else 'English (LTR layout)'}

Additional Details:
- High contrast for readability
- Clear, large text
- Mobile-optimized (375px width)
- Professional and trustworthy appearance
- Annotations showing step {step_num} with arrows or highlights

Quality: Photorealistic, 4K resolution, professional product screenshot
"""
        return prompt.strip()
    
    def _extract_ui_elements(self, content: str) -> str:
        """Extract UI elements mentioned in content."""
        elements = []
        
        # Common UI patterns
        patterns = {
            'button': r'(button|כפתור|לחץ|click)',
            'input': r'(input|field|שדה|הזן|enter)',
            'menu': r'(menu|תפריט|navigation|ניווט)',
            'card': r'(card|כרטיס)',
            'list': r'(list|רשימה)',
            'form': r'(form|טופס)',
        }
        
        for element_type, pattern in patterns.items():
            if re.search(pattern, content, re.IGNORECASE):
                elements.append(f"- {element_type.capitalize()} component")
        
        return '\n'.join(elements) if elements else "- Main interface elements"
    
    def generate_video_storyboard(self, sections: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Generate video storyboard from sections."""
        storyboard = {
            'title': sections[0]['title'] if sections else 'RentMate Tutorial',
            'duration_estimate': f"{len(sections) * 30}s",  # 30s per section
            'scenes': []
        }
        
        for idx, section in enumerate(sections, 1):
            scene = {
                'scene_number': idx,
                'title': section['title'],
                'duration': '30s',
                'visuals': f"Screen recording showing: {section['title']}",
                'narration': ' '.join(section.get('content', []))[:200] + '...',
                'on_screen_text': section['title'],
                'transitions': 'Smooth fade' if idx < len(sections) else 'End card'
            }
            storyboard['scenes'].append(scene)
        
        return storyboard
    
    def generate_tutorial_json(self, sections: List[Dict[str, Any]], 
                               tutorial_id: str, category: str) -> Dict[str, Any]:
        """Generate tutorial JSON structure for the app."""
        steps = []
        
        for idx, section in enumerate(sections, 1):
            step = {
                'title': section['title'],
                'image': f"/tutorials/images/{self.language}/{tutorial_id}-step{idx}.png",
                'description': ' '.join(section.get('content', []))[:150]
            }
            steps.append(step)
        
        tutorial = {
            'id': tutorial_id,
            'title': sections[0]['title'] if sections else 'Tutorial',
            'description': ' '.join(sections[0].get('content', []))[:200] if sections else '',
            'category': category,
            'duration': f"{len(sections) * 30}s",
            'videoUrl': f"/tutorials/videos/{self.language}/{tutorial_id}.mp4",
            'thumbnail': f"/tutorials/images/{self.language}/{tutorial_id}-thumb.png",
            'steps': steps
        }
        
        return tutorial
    
    def process_file(self, input_file: Path, output_dir: Path, 
                     tutorial_id: str, category: str = 'general'):
        """Process NotebookLM output file and generate all assets."""
        print(f"📖 Reading {input_file}...")
        
        with open(input_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        print("🔍 Parsing content...")
        sections = self.parse_markdown(content)
        print(f"   Found {len(sections)} sections")
        
        # Create output directories
        prompts_dir = output_dir / 'prompts'
        storyboards_dir = output_dir / 'storyboards'
        json_dir = output_dir / 'content' / self.language
        
        for dir_path in [prompts_dir, storyboards_dir, json_dir]:
            dir_path.mkdir(parents=True, exist_ok=True)
        
        # Generate image prompts
        print("\n🎨 Generating image prompts...")
        prompts_file = prompts_dir / f"{tutorial_id}_{self.language}_prompts.txt"
        with open(prompts_file, 'w', encoding='utf-8') as f:
            for idx, section in enumerate(sections, 1):
                prompt = self.generate_image_prompt(section, idx)
                f.write(f"=== STEP {idx}: {section['title']} ===\n\n")
                f.write(prompt)
                f.write("\n\n" + "="*80 + "\n\n")
        print(f"   ✅ Saved to {prompts_file}")
        
        # Generate video storyboard
        print("\n🎬 Generating video storyboard...")
        storyboard = self.generate_video_storyboard(sections)
        storyboard_file = storyboards_dir / f"{tutorial_id}_{self.language}_storyboard.json"
        with open(storyboard_file, 'w', encoding='utf-8') as f:
            json.dump(storyboard, f, ensure_ascii=False, indent=2)
        print(f"   ✅ Saved to {storyboard_file}")
        
        # Generate tutorial JSON
        print("\n📋 Generating tutorial JSON...")
        tutorial_json = self.generate_tutorial_json(sections, tutorial_id, category)
        json_file = json_dir / f"{tutorial_id}.json"
        with open(json_file, 'w', encoding='utf-8') as f:
            json.dump(tutorial_json, f, ensure_ascii=False, indent=2)
        print(f"   ✅ Saved to {json_file}")
        
        print("\n✨ Generation complete!")
        print(f"\nNext steps:")
        print(f"1. Use prompts in {prompts_file} to generate images")
        print(f"2. Follow storyboard in {storyboard_file} to create video")
        print(f"3. Update tutorials.json with content from {json_file}")


def main():
    parser = argparse.ArgumentParser(
        description='Generate tutorial content from NotebookLM output'
    )
    parser.add_argument('input_file', type=Path, help='NotebookLM markdown file')
    parser.add_argument('output_dir', type=Path, help='Output directory')
    parser.add_argument('--language', choices=['he', 'en'], default='he',
                        help='Tutorial language (default: he)')
    parser.add_argument('--id', required=True, help='Tutorial ID (e.g., getting-started)')
    parser.add_argument('--category', default='general',
                        help='Tutorial category (default: general)')
    
    args = parser.parse_args()
    
    if not args.input_file.exists():
        print(f"❌ Error: Input file not found: {args.input_file}")
        return 1
    
    generator = TutorialGenerator(language=args.language)
    generator.process_file(
        args.input_file,
        args.output_dir,
        args.id,
        args.category
    )
    
    return 0


if __name__ == '__main__':
    exit(main())
