from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = ""
    gemini_api_key: str = ""
    supabase_url: str = ""
    supabase_service_role_key: str = ""
    cors_origins: list[str] = [
        "http://localhost:3000",
        "https://skillforge.vercel.app",
    ]

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
