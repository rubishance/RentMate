
import re
from playwright.sync_api import Page, expect

BASE_URL = "http://localhost:5173"

def test_portfolio_widget_appearance(page: Page):
    """
    Test that the Portfolio Readiness Widget appears on the dashboard
    """
    page.goto(f"{BASE_URL}/dashboard")

    # Check for widget title (Hebrew or English)
    expect(page.locator("text=Portfolio Setup").or_(page.locator("text=מוכנות לניהול"))).to_be_visible()

    # Check for steps
    expect(page.locator("text=Verify Identity").or_(page.locator("text=השלמת פרופיל"))).to_be_visible()
    expect(page.locator("text=Add First Asset").or_(page.locator("text=הוספת נכס ראשון"))).to_be_visible()

def test_portfolio_widget_navigation(page: Page):
    """
    Test navigation from widget steps
    """
    page.goto(f"{BASE_URL}/dashboard")
    
    # Click "Settings" / "Profile" step
    settings_btn = page.locator("button").filter(has_text=re.compile("Settings|הגדרות"))
    # Only click if not disabled (completed)
    if settings_btn.is_enabled():
        settings_btn.click()
        expect(page).to_have_url(re.compile("/settings"))
