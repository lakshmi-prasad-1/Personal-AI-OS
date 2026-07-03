import time
import logging
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger("ai_brain_telemetry")
logger.setLevel(logging.INFO)

# In production, route to ELK or Datadog
handler = logging.StreamHandler()
formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
handler.setFormatter(formatter)
logger.addHandler(handler)

class TelemetryMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        
        response = await call_next(request)
        
        process_time = (time.time() - start_time) * 1000.0 # ms
        logger.info(f"Path: {request.url.path} | Method: {request.method} | Status: {response.status_code} | Latency: {process_time:.2f}ms")
        
        response.headers["X-Process-Time"] = str(process_time)
        return response
