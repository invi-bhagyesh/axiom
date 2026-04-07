from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DB_HOST: str = "localhost"
    DB_PORT: int = 3306
    DB_USER: str = "axiom_user"
    DB_PASSWORD: str = "axiom_pass"
    DB_NAME: str = "axiom"
    JWT_SECRET: str = "axiom-dev-secret-change-in-prod"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_HOURS: int = 24
    CLAUDE_API_KEY: str = ""

    class Config:
        env_file = ".env"


settings = Settings()
