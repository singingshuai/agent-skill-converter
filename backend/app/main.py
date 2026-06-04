from fastapi import FastAPI
from .api.routes import router

app = FastAPI(title="Agent Skill Converter", version="1.0.0")
app.include_router(router, prefix="/api")


@app.get("/")
async def root():
    return {"message": "Agent Skill Converter API"}
