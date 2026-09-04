from abc import ABC, abstractmethod
from typing import Dict, Any

class BaseConnector(ABC):
    def __init__(self, connection: Dict[str, Any]):
        self.connection = connection
        self.platform = connection.get("platform")
        self.account_id = connection.get("accountId")

    @abstractmethod
    def capabilities(self) -> Dict[str, bool]:
        pass

    @abstractmethod
    async def publish_text(self, content: Dict[str, Any]) -> Dict[str, Any]:
        pass

    @abstractmethod
    async def publish_media(self, content: Dict[str, Any]) -> Dict[str, Any]:
        pass

    @abstractmethod
    async def get_metrics(self, content_id: str) -> Dict[str, Any]:
        pass

    def _encrypt_tokens(self, tokens: Dict[str, Any]) -> str:
        # Placeholder for encryption
        return "encrypted"
