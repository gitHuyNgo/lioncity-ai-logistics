import asyncio
from app.database import db

async def check_users():
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(100)
    print(f"Total users found: {len(users)}")
    for u in users:
        print(f"- {u['email']} (Role: {u['role']})")

if __name__ == "__main__":
    asyncio.run(check_users())
