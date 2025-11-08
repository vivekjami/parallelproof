"""Tiger database fork manager"""
import asyncio
import subprocess
import logging
from typing import List, Dict

logger = logging.getLogger(__name__)


class ForkManager:
    """Manages Tiger database forks for parallel agent execution"""
    
    def __init__(self, base_service: str):
        self.base_service = base_service
        self.forks: Dict[str, str] = {}  # fork_name -> agent_id
    
    async def create_fork(self, agent_id: str) -> str:
        """
        Create a single Tiger fork
        
        Args:
            agent_id: Unique identifier for the agent
            
        Returns:
            Fork name/ID
        """
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
            logger.info(f"✅ Fork created: {fork_name}")
            return fork_name
            
        except Exception as e:
            logger.error(f"Error creating fork {fork_name}: {e}")
            raise
    
    async def create_parallel_forks(self, num_agents: int) -> List[str]:
        """
        Create multiple forks in parallel
        
        Args:
            num_agents: Number of forks to create
            
        Returns:
            List of successfully created fork names
        """
        logger.info(f"Creating {num_agents} parallel forks...")
        
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
        
        logger.info(f"✅ Created {len(successful_forks)}/{num_agents} forks successfully")
        return successful_forks
    
    async def delete_fork(self, fork_id: str):
        """
        Delete a single fork
        
        Args:
            fork_id: Fork name/ID to delete
        """
        try:
            proc = await asyncio.create_subprocess_shell(
                f"tiger service delete {fork_id} --force",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            await proc.communicate()
            
            if fork_id in self.forks:
                del self.forks[fork_id]
            
            logger.info(f"🗑️ Deleted fork: {fork_id}")
            
        except Exception as e:
            logger.error(f"Error deleting fork {fork_id}: {e}")
    
    async def cleanup_forks(self, fork_ids: List[str]):
        """
        Delete multiple forks in parallel
        
        Args:
            fork_ids: List of fork names/IDs to delete
        """
        if not fork_ids:
            return
        
        logger.info(f"Cleaning up {len(fork_ids)} forks...")
        
        tasks = [self.delete_fork(fork_id) for fork_id in fork_ids]
        await asyncio.gather(*tasks, return_exceptions=True)
        
        logger.info("✅ Fork cleanup complete")
