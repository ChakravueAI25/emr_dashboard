import time
import asyncio
from functools import wraps

class AsyncTTL:
    def __init__(self, time_to_live=60, max_size=1024):
        self.time_to_live = time_to_live
        self.max_size = max_size
        self.cache = {}

    def __call__(self, func):
        @wraps(func)
        async def wrapped(*args, **kwargs):
            # Create immutable key from args and kwargs
            # tuple() is sufficient for hashable args. 
            # If args are unhashable (lists/dicts), this simple cache won't work perfectly, 
            # but FastAPI endpoints typically take primitives.
            try:
                key = (args, tuple(sorted(kwargs.items())))
            except TypeError:
                # If args are not hashable, skip cache
                return await func(*args, **kwargs)
            
            now = time.time()

            if key in self.cache:
                value, timestamp = self.cache[key]
                if now - timestamp < self.time_to_live:
                    return value
                else:
                    del self.cache[key]

            if len(self.cache) >= self.max_size:
                # simple eviction: remove oldest entry
                oldest_key = min(self.cache, key=lambda k: self.cache[k][1])
                del self.cache[oldest_key]

            value = await func(*args, **kwargs)
            self.cache[key] = (value, now)
            return value

        # Expose cache/clear method on the wrapper function
        wrapped.cache_clear = self.clear
        return wrapped

    def clear(self):
        self.cache = {}
