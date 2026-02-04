
import re
from playwright.sync_api import Page, expect

BASE_URL = "http://localhost:5173"

def test_bionic_welcome_overlay_appears(page: Page):
    """
    Test that the Bionic Welcome Overlay appears for a new user
    (Requires user to have 0 contracts and has_seen_welcome_v1=false)
    """
    # Note: In a real E2E environment, we'd need to seed a new user or mock the response.
    # For now, we assume the environment is set up for a new user test or we mock the API response.
    
    # Go to Dashboard
    page.goto(f"{BASE_URL}/dashboard")

    # Check for the overlay text
    # The overlay says "Hi [Name], Let's Get Started!" in English or Hebrew
    # We look for the unique text "Renty AI" in the badge
    expect(page.locator("text=Renty AI").first).to_be_visible(timeout=5000)
    
    # Check for the "Add First Property" button
    add_btn = page.locator("button").filter(has_text=re.compile("Add First Property|הוסף את הנכס הראשון"))
    expect(add_btn).to_be_visible()

def test_dismiss_overlay_updates_preference(page: Page):
    """
    Test that dismissing the overlay removes it and (implicitly) updates preference
    """
    page.goto(f"{BASE_URL}/dashboard")
    
    # Wait for overlay
    expect(page.locator("text=Renty AI").first).to_be_visible()
    
    # Click "Just explore dashboard"
    dismiss_btn = page.locator("button").filter(has_text=re.compile("Just explore dashboard|רק להציץ בלוח הבקרה"))
    dismiss_btn.click()
    
    # Overlay should disappear
    expect(page.locator("text=Renty AI").first).not_to_be_visible()
