try:
    from playwright.sync_api import sync_playwright
    print("Playwright is available")
except ImportError as e:
    print(f"Error: {e}")
