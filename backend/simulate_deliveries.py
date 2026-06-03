import asyncio
import time
from app.database import db
from app.services.geo import haversine
from app.utils import now_iso

async def simulate_all_drivers(step_m: float = 300.0):
    """
    Background task to move all 'delivering' drivers forward along their routes.
    """
    print(f"[{time.strftime('%H:%M:%S')}] Starting simulation step...")
    
    # 1. Get all drivers in 'delivering' status
    drivers = await db.drivers.find({"status": "delivering"}).to_list(1000)
    
    for driver in drivers:
        driver_id = driver["id"]
        
        # 2. Get the planned route for this driver
        route = await db.routes.find_one({"driver_id": driver_id})
        if not route:
            continue
            
        geometry = route["geometry"]
        current = driver.get("location")
        
        # 3. Find current position in geometry and move forward
        if not current:
            index = 0
        else:
            # Find closest index
            index = min(
                range(len(geometry)),
                key=lambda i: haversine(
                    (current["lat"], current["lng"]),
                    (geometry[i][0], geometry[i][1]),
                ),
            )
            
            # Move forward by step_m
            travelled = 0.0
            while index < len(geometry) - 1 and travelled < step_m:
                travelled += haversine(
                    (geometry[index][0], geometry[index][1]),
                    (geometry[index + 1][0], geometry[index + 1][1]),
                )
                index += 1
        
        # 4. Update location
        new_location = {
            "lat": geometry[index][0],
            "lng": geometry[index][1],
            "updated_at": now_iso(),
        }
        
        # 5. Check if reached the end of the route
        if index >= len(geometry) - 1:
            print(f"Driver {driver['name']} ({driver_id}) reached destination.")
            # Mark all assigned orders as delivered
            await db.orders.update_many(
                {"driver_id": driver_id, "status": "delivering"},
                {"$set": {"status": "delivered"}}
            )
            # Set driver back to available and clear route
            await db.drivers.update_one(
                {"id": driver_id},
                {"$set": {"status": "available", "location": new_location}}
            )
            await db.routes.delete_one({"driver_id": driver_id})
        else:
            # Still moving
            await db.drivers.update_one(
                {"id": driver_id},
                {"$set": {"location": new_location}}
            )
            
    print(f"[{time.strftime('%H:%M:%S')}] Simulation step completed.")

async def main():
    print("=== LionCity AI Logistics - Delivery Simulator ===")
    print("Moving all active drivers every 5 seconds...")
    print("Press Ctrl+C to stop.")
    
    try:
        while True:
            await simulate_all_drivers(step_m=250.0) # Move 250m each step
            await asyncio.sleep(5) # Wait 5 seconds
    except KeyboardInterrupt:
        print("\nSimulation stopped.")

if __name__ == "__main__":
    asyncio.run(main())
