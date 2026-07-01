import hashlib
import hmac
from typing import Any, Dict, Optional


class WebhookService:
    def __init__(self, secret: Optional[str] = None) -> None:
        self.secret = secret

    def sign(self, payload: bytes) -> str:
        if not self.secret:
            return ""
        return hmac.new(self.secret.encode("utf-8"), payload, hashlib.sha256).hexdigest()

    def verify_signature(self, payload: bytes, signature: str) -> bool:
        if not self.secret:
            return True
        expected = self.sign(payload)
        return hmac.compare_digest(expected, signature)
