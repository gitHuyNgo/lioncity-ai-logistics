import asyncio
from app.database import db
from app.models.user import User
from app.services.auth import hash_password

async def seed_users_only():
    print("Seeding users into restored database...")
    # Find some reference IDs to maintain consistency if possible, 
    # but for demo, just getting the first ones found in the restored DB.
    hm = await db.hub_managers.find_one({}, {"id": 1})
    dr = await db.drivers.find_one({}, {"id": 1})
    
    hm_id = hm["id"] if hm else None
    dr_id = dr["id"] if dr else None

    users_to_seed = [
        User(
            email="superadmin1234@gmail.com",
            password_hash=hash_password("huy1234@"),
            role="super_admin",
            full_name="Nghia Nguyen Quang"
        ),
        User(
            email="manager1234@gmail.com",
            password_hash=hash_password("huy1234@"),
            role="hub_manager",
            full_name="Huy Ngo Gia",
            reference_id=hm_id
        ),
        User(
            email="shipper1234@gmail.com",
            password_hash=hash_password("huy1234@"),
            role="shipper",
            full_name="Huy Pham Nguyen Gia",
            reference_id=dr_id
        )
    ]
    
    await db.users.delete_many({}) # Just in case
    for user in users_to_seed:
        await db.users.insert_one(user.model_dump())
    
    print("Users seeded successfully.")

if __name__ == "__main__":
    asyncio.run(seed_users_only())
