import uvicorn
from app.core.config import settings

print(">>> run.py executing")
if __name__ == "__main__":
    print(f"Starting {settings.APP_NAME} on {settings.HOST}:{settings.PORT}")
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG
    )