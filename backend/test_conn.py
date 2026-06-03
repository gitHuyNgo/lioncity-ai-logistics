import asyncio
import motor.motor_asyncio

async def test_connection():
    client = motor.motor_asyncio.AsyncIOMotorClient('mongodb://localhost:27017')
    dbs = await client.list_database_names()
    print(f"Databases on localhost:27017: {dbs}")
    
    db = client['lioncity']
    collections = await db.list_collection_names()
    print(f"Collections in 'lioncity': {collections}")
    
    if 'hubs' in collections:
        count = await db.hubs.count_documents({})
        print(f"Hubs count: {count}")
        hubs = await db.hubs.find({}, {"name": 1}).to_list(10)
        for h in hubs:
            print(f"- {h['name']}")

if __name__ == "__main__":
    asyncio.run(test_connection())
