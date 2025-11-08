"""Optimization API endpoints"""
from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel, Field
import uuid
import asyncio
import logging
from typing import Optional

from app.config import settings
from app.agents.strategies import STRATEGIES
from app.agents.optimizer import AgentOptimizer
from app.services.fork_manager import ForkManager
from app.core.database import db
from app.main import manager

logger = logging.getLogger(__name__)

router = APIRouter()


class OptimizationRequest(BaseModel):
    """Request model for optimization"""
    code: str = Field(..., description="Code to optimize")
    language: str = Field(..., description="Programming language (sql, python, etc.)")
    num_agents: int = Field(
        default=50, 
        ge=1, 
        le=100, 
        description="Number of parallel agents to use"
    )


class OptimizationResponse(BaseModel):
    """Response model for optimization request"""
    task_id: str
    status: str
    num_agents: int
    websocket_url: str
    message: str


@router.post("/optimize", response_model=OptimizationResponse)
async def optimize_code(req: OptimizationRequest, bg_tasks: BackgroundTasks):
    """
    Start code optimization with multiple parallel agents
    
    Args:
        req: Optimization request with code and parameters
        bg_tasks: Background tasks handler
        
    Returns:
        Task information including WebSocket URL for real-time updates
    """
    task_id = str(uuid.uuid4())
    
    logger.info(f"New optimization task: {task_id} with {req.num_agents} agents")
    
    try:
        # Create task record in database
        await db.execute("""
            INSERT INTO optimization_tasks (id, original_code, language, num_agents, status)
            VALUES ($1, $2, $3, $4, 'pending')
        """, task_id, req.code, req.language, req.num_agents)
        
        # Start optimization in background
        bg_tasks.add_task(
            run_optimization, 
            task_id, 
            req.code, 
            req.language, 
            req.num_agents
        )
        
        return OptimizationResponse(
            task_id=task_id,
            status="pending",
            num_agents=req.num_agents,
            websocket_url=f"/ws/{task_id}",
            message=f"Optimization started with {req.num_agents} agents. Connect to WebSocket for real-time updates."
        )
        
    except Exception as e:
        logger.error(f"Failed to create optimization task: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/task/{task_id}")
async def get_task_status(task_id: str):
    """
    Get status and results of an optimization task
    
    Args:
        task_id: Task UUID
        
    Returns:
        Task details with results
    """
    try:
        # Get task info
        task = await db.fetchrow(
            "SELECT * FROM optimization_tasks WHERE id = $1", 
            task_id
        )
        
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        
        # Get agent results
        results = await db.fetch(
            """SELECT agent_id, strategy, improvement_percent, status, error_message
               FROM agent_results 
               WHERE task_id = $1 
               ORDER BY improvement_percent DESC NULLS LAST""",
            task_id
        )
        
        # Find best result
        best_result = None
        if results:
            for result in results:
                if result['improvement_percent'] and result['improvement_percent'] > 0:
                    best_result_full = await db.fetchrow(
                        """SELECT * FROM agent_results 
                           WHERE task_id = $1 AND agent_id = $2""",
                        task_id, result['agent_id']
                    )
                    best_result = dict(best_result_full)
                    break
        
        return {
            "task_id": task_id,
            "status": task['status'],
            "language": task['language'],
            "num_agents": task['num_agents'],
            "created_at": task['created_at'].isoformat() if task['created_at'] else None,
            "completed_at": task['completed_at'].isoformat() if task['completed_at'] else None,
            "agent_results": [dict(r) for r in results],
            "best_result": best_result
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching task status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


async def run_optimization(task_id: str, code: str, language: str, num_agents: int):
    """
    Background task to run optimization with multiple agents
    
    Args:
        task_id: Task UUID
        code: Code to optimize
        language: Programming language
        num_agents: Number of agents to use
    """
    try:
        logger.info(f"Starting optimization task {task_id}")
        
        # Update task status
        await db.execute(
            "UPDATE optimization_tasks SET status = 'running' WHERE id = $1",
            task_id
        )
        
        # Broadcast start message
        await manager.broadcast(task_id, {
            "type": "task_started",
            "task_id": task_id,
            "num_agents": num_agents
        })
        
        # Create fork manager
        fork_manager = ForkManager(settings.tiger_service_name)
        
        # Create parallel forks (this takes 2-3 seconds per fork, but runs in parallel)
        logger.info(f"Creating {num_agents} forks...")
        fork_ids = await fork_manager.create_parallel_forks(num_agents)
        
        if not fork_ids:
            raise Exception("Failed to create any forks")
        
        # Broadcast forks created
        await manager.broadcast(task_id, {
            "type": "forks_created",
            "count": len(fork_ids),
            "requested": num_agents
        })
        
        # Create agents with different strategies (cycle through available strategies)
        agents = []
        for i, fork_id in enumerate(fork_ids):
            strategy = STRATEGIES[i % len(STRATEGIES)]
            agent = AgentOptimizer(f"agent-{i}", fork_id, strategy)
            agents.append(agent)
        
        logger.info(f"Starting {len(agents)} agents...")
        
        # Run all agents in parallel
        results = await asyncio.gather(
            *[agent.optimize(code, task_id) for agent in agents],
            return_exceptions=True
        )
        
        # Process and broadcast results
        successful_results = []
        for result in results:
            if isinstance(result, Exception):
                logger.error(f"Agent failed with exception: {result}")
                continue
            
            successful_results.append(result)
            
            # Broadcast individual agent completion
            await manager.broadcast(task_id, {
                "type": "agent_completed",
                "data": result
            })
        
        # Find best result
        best_result = None
        best_improvement = -1
        
        for result in successful_results:
            if result.get('status') == 'completed':
                improvement = result.get('improvement_percent', 0)
                if improvement > best_improvement:
                    best_improvement = improvement
                    best_result = result
        
        # Update task with best result
        if best_result:
            best_result_id = await db.fetchval(
                """SELECT id FROM agent_results 
                   WHERE task_id = $1 AND agent_id = $2""",
                task_id, best_result['agent_id']
            )
            
            await db.execute(
                """UPDATE optimization_tasks 
                   SET status = 'completed', best_result_id = $2, completed_at = NOW()
                   WHERE id = $1""",
                task_id, best_result_id
            )
        else:
            await db.execute(
                "UPDATE optimization_tasks SET status = 'completed', completed_at = NOW() WHERE id = $1",
                task_id
            )
        
        # Broadcast completion
        await manager.broadcast(task_id, {
            "type": "complete",
            "task_id": task_id,
            "total_agents": len(agents),
            "successful_agents": len(successful_results),
            "best_result": best_result
        })
        
        logger.info(f"✅ Optimization task {task_id} completed. Best improvement: {best_improvement}%")
        
        # Cleanup forks
        logger.info(f"Cleaning up {len(fork_ids)} forks...")
        await fork_manager.cleanup_forks(fork_ids)
        
    except Exception as e:
        logger.error(f"❌ Optimization task {task_id} failed: {e}")
        
        # Update task status
        await db.execute(
            "UPDATE optimization_tasks SET status = 'failed', completed_at = NOW() WHERE id = $1",
            task_id
        )
        
        # Broadcast error
        await manager.broadcast(task_id, {
            "type": "error",
            "task_id": task_id,
            "error": str(e)
        })
