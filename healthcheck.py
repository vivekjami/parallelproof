"""Quick health check for ParallelProof stack"""
import asyncio
import httpx

async def check_health():
    print("🔍 Checking ParallelProof Health...\n")
    
    # Check backend
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get("http://localhost:8000/health", timeout=5.0)
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Backend: HEALTHY")
                print(f"   Status: {data.get('status')}")
                print(f"   Database: {data.get('database')}")
            else:
                print(f"❌ Backend: ERROR (Status {response.status_code})")
    except Exception as e:
        print(f"❌ Backend: NOT RUNNING ({str(e)})")
    
    print()
    
    # Check frontend
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get("http://localhost:5173", timeout=5.0)
            if response.status_code == 200:
                print(f"✅ Frontend: RUNNING")
                print(f"   URL: http://localhost:5173")
            else:
                print(f"⚠️  Frontend: Status {response.status_code}")
    except Exception as e:
        print(f"❌ Frontend: NOT RUNNING ({str(e)})")
    
    print("\n" + "="*50)
    print("Next Steps:")
    print("1. Open http://localhost:5173 in your browser")
    print("2. Try optimizing code with 5-10 agents")
    print("3. Watch real-time WebSocket updates!")
    print("="*50)

if __name__ == "__main__":
    asyncio.run(check_health())
