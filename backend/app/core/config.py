from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = ""
    gemini_api_key: str = ""
    gemini_model: str = "gemini-flash-latest"
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""
    internal_api_key: str = ""
    cors_origins: list[str] = [
        "http://localhost:3000",
        "https://skillforge.vercel.app",
    ]

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
