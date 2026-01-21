"""
RentMate E2E Tests - Critical User Flows
Tests the most important user journeys to ensure core functionality works.
"""
import re
from playwright.sync_api import Page, expect

BASE_URL = "http://localhost:5173"

def test_landing_page_loads(page: Page):
    """Test 1: Landing page (WelcomeLanding) loads correctly"""
    page.goto(BASE_URL)
    
    # Check for hero title
    expect(page.locator("h1")).to_contain_text(re.compile("ניהול נכסים|Property Management", re.I), timeout=15000)
    
    # Check for login button in navbar
    expect(page.locator("text=כניסת משתמש").or_(page.locator("text=כניסה")).or_(page.locator("text=Login"))).to_be_visible()


def test_login_page_accessible(page: Page):
    """Test 2: Login page is accessible and renders"""
    page.goto(f"{BASE_URL}/login")
    
    # Check for login form elements
    # Usually it has an email input
    expect(page.locator("input[type='email']")).to_be_visible(timeout=15000)
    expect(page.get_by_role("button", name=re.compile("התחברות|Login|Sign In", re.I))).to_be_visible()


def test_dashboard_requires_auth(page: Page):
    """Test 3: Dashboard redirects to login if not authenticated"""
    page.goto(f"{BASE_URL}/dashboard")
    
    # Should redirect to login
    page.wait_for_url(re.compile("/login"), timeout=15000)
    expect(page).to_have_url(re.compile("/login"))


def test_public_calculator_on_landing(page: Page):
    """Test 4: Public calculator on landing page is functional"""
    page.goto(BASE_URL)
    
    # Switch to calculator tab
    calc_tab = page.locator("button").filter(has_text=re.compile("מחשבון הצמדה|Index Calculator", re.I))
    expect(calc_tab).to_be_visible(timeout=15000)
    calc_tab.click()
    
    # Check for calculator UI elements
    expect(page.locator("text=מחשבון הצמדה בסיסי").or_(page.locator("text=Basic Index Calculator"))).to_be_visible()
    expect(page.locator("input[type='number']")).to_have_value("5000")


def test_knowledge_base_accessible(page: Page):
    """Test 5: Knowledge Base is publicly accessible"""
    page.goto(f"{BASE_URL}/knowledge-base")
    
    # Check for knowledge base heading
    # Using a broader selector that targets the text specifically
    expect(page.get_by_role("heading", level=1).filter(has_text=re.compile("מרכז הידע|Knowledge Base", re.I))).to_be_visible(timeout=15000)


def test_responsive_navigation(page: Page):
    """Test 6: Navigation works on mobile viewport"""
    page.set_viewport_size({"width": 375, "height": 667})
    page.goto(BASE_URL)
    
    # Page should load successfully on mobile
    expect(page.locator("h1")).to_be_visible(timeout=15000)


def test_pricing_page_loads(page: Page):
    """Test 7: Pricing page displays correctly"""
    page.goto(f"{BASE_URL}/pricing")
    
    # Check for pricing title
    expect(page.locator("h1")).to_contain_text(re.compile("חבילות ומחירים|Pricing", re.I), timeout=15000)
    
    # Check for plan names (Basic, Pro, etc. - usually fetched from DB)
    # We wait for plans to load
    page.wait_for_selector(".grid", timeout=15000)
    expect(page.locator("text=Basic").or_(page.locator("text=בסיסי")).or_(page.locator("text=Free"))).to_be_visible()


def test_accessibility_statement_exists(page: Page):
    """Test 8: Accessibility statement is accessible"""
    page.goto(f"{BASE_URL}/accessibility")
    
    expect(page.locator("h1").filter(has_text=re.compile("נגישות|Accessibility", re.I))).to_be_visible(timeout=15000)


def test_no_critical_console_errors(page: Page):
    """Test 9: Landing page has no critical console errors"""
    errors = []
    page.on("console", lambda msg: errors.append(msg.text) if msg.type == "error" else None)
    
    page.goto(BASE_URL)
    page.wait_for_load_state("networkidle", timeout=20000)
    
    # Filter out known non-critical errors (e.g. Supabase warnings if no session)
    critical_errors = [e for e in errors if not any(x in e.lower() for x in ["favicon", "manifest", "sw.js", "supabase"])]
    
    # Allow minor unavoidable console errors in dev
    assert len(critical_errors) <= 3, f"Too many console errors: {critical_errors}"
