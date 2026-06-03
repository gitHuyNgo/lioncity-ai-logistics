import asyncio
import bson
import os
import random
from typing import Any, Dict, List

from app.database import db
from app.models.user import User
from app.services.auth import hash_password
from app.utils import now_iso

BACKUP_DIR = "mongo_backup/mongodump/test_database"
COLLECTIONS = ("hubs", "hub_managers", "drivers", "vehicles", "zones", "orders", "clusters", "routes")

async def seed_demo() -> Dict[str, Any]:
    """Wipe and repopulate the database using BSON files from backup."""
    results = {}
    
    # 1. Clear existing data
    all_collections = COLLECTIONS + ("users",)
    for coll in all_collections:
        await db[coll].delete_many({})

    # 2. Insert from BSON files
    for coll in COLLECTIONS:
        file_path = os.path.join(BACKUP_DIR, f"{coll}.bson")
        if not os.path.exists(file_path):
            print(f"Warning: {file_path} not found. Skipping...")
            results[coll] = 0
            continue
            
        with open(file_path, "rb") as f:
            data = bson.decode_all(f.read())
            
        if data:
            # Strip MongoDB's internal _id to avoid conflicts
            for doc in data:
                if "_id" in doc:
                    del doc["_id"]
                
                # Apply custom names for demo personas
                if coll == "hub_managers" and doc["name"] == "Adrian Tan":
                    doc["name"] = "Huy Ngo Gia"
                if coll == "drivers" and doc["name"] == "David Lim":
                    doc["name"] = "Huy Pham Nguyen Gia"
                    target_hm = next((m for m in data if m.get("name") == "Huy Ngo Gia"), None)
                    if target_hm:
                         doc["hub_manager_id"] = target_hm["id"]
                
                # Apply payouts to orders from backup
                if coll == "orders":
                    doc["payout"] = round(3.0 + (doc.get("weight_kg", 0) * 0.5), 2)

            await db[coll].insert_many(data)
            results[coll] = len(data)
        else:
            results[coll] = 0

    # 3. Link Shipper to Manager and isolate the hub
    target_hm = await db.hub_managers.find_one({"name": "Huy Ngo Gia"})
    target_dr = await db.drivers.find_one({"name": "Huy Pham Nguyen Gia"})
    
    hub_id = None
    if target_hm and target_dr:
        hub_id = target_hm.get("hub_id")
        # Get hub location for starting position
        hub = await db.hubs.find_one({"id": hub_id})
        start_loc = {"lat": hub["lat"], "lng": hub["lng"], "updated_at": now_iso()} if hub else None
        
        # Ensure our main shipper is linked to our main manager and has a location
        await db.drivers.update_one(
            {"id": target_dr["id"]}, 
            {"$set": {"hub_manager_id": target_hm["id"], "location": start_loc, "status": "available"}}
        )
        
        # Isolate: Ensure this hub ONLY has Huy Pham Nguyen Gia
        if hub_id:
            # Find all managers belonging to this hub
            hub_managers = await db.hub_managers.find({"hub_id": hub_id}, {"id": 1}).to_list(100)
            hm_ids = [m["id"] for m in hub_managers]
            
            # Reassign all drivers in this hub (except Huy Pham Nguyen Gia) to off_duty
            await db.drivers.update_many(
                {
                    "id": {"$ne": target_dr["id"]}
                },
                {"$set": {"status": "off_duty"}}
            )

    # 4. Seed Demo Users
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
            reference_id=target_hm["id"] if target_hm else None
        ),
        User(
            email="shipper1234@gmail.com",
            password_hash=hash_password("huy1234@"),
            role="shipper",
            full_name="Huy Pham Nguyen Gia",
            reference_id=target_dr["id"] if target_dr else None
        )
    ]
    
    user_dicts = [u.model_dump() for u in users_to_seed]
    await db.users.insert_many(user_dicts)
    results["users"] = len(user_dicts)

    # 5. Add 3 test orders (PENDING and RANDOMIZED in Jurong area)
    if target_dr and target_dr.get("zone_id"):
        from app.models.order import Order
        from datetime import datetime, timedelta, timezone

        shipper_zone_id = target_dr["zone_id"]
        
        streets_jurong = [
            "Jurong West St 61", "Boon Lay Way", "Jurong East St 13", 
            "Corporation Rd", "Yuan Ching Rd", "Taman Jurong"
        ]

        test_orders = []
        for i in range(1, 4):
            # Randomize within Jurong pocket
            lat = random.uniform(1.325, 1.345)
            lng = random.uniform(103.680, 103.725)
            weight = round(random.uniform(2.0, 15.0), 1)
            payout = round(3.0 + (weight * 0.5), 2)
            
            test_orders.append(Order(
                code=f"TEST-ORD-{i:03d}",
                address=f"Blk {random.randint(100, 999)}, {random.choice(streets_jurong)}",
                postal_code=f"6{random.randint(0, 9)}{random.randint(0, 9)}{random.randint(0, 9)}{random.randint(0, 9)}",
                lat=lat, lng=lng,
                weight_kg=weight,
                payout=payout,
                required_by=(datetime.now(timezone.utc) + timedelta(days=1)).isoformat(),
                status="pending", # Back to pending
                zone_id=shipper_zone_id,
                hub_id=hub_id
            ))
            
        await db.orders.insert_many([o.model_dump() for o in test_orders])
        results["orders"] += len(test_orders)

    results["ok"] = True
    return results
