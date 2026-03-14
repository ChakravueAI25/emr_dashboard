import asyncio
import time
import httpx
import argparse
import statistics
from urllib.parse import urlparse

async def run_stress_test(url, total_requests, concurrency):
    print(f"\n--- Testing {url} ---")
    print(f"Simulating {total_requests} requests with {concurrency} concurrent users...")

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
                    response = await client.get(url)
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
    print(f"\nResults for {urlparse(url).path}:")
    print(f"Total Time:             {total_time:.2f} seconds")
    print(f"Requests per second:    {successful_requests / total_time:.2f} [#/sec]")
    if latencies:
        print(f"Time per request (avg): {statistics.mean(latencies):.2f} ms")
        print(f"Time per request (min): {min(latencies):.2f} ms")
        print(f"Time per request (max): {max(latencies):.2f} ms")
        print(f"P95 latency:            {sorted(latencies)[int(len(latencies)*0.95)]:.2f} ms")
    print(f"Failed requests:        {failed_requests}")

async def main():
    endpoints = [
        "/api/billing/dashboard/stats",
        "/api/billing/analytics",
        "/api/finance/summary",
        "/api/finance/cash-flow"
    ]
    base_url = "http://127.0.0.1:8008"
    
    # 1. Warm-up
    print("Warming up...")
    async with httpx.AsyncClient() as client:
        for ep in endpoints:
            try:
                await client.get(f"{base_url}{ep}")
            except:
                pass

    # 2. Run Tests
    # Scenario: 200 requests, 40 concurrent users (Real Hospital Simulation)
    n = 200
    c = 40
    
    for ep in endpoints:
        await run_stress_test(f"{base_url}{ep}", n, c)

if __name__ == "__main__":
    asyncio.run(main())
