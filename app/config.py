from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List
import json


class Settings(BaseSettings):
    # Tiger Database
    tiger_service_name: str
    tiger_database_url: str
    
    # Google Gemini API
    gemini_api_key: str
    gemini_model: str = "gemini-2.0-flash-exp"
    gemini_embedding_model: str = "gemini-embedding-001"
    
    # Application Settings
    env: str = "development"
    log_level: str = "INFO"
    debug: bool = False
    
    # CORS
    allowed_origins: str = '["http://localhost:3000","http://localhost:5173"]'
    
    # Fork Configuration
    tiger_use_virtual_forks: bool = True  # Free tier uses virtual forks
    max_concurrent_forks: int = 100
    fork_timeout_seconds: int = 300
    fork_cleanup_enabled: bool = True
    
    # Agent Configuration
    default_num_agents: int = 50
    agent_timeout_seconds: int = 180
    
    # Redis (optional)
    redis_url: str = "redis://localhost:6379"
    redis_enabled: bool = False
    
    # Rate Limiting (optional)
    rate_limit_enabled: bool = False
    rate_limit_per_minute: int = 60
    
    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=False,
        extra="ignore"
    )
    
    @property
    def allowed_origins_list(self) -> List[str]:
        """Parse allowed_origins from JSON string to list"""
        try:
            return json.loads(self.allowed_origins)
        except:
            return ["http://localhost:3000", "http://localhost:5173"]


settings = Settings()
