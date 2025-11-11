from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging
from typing import Dict, List

from app.config import settings
from app.core.database import db

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.log_level),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class ConnectionManager:
    """Manage WebSocket connections for real-time updates"""
    
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}
    
    async def connect(self, websocket: WebSocket, task_id: str):
        """Accept and register a WebSocket connection"""
        await websocket.accept()
        if task_id not in self.active_connections:
            self.active_connections[task_id] = []
        self.active_connections[task_id].append(websocket)
        logger.info(f"WebSocket connected for task: {task_id}")
    
    def disconnect(self, websocket: WebSocket, task_id: str):
        """Remove a WebSocket connection"""
        if task_id in self.active_connections:
            self.active_connections[task_id].remove(websocket)
            if not self.active_connections[task_id]:
                del self.active_connections[task_id]
    
    async def broadcast(self, task_id: str, message: dict):
        """Send message to all connections for a task"""
        if task_id in self.active_connections:
            disconnected = []
            for websocket in self.active_connections[task_id]:
                try:
                    await websocket.send_json(message)
                except Exception as e:
                    logger.warning(f"Failed to send message: {e}")
                    disconnected.append(websocket)
            
            # Clean up disconnected clients
            for ws in disconnected:
                self.disconnect(ws, task_id)


# Global WebSocket manager
manager = ConnectionManager()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    # Startup
    logger.info("🚀 Starting ParallelProof...")
    logger.info(f"Environment: {settings.env}")
    logger.info(f"Debug mode: {settings.debug}")
    
    try:
        await db.connect(settings.tiger_database_url)
        logger.info("Database connection established")
    except Exception as e:
        logger.error(f"Failed to connect to database: {e}")
        raise
    
    yield
    
    # Shutdown
    logger.info("Shutting down ParallelProof...")
    await db.disconnect()


# Create FastAPI app
app = FastAPI(
    title="ParallelProof",
    description="Multi-agent code optimizer with Tiger Agentic Postgres and Google Gemini",
    version="0.1.0",
    lifespan=lifespan,
    debug=settings.debug
)

# Add CORS middleware
# Allow all localhost origins during development
cors_origins = settings.allowed_origins_list if settings.env == "production" else ["http://localhost:3000", "http://localhost:5173", "http://localhost:5174", "http://127.0.0.1:3000", "http://127.0.0.1:5173", "http://127.0.0.1:5174"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)


@app.websocket("/ws/{task_id}")
async def websocket_endpoint(websocket: WebSocket, task_id: str):
    """WebSocket endpoint for real-time agent updates"""
    await manager.connect(websocket, task_id)
    try:
        while True:
            # Keep connection alive and receive any client messages
            data = await websocket.receive_text()
            logger.debug(f"Received from client: {data}")
    except WebSocketDisconnect:
        manager.disconnect(websocket, task_id)
        logger.info(f"WebSocket disconnected for task: {task_id}")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(websocket, task_id)


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "parallelproof",
        "environment": settings.env,
        "database": "connected" if db.pool else "disconnected"
    }


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "ParallelProof API",
        "version": "0.1.0",
        "docs": "/docs"
    }


# Include API routers
from app.api.optimization import router as optimization_router
app.include_router(optimization_router, prefix="/api/v1", tags=["optimization"])
