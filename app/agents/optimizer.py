"""Agent optimizer implementation"""
import logging
import re
from typing import Dict

from app.agents.strategies import OptimizationStrategy
from app.services.gemini_service import gemini_service
from app.services.hybrid_search import hybrid_search
from app.core.database import db

logger = logging.getLogger(__name__)


class AgentOptimizer:
    """Individual agent that applies an optimization strategy"""
    
    def __init__(self, agent_id: str, fork_id: str, strategy: OptimizationStrategy):
        self.agent_id = agent_id
        self.fork_id = fork_id
        self.strategy = strategy
    
    async def optimize(self, code: str, task_id: str) -> Dict:
        """
        Run optimization on isolated fork
        
        Args:
            code: Code to optimize
            task_id: Task ID for tracking
            
        Returns:
            Dict with optimization results
        """
        try:
            logger.info(f"🤖 Agent {self.agent_id} starting optimization with strategy: {self.strategy.name}")
            
            # 1. Search for relevant patterns using hybrid search
            logger.info(f"🔍 Agent {self.agent_id} searching for relevant patterns...")
            relevant_patterns = await hybrid_search(
                query_text=code[:500],  # Use first 500 chars for search
                category=self.strategy.category.value,
                limit=3
            )
            logger.info(f"📚 Agent {self.agent_id} found {len(relevant_patterns) if relevant_patterns else 0} relevant patterns")
            logger.info(f"📚 Agent {self.agent_id} found {len(relevant_patterns) if relevant_patterns else 0} relevant patterns")
            
            # 2. Build context from relevant patterns
            context = self._build_context(relevant_patterns)
            
            # 3. Create prompt with strategy template
            logger.info(f"💭 Agent {self.agent_id} building prompt...")
            prompt = self.strategy.prompt_template.format(code=code)
            
            # Add context if patterns found
            if context:
                prompt = f"Context - Similar optimization patterns:\n{context}\n\n{prompt}"
            
            # 4. Get optimization from Gemini
            logger.info(f"🤔 Agent {self.agent_id} calling Gemini API...")
            result = await gemini_service.optimize_code(prompt)
            logger.info(f"✨ Agent {self.agent_id} received Gemini response (type={type(result)})")
            # Defensive: if model returned a list, convert to dict
            if isinstance(result, list):
                logger.warning(f"Gemini returned a list for agent {self.agent_id}; converting to dict")
                if len(result) > 0 and isinstance(result[0], dict):
                    result = result[0]
                else:
                    # Wrap non-dict list into a predictable dict
                    result = {"optimized_code": str(result), "explanation": "Wrapped list result", "improvement": "0%"}
            
            # 5. Parse improvement percentage
            improvement = self._parse_improvement(
                result.get('improvement') or 
                result.get('complexity_improvement') or 
                result.get('memory_savings') or 
                result.get('concurrency_improvement') or
                "0%"
            )
            
            logger.info(f"📊 Agent {self.agent_id} parsed improvement: {improvement}%")
            
            # 6. Store result in database
            logger.info(f"💾 Agent {self.agent_id} storing result in database...")
            await db.execute("""
                INSERT INTO agent_results 
                (task_id, fork_id, agent_id, strategy, original_code, optimized_code, 
                 improvement_percent, status, completed_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, 'completed', NOW())
            """, task_id, self.fork_id, self.agent_id, self.strategy.name,
                code, result.get('optimized_code'), improvement)
            
            logger.info(f"✅ Agent {self.agent_id} completed successfully with {improvement}% improvement")
            
            return {
                "agent_id": self.agent_id,
                "strategy": self.strategy.name,
                "category": self.strategy.category.value,
                "optimized_code": result.get('optimized_code'),
                "explanation": result.get('explanation', ''),
                "improvement_percent": improvement,
                "status": "completed"
            }
            
        except Exception as e:
            logger.error(f"❌ Agent {self.agent_id} failed with error: {str(e)}", exc_info=True)
            
            # Store error in database
            try:
                await db.execute("""
                    INSERT INTO agent_results 
                    (task_id, fork_id, agent_id, strategy, original_code, 
                     error_message, status, completed_at)
                    VALUES ($1, $2, $3, $4, $5, $6, 'failed', NOW())
                """, task_id, self.fork_id, self.agent_id, self.strategy.name,
                    code, str(e))
                logger.info(f"💾 Agent {self.agent_id} error stored in database")
            except Exception as db_error:
                logger.error(f"❌ Agent {self.agent_id} failed to store error in database: {db_error}")
            
            return {
                "agent_id": self.agent_id,
                "strategy": self.strategy.name,
                "error": str(e),
                "status": "failed"
            }
    
    def _build_context(self, patterns: list) -> str:
        """Build context string from relevant patterns"""
        if not patterns:
            return ""
        
        context_parts = []
        for i, pattern in enumerate(patterns, 1):
            context_parts.append(
                f"{i}. {pattern.get('pattern_name', 'Unknown')}: "
                f"{pattern.get('description', '')}\n"
                f"   Example: {pattern.get('code_example', 'N/A')}"
            )
        
        return "\n".join(context_parts)
    
    def _parse_improvement(self, improvement_str: str) -> float:
        """
        Parse improvement percentage from various string formats
        
        Args:
            improvement_str: String like '40%', '2x faster', '50% reduction'
            
        Returns:
            Float percentage value
        """
        try:
            # Handle percentage format: "40%"
            if '%' in improvement_str:
                match = re.search(r'(\d+(?:\.\d+)?)', improvement_str)
                if match:
                    return float(match.group(1))
            
            # Handle multiplier format: "2x faster", "3.5x"
            if 'x' in improvement_str.lower():
                match = re.search(r'(\d+(?:\.\d+)?)\s*x', improvement_str.lower())
                if match:
                    # Convert multiplier to percentage (2x = 100%, 3x = 200%)
                    return (float(match.group(1)) - 1) * 100
            
            # Handle "O(n²) to O(n)" complexity improvements
            if 'o(' in improvement_str.lower():
                # Assign standard improvement values for complexity reductions
                if 'n²' in improvement_str.lower() or 'n^2' in improvement_str.lower():
                    if 'n log n' in improvement_str.lower():
                        return 50.0  # Quadratic to linearithmic
                    elif 'o(n)' in improvement_str.lower():
                        return 75.0  # Quadratic to linear
                
            # Default to 0 if no improvement detected
            return 0.0
            
        except Exception as e:
            logger.warning(f"Failed to parse improvement '{improvement_str}': {e}")
            return 0.0
