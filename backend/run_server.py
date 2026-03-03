#!/usr/bin/env python
import sys
import os

# Add backend directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

if __name__ == "__main__":
    import uvicorn
    # Using port 8008 to avoid conflicts with 8000 (Windows System process)
    # Using workers=4 for concurrency testing
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8008,
        workers=4,
        log_level="warning",
        access_log=False
    )
