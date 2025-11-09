"""Test Gemini API connectivity"""
import asyncio
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.services.gemini_service import gemini_service
from app.config import settings

async def test_gemini():
    print("=" * 60)
    print("Testing Gemini API Connectivity")
    print("=" * 60)
    
    print(f"\n1. Configuration:")
    print(f"   API Key: {settings.gemini_api_key[:10]}...{settings.gemini_api_key[-4:]}")
    print(f"   Model: {settings.gemini_model}")
    print(f"   Embedding Model: {settings.gemini_embedding_model}")
    
    print(f"\n2. Testing code optimization...")
    test_prompt = """
Optimize this SQL query:

SELECT * FROM users WHERE id = 123;

Return JSON: {"optimized_code": "...", "explanation": "...", "improvement": "..."}
"""
    
    try:
        result = await gemini_service.optimize_code(test_prompt)
        print(f"   ✅ Success!")
        print(f"   Response: {result}")
    except Exception as e:
        print(f"   ❌ Failed: {e}")
        return False
    
    print(f"\n3. Testing embedding generation...")
    try:
        # Test direct API call to inspect response structure
        from google import genai
        client = genai.Client(api_key=settings.gemini_api_key)
        
        response = client.models.embed_content(
            model=settings.gemini_embedding_model,
            contents="Test text for embedding"
        )
        
        print(f"   Response type: {type(response)}")
        print(f"   Response attributes: {dir(response)}")
        print(f"   Response: {response}")
        
        # Now test through service
        embedding = await gemini_service.generate_embedding("Test text for embedding")
        if embedding:
            print(f"   ✅ Success! Embedding length: {len(embedding)}")
        else:
            print(f"   ❌ Failed: No embedding returned")
            return False
    except Exception as e:
        print(f"   ❌ Failed: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    print(f"\n{'=' * 60}")
    print("All tests passed! ✅")
    print("=" * 60)
    return True

if __name__ == "__main__":
    success = asyncio.run(test_gemini())
    sys.exit(0 if success else 1)
