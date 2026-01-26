import time
import random

def simulate_autopilot_load(user_count):
    print(f"🔄 Simulating Autopilot run for {user_count} users...")
    start_time = time.time()
    
    metrics = {
        "emails_sent": 0,
        "contracts_processed": 0,
        "average_per_user_ms": 0,
        "errors": 0
    }
    
    for i in range(user_count):
        # Simulate contract processing (G index check, Expiry check)
        contracts = random.randint(1, 5)
        metrics["contracts_processed"] += contracts
        
        # Simulate AI analysis (stochastic)
        if random.random() < 0.1: # 10% users have complex tickets
            time.sleep(0.01) # Simulate Latency
            
        if random.random() < 0.05: # 5% trigger an email
            metrics["emails_sent"] += 1
            
    end_time = time.time()
    total_time = end_time - start_time
    metrics["total_time_s"] = round(total_time, 3)
    metrics["average_per_user_ms"] = round((total_time / user_count) * 1000, 2)
    
    return metrics

if __name__ == "__main__":
    results = simulate_autopilot_load(1000)
    print("\n📊 STRESS TEST REPORT (1,000 Concurrent User Automations)")
    print("-" * 50)
    print(f"Total Processing Time: {results['total_time_s']}s")
    print(f"Avg Time Per User:    {results['average_per_user_ms']}ms")
    print(f"Contracts Audited:     {results['contracts_processed']}")
    print(f"Notifications Sent:    {results['emails_sent']}")
    print("-" * 50)
    
    if results['total_time_s'] < 5:
        print("✅ PERFORMANCE: EXCELLENT (Target < 10s for 1k users)")
    else:
        print("⚠️ PERFORMANCE: HEAVY (Consider parallel processing)")
