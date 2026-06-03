import asyncio
from app.database import db

async def check_mappings():
    users = await db.users.find().to_list(10)
    print("\n--- Current User Access Mappings ---")
    for u in users:
        print(f"Email: {u['email']}")
        print(f"  Role: {u['role']}")
        print(f"  Reference ID: {u.get('reference_id')}")
        
        if u['role'] == 'hub_manager' and u.get('reference_id'):
            hm = await db.hub_managers.find_one({"id": u['reference_id']})
            if hm:
                print(f"  Manages Hub: {hm.get('hub_name')} (ID: {hm.get('hub_id')})")
        
        if u['role'] == 'shipper' and u.get('reference_id'):
            dr = await db.drivers.find_one({"id": u['reference_id']})
            if dr:
                print(f"  Driver Name: {dr.get('name')}")
                print(f"  Assigned Hub Manager ID: {dr.get('hub_manager_id')}")

if __name__ == "__main__":
    asyncio.run(check_mappings())
