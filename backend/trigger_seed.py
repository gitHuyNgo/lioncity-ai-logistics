import asyncio
from app.seed import seed_demo

async def run_seed():
    print("Seeding database...")
    result = await seed_demo()
    print(f"Seed result: {result}")

if __name__ == "__main__":
    asyncio.run(run_seed())
