"""Tiger database fork manager - Supports both Free and Paid Tiers"""
import asyncio
import logging
from typing import List, Dict
import os

logger = logging.getLogger(__name__)


class ForkManager:
    """Manages database forks for parallel agent execution"""
    
    def __init__(self, base_service: str, use_virtual_forks: bool = None):
        self.base_service = base_service
        self.forks: Dict[str, str] = {}
        
        # Auto-detect tier or use explicit setting
        if use_virtual_forks is None:
            # Check environment variable or default to True (free tier)
            self.use_virtual_forks = os.getenv("TIGER_USE_VIRTUAL_FORKS", "true").lower() == "true"
        else:
            self.use_virtual_forks = use_virtual_forks
        
        if self.use_virtual_forks:
            logger.warning(f"⚠️ Running on free tier - virtual forks enabled. All agents will use main database: {base_service}")
        else:
            logger.info(f"✅ Running on paid tier - real forks enabled for service: {base_service}")
    
    async def create_fork(self, agent_id: str) -> str:
        """
        Create a database fork (virtual on free tier, real on paid tier)
        
        Args:
            agent_id: Unique identifier for the agent
            
        Returns:
            Fork name/ID
        """
        if self.use_virtual_forks:
            # Free tier: Virtual fork (instant)
            fork_name = f"main-{agent_id}"
            self.forks[fork_name] = agent_id
            logger.info(f"✅ Agent {agent_id} assigned to main database (virtual fork)")
            return fork_name
        else:
            # Paid tier: Real Tiger fork
            fork_name = f"agent-{agent_id}"
            
            try:
                proc = await asyncio.create_subprocess_shell(
                    f"tiger service fork {self.base_service} --last-snapshot --name {fork_name}",
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE
                )
                
                stdout, stderr = await proc.communicate()
                
                if proc.returncode != 0:
                    error_msg = stderr.decode().strip()
                    logger.error(f"Fork creation failed for {fork_name}: {error_msg}")
                    raise Exception(f"Fork failed: {error_msg}")
                
                self.forks[fork_name] = agent_id
                logger.info(f"✅ Real fork created: {fork_name}")
                return fork_name
                
            except Exception as e:
                logger.error(f"Error creating fork {fork_name}: {e}")
                raise
    
    async def create_parallel_forks(self, num_agents: int) -> List[str]:
        """
        Create multiple forks in parallel (virtual or real based on tier)
        
        Args:
            num_agents: Number of forks to create
            
        Returns:
            List of successfully created fork names
        """
        if self.use_virtual_forks:
            # Free tier: Create virtual forks instantly
            logger.info(f"⚠️ Free tier: Creating {num_agents} virtual forks (all use main DB)")
            successful_forks = []
            for i in range(num_agents):
                fork_name = await self.create_fork(str(i))
                successful_forks.append(fork_name)
            logger.info(f"✅ Created {len(successful_forks)} virtual forks successfully")
            return successful_forks
        else:
            # Paid tier: Create real forks in parallel
            logger.info(f"Creating {num_agents} real parallel forks...")
            
            # Create tasks for parallel fork creation
            tasks = [self.create_fork(str(i)) for i in range(num_agents)]
            
            # Execute all fork creations in parallel
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Filter out exceptions and get successful forks
            successful_forks = [
                result for result in results 
                if not isinstance(result, Exception)
            ]
            
            failed_count = num_agents - len(successful_forks)
            if failed_count > 0:
                logger.warning(f"⚠️ {failed_count} forks failed to create")
            
            logger.info(f"✅ Created {len(successful_forks)}/{num_agents} real forks successfully")
            return successful_forks
    
    async def delete_fork(self, fork_id: str):
        """
        Delete a fork (no-op on free tier, real delete on paid tier)
        
        Args:
            fork_id: Fork name/ID to delete
        """
        if self.use_virtual_forks:
            # Free tier: Just remove from tracking
            if fork_id in self.forks:
                del self.forks[fork_id]
            logger.info(f"🗑️ Removed virtual fork: {fork_id}")
        else:
            # Paid tier: Delete real fork
            try:
                proc = await asyncio.create_subprocess_shell(
                    f"tiger service delete {fork_id} --force",
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE
                )
                
                await proc.communicate()
                
                if fork_id in self.forks:
                    del self.forks[fork_id]
                
                logger.info(f"🗑️ Deleted real fork: {fork_id}")
                
            except Exception as e:
                logger.error(f"Error deleting fork {fork_id}: {e}")
    
    async def cleanup_forks(self, fork_ids: List[str]):
        """
        Cleanup forks (no-op on free tier, real cleanup on paid tier)
        
        Args:
            fork_ids: List of fork names/IDs to delete
        """
        if not fork_ids:
            return
        
        logger.info(f"🧹 Cleaning up {len(fork_ids)} forks...")
        
        if self.use_virtual_forks:
            # Free tier: Just remove from tracking
            for fork_id in fork_ids:
                await self.delete_fork(fork_id)
        else:
            # Paid tier: Delete real forks in parallel
            tasks = [self.delete_fork(fork_id) for fork_id in fork_ids]
            await asyncio.gather(*tasks, return_exceptions=True)
        
        logger.info("✅ Fork cleanup complete")
    
