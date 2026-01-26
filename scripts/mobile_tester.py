#!/usr/bin/env python3
import sys
import json
import os
import tempfile
from datetime import datetime

try:
    from playwright.sync_api import sync_playwright
    PLAYWRIGHT_AVAILABLE = True
except ImportError:
    PLAYWRIGHT_AVAILABLE = False

def run_mobile_test(url: str, device_name: str = "iPhone 12") -> dict:
    if not PLAYWRIGHT_AVAILABLE:
        return {"error": "Playwright not installed"}
    
    result = {
        "url": url,
        "device": device_name,
        "timestamp": datetime.now().isoformat(),
        "status": "pending"
    }
    
    try:
        with sync_playwright() as p:
            device = p.devices[device_name]
            browser = p.chromium.launch(headless=True)
            context = browser.new_context(**device)
            page = context.new_page()
            
            # Step 1: Navigate
            response = page.goto(url, wait_until="networkidle", timeout=30000)
            
            # Step 2: Discovery - Find all buttons and links
            buttons = page.locator("button").all()
            links = page.locator("a").all()
            
            result["metrics"] = {
                "title": page.title(),
                "button_count": len(buttons),
                "link_count": len(links),
                "status_code": response.status if response else None
            }
            
            # Step 3: Touch Target Audit (Accessibility)
            small_targets = []
            for btn in buttons:
                box = btn.bounding_box()
                if box and (box["width"] < 44 or box["height"] < 44):
                    small_targets.append({
                        "text": btn.inner_text(),
                        "size": f"{box['width']}x{box['height']}"
                    })
            
            result["accessibility"] = {
                "small_touch_targets": small_targets,
                "target_health": "Pass" if len(small_targets) == 0 else "Fail"
            }
            
            # Step 4: Screenshot
            screenshot_dir = os.path.join(tempfile.gettempdir(), "maestro_mobile_tests")
            os.makedirs(screenshot_dir, exist_ok=True)
            screenshot_path = os.path.join(screenshot_dir, f"mobile_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png")
            page.screenshot(path=screenshot_path, full_page=True)
            result["screenshot"] = screenshot_path

            browser.close()
            result["status"] = "success"
            
    except Exception as e:
        result["status"] = "error"
        result["error"] = str(e)
    
    return result

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python mobile_tester.py <url>")
        sys.exit(1)
    
    url = sys.argv[1]
    result = run_mobile_test(url)
    print(json.dumps(result, indent=2))
