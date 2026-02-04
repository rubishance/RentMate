
import re
from playwright.sync_api import Page, expect

BASE_URL = "http://localhost:5173"

def test_spotlight_appears_on_dashboard(page: Page):
    """
    Test that the Bionic Spotlight appears pointing to the Add Asset button
    Condition: User has 0 contracts, has seen welcome, hasn't seen spotlight
    """
    page.goto(f"{BASE_URL}/dashboard")

    # Check for spotlight title text
    expect(page.locator("text=Your Next Step").or_(page.locator("text=הצעד הבא שלך"))).to_be_visible()

    # Check that it is pointing near the button (indirectly by having the button on screen)
    expect(page.locator("#portfolio-add-asset-btn")).to_be_visible()

def test_dismiss_spotlight(page: Page):
    """
    Test that clicking 'Got it' dismisses the spotlight
    """
    page.goto(f"{BASE_URL}/dashboard")
    
    # Locate dismiss button
    got_it_btn = page.locator("button").filter(has_text=re.compile("Got it|הבנתי"))
    got_it_btn.click()
    
    # Should disappear
    expect(page.locator("text=Your Next Step").or_(page.locator("text=הצעד הבא שלך"))).not_to_be_visible()
