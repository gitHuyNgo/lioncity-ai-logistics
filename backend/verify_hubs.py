import asyncio
from app.database import db

async def verify():
    hubs = await db.hubs.find({}, {"name": 1}).to_list(100)
    print(f"Backend sees {len(hubs)} hubs:")
    for h in hubs:
        print(f"- {h['name']}")

if __name__ == "__main__":
    asyncio.run(verify())
