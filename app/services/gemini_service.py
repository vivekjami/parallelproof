"""Google Gemini API service"""
from google import genai
from google.genai import types
import logging
import json
import re

from app.config import settings

logger = logging.getLogger(__name__)


class GeminiService:
    """Service for interacting with Google Gemini API"""
    
    def __init__(self):
        self.client = genai.Client(api_key=settings.gemini_api_key)
        self.model = settings.gemini_model
        self.embedding_model = settings.gemini_embedding_model
    
    async def optimize_code(self, prompt: str) -> dict:
        """
        Send optimization request to Gemini
        
        Args:
            prompt: The optimization prompt with code
            
        Returns:
            dict with optimized_code, explanation, and improvement
        """
        try:
            response = self.client.models.generate_content(
                model=self.model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.7,
                    max_output_tokens=4096,
                    response_mime_type="application/json"
                )
            )
            
            # Extract text from response
            text = response.text.strip()
            
            # Clean up any markdown code blocks if present
            text = re.sub(r'```json\s*', '', text)
            text = re.sub(r'```\s*', '', text)
            text = text.strip()
            
            # Parse JSON
            parsed = json.loads(text)

            # Some prompts may produce a JSON array; prefer the first dict element
            if isinstance(parsed, list):
                if len(parsed) == 0:
                    logger.warning("Gemini returned empty list for optimization result")
                    return {"optimized_code": None, "explanation": "Empty result", "improvement": "0%"}
                first = parsed[0]
                if isinstance(first, dict):
                    logger.info("✅ Gemini optimization returned a list; using first element")
                    return first
                else:
                    logger.warning("Gemini returned a list but first element is not a dict; returning wrapped result")
                    return {"optimized_code": str(first), "explanation": "Non-dict list item returned", "improvement": "0%"}

            if isinstance(parsed, dict):
                logger.info(f"✅ Gemini optimization successful")
                return parsed

            # Fallback: unexpected type
            logger.warning(f"Gemini returned unexpected type: {type(parsed)}; wrapping result")
            return {"optimized_code": str(parsed), "explanation": "Unexpected response type", "improvement": "0%"}
            
        except json.JSONDecodeError as e:
            logger.error(f"JSON decode error: {e}")
            logger.error(f"Response text: {text[:500]}")
            return {
                "optimized_code": None,
                "explanation": f"Failed to parse Gemini response: {str(e)}",
                "improvement": "0%"
            }
        except Exception as e:
            logger.error(f"Gemini API error: {e}")
            return {
                "optimized_code": None,
                "explanation": f"Gemini API error: {str(e)}",
                "improvement": "0%"
            }
    
    async def generate_embedding(self, text: str) -> list:
        """
        Generate embedding for semantic search
        
        Args:
            text: Text to generate embedding for
            
        Returns:
            List of floats representing the embedding vector
        """
        try:
            response = self.client.models.embed_content(
                model=self.embedding_model,
                contents=text
            )
            
            # Extract embedding from response
            # The response has a 'values' attribute containing the embedding
            if hasattr(response, 'embeddings') and response.embeddings:
                embedding = response.embeddings[0].values
            elif hasattr(response, 'embedding'):
                embedding = response.embedding
            else:
                # Fallback: try to get values directly
                embedding = response.values if hasattr(response, 'values') else None
            
            if embedding:
                logger.debug(f"✅ Generated embedding for text (length: {len(text)}, dims: {len(embedding)})")
                return embedding
            else:
                logger.error(f"No embedding found in response: {response}")
                return None
            
        except Exception as e:
            logger.error(f"Embedding error: {e}")
            return None


# Global Gemini service instance
gemini_service = GeminiService()
