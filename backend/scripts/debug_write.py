import httpx
import asyncio

async def debug_write():
    registration_id = "REG-2026-557939"
    url = f"http://127.0.0.1:8008/api/billing/invoices/{registration_id}"
    payload = {
        "dateOfSurgery": "2026-03-20",
        "dateOfDischarge": "2026-03-22",
        "items": [
            {"name": "Debug Write Item", "amount": 100}
        ],
        "totalAmount": 100
    }
    
    print(f"Sending POST to {url}")
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(url, json=payload)
            print(f"Status Code: {resp.status_code}")
            print(f"Response: {resp.text}")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(debug_write())
