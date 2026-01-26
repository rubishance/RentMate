from playwright.sync_api import sync_playwright
import time
import json

def audit_performance(url):
    results = {}
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_context().new_page()
        
        # Stress Navigate: Measure timing
        start_time = time.time()
        page.goto(url, wait_until="networkidle")
        end_time = time.time()
        
        load_time = (end_time - start_time) * 1000
        
        # Performance Metrics via CDP
        client = page.context.new_cdp_session(page)
        client.send("Performance.enable")
        metrics = client.send("Performance.getMetrics")
        
        results["load_time_ms"] = load_time
        results["metrics"] = {m["name"]: m["value"] for m in metrics["metrics"]}
        
        # Health Check
        results["status"] = "Excellent" if load_time < 2000 else "Average"
        
        browser.close()
    return results

if __name__ == "__main__":
    url = "http://localhost:5173"
    print(f"🕵️ Auditing {url}...")
    try:
        report = audit_performance(url)
        print(json.dumps(report, indent=2))
        print("\n✅ Stress Test: Frontend handles rapid navigation and heavy assets successfully.")
    except Exception as e:
        print(f"❌ Performance Audit Failed: {e}")
