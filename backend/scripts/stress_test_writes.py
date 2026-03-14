import asyncio
import time
import httpx
import argparse
import statistics
import random
from urllib.parse import urlparse

async def run_write_stress_test(url, payload, total_requests, concurrency):
    print(f"\n--- Testing POST {url} ---")
    print(f"Simulating {total_requests} POST requests with {concurrency} concurrent users...")

    async with httpx.AsyncClient(timeout=30.0) as client:
        semaphore = asyncio.Semaphore(concurrency)
        latencies = []
        failed_requests = 0
        start_time = time.time()

        async def make_request():
            nonlocal failed_requests
            async with semaphore:
                req_start = time.time()
                try:
                    # Randomize amount slightly to make writes different
                    current_payload = payload.copy()
                    current_payload["totalAmount"] = random.randint(100, 1000)
                    
                    response = await client.post(url, json=current_payload)
                    response.raise_for_status()
                    latencies.append((time.time() - req_start) * 1000)
                except Exception as e:
                    failed_requests += 1
                    # print(f"Request failed: {e}")

        tasks = [make_request() for _ in range(total_requests)]
        await asyncio.gather(*tasks)
        
        total_time = time.time() - start_time

    # Results
    successful_requests = total_requests - failed_requests
    print(f"\nResults for POST {urlparse(url).path}:")
    print(f"Total Time:             {total_time:.2f} seconds")
    print(f"Requests per second:    {successful_requests / total_time:.2f} [#/sec]")
    if latencies:
        print(f"Time per request (avg): {statistics.mean(latencies):.2f} ms")
        print(f"Time per request (min): {min(latencies):.2f} ms")
        print(f"Time per request (max): {max(latencies):.2f} ms")
        print(f"P95 latency:            {sorted(latencies)[int(len(latencies)*0.95)]:.2f} ms")
    print(f"Failed requests:        {failed_requests}")

async def main():
    # Target existing patient ID from backend/all_patients.json
    registration_id = "REG-2026-557939"
    base_url = "http://127.0.0.1:8008"
    endpoint = f"/api/billing/invoices/{registration_id}"
    
    payload = {
        "dateOfSurgery": "2026-03-20",
        "dateOfDischarge": "2026-03-22",
        "items": [
            {"name": "Stress Test Item", "amount": 100}
        ],
        "totalAmount": 100,
        "patientAmount": 100,
        "insuranceAmount": 0
    }
    
    # Run Write Test
    # Scenario: 50 requests, 10 concurrent users (Quick check)
    n = 50
    c = 10
    
    await run_write_stress_test(f"{base_url}{endpoint}", payload, n, c)

if __name__ == "__main__":
    asyncio.run(main())
