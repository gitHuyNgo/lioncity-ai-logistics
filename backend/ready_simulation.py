import asyncio
from app.database import db
from app.utils import now_iso

async def prepare():
    print("Preparing database for simulation...")
    
    # 1. Get all routes
    routes = await db.routes.find({}).to_list(100)
    driver_ids = [r["driver_id"] for r in routes]
    
    if not driver_ids:
        print("No active routes found in database. Please assign some orders first.")
        return

    # 2. Update drivers to 'delivering' status
    # and set their location to the first point of their route if not already set
    for route in routes:
        driver_id = route["driver_id"]
        geometry = route["geometry"]
        
        if not geometry:
            continue
            
        start_loc = {
            "lat": geometry[0][0],
            "lng": geometry[0][1],
            "updated_at": now_iso()
        }
        
        await db.drivers.update_one(
            {"id": driver_id},
            {
                "$set": {
                    "status": "delivering",
                    "location": start_loc
                }
            }
        )
        
        # Also ensure orders are marked as 'delivering'
        await db.orders.update_many(
            {"id": {"$in": route.get("ordered_order_ids", [])}},
            {"$set": {"status": "delivering", "driver_id": driver_id}}
        )

    print(f"Ready! {len(driver_ids)} drivers are now in 'delivering' status.")
    print("You can now run: conda run -n se_app python backend/simulate_deliveries.py")

if __name__ == "__main__":
    asyncio.run(prepare())
