import asyncio
import random
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any

from app.database import db
from app.models.driver import Driver
from app.models.hub import Hub
from app.models.hub_manager import HubManager
from app.models.order import Order
from app.models.user import User
from app.models.vehicle import Vehicle
from app.models.zone import Zone
from app.services.auth import hash_password
from app.services.geo import polygon_centroid
from app.services.zones import find_zone_for_point

COLLECTIONS = ("hub_managers", "drivers", "vehicles", "zones", "orders", "clusters", "routes", "hubs", "users")

FIRST_NAMES = ["Alicia", "Rahul", "Kumar", "Wei Ming", "Siti", "Arjun", "Chen", "Dinesh", "Huy", "Nghia", "Tan", "Lee", "Menon", "Das", "Nurhaliza", "Pillai", "Xin", "Quang", "Gia", "Pham"]
LAST_NAMES = ["Tan", "Lee", "Menon", "Das", "Nurhaliza", "Pillai", "Xin", "Quang", "Gia", "Pham", "Wong", "Lim", "Ng", "Goh", "Chua", "Chan", "Koh", "Teo", "Ang", "Lau"]

STREETS = [
    "Orchard Rd", "Marina Blvd", "Tanglin Rd", "Tampines Central", "Jurong Gateway Rd",
    "Bayfront Ave", "Harbourfront Walk", "Airport Blvd", "Marina Gardens Dr", "Raffles Blvd",
    "Stadium Pl", "Sentosa Gateway", "Vista Exchange Grn", "Choa Chu Kang Ave 4", "Woodlands Ave 2",
    "Punggol Central", "Pasir Ris Close", "Serangoon Rd", "Bukit Timah Rd", "Holland Rd"
]

COLORS = ["#ef4444", "#0ea5a4", "#f59e0b", "#0d7c78", "#7c3aed", "#ec4899", "#10b981", "#3b82f6"]

def generate_name():
    return f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}"

def generate_phone():
    return f"+65{random.randint(80000000, 99999999)}"

def generate_plate():
    return f"SG{random.choice(['B', 'V', 'P'])}{random.randint(1000, 9999)}{random.choice('ABCDE')}"

async def generate_dummy_data(
    num_hubs: int = 5,
    num_managers: int = 10,
    num_drivers: int = 50,
    num_orders: int = 200,
    num_zones: int = 6
):
    print(f"Cleaning existing data from {COLLECTIONS}...")
    for collection in COLLECTIONS:
        await db[collection].delete_many({})

    print(f"Generating {num_hubs} hubs...")
    hub_ids = []
    hubs_data = []
    for i in range(num_hubs):
        name = f"Hub {i+1} · {random.choice(STREETS)}"
        address = f"{random.randint(1, 100)} {random.choice(STREETS)}, Singapore {random.randint(100000, 999999)}"
        lat = random.uniform(1.25, 1.45)
        lng = random.uniform(103.7, 103.95)
        color = random.choice(COLORS)
        hub = Hub(name=name, address=address, lat=lat, lng=lng, is_default=(i == 0), color=color)
        await db.hubs.insert_one(hub.model_dump())
        hub_ids.append(hub.id)
        hubs_data.append(hub)

    print(f"Generating {num_managers} hub managers...")
    manager_ids = []
    for i in range(num_managers):
        name = generate_name()
        phone = generate_phone()
        hub_idx = i % num_hubs
        hub = hubs_data[hub_idx]
        manager = HubManager(name=name, phone=phone, hub_id=hub.id, hub_name=hub.name)
        await db.hub_managers.insert_one(manager.model_dump())
        manager_ids.append(manager.id)

    print(f"Generating {num_zones} zones...")
    zone_ids = []
    for i in range(num_zones):
        name = f"Zone {chr(65+i)} - {random.choice(STREETS)}"
        # Simple square polygon
        base_lat = random.uniform(1.25, 1.40)
        base_lng = random.uniform(103.7, 103.90)
        offset = 0.02
        polygon = [
            [base_lat, base_lng],
            [base_lat + offset, base_lng],
            [base_lat + offset, base_lng + offset],
            [base_lat, base_lng + offset]
        ]
        color = random.choice(COLORS)
        zone = Zone(name=name, polygon=polygon, center=polygon_centroid(polygon), color=color)
        await db.zones.insert_one(zone.model_dump())
        zone_ids.append(zone.id)

    print(f"Generating {num_drivers} drivers and vehicles...")
    driver_ids = []
    for i in range(num_drivers):
        # Driver
        name = generate_name()
        phone = generate_phone()
        license_type = random.choice(["A", "B", "C"])
        manager_id = random.choice(manager_ids)
        zone_id = random.choice(zone_ids)
        
        driver = Driver(
            name=name, 
            phone=phone, 
            license_type=license_type, 
            hub_manager_id=manager_id,
            zone_id=zone_id,
            status=random.choice(["available", "available", "available", "off_duty"])
        )
        await db.drivers.insert_one(driver.model_dump())
        driver_ids.append(driver.id)
        
        # Vehicle
        plate = generate_plate()
        v_type = random.choice(["motorbike", "van"])
        fuel = random.choice(["ev", "diesel"])
        capacity = random.randint(40, 1000)
        vehicle = Vehicle(
            plate=plate, 
            type=v_type, 
            fuel_type=fuel, 
            capacity_kg=capacity,
            assigned_driver_id=driver.id
        )
        await db.vehicles.insert_one(vehicle.model_dump())
        
        # Link driver back to vehicle
        await db.drivers.update_one({"id": driver.id}, {"$set": {"vehicle_id": vehicle.id}})
        # Add driver to zone
        await db.zones.update_one({"id": zone_id}, {"$addToSet": {"driver_ids": driver.id}})

    print(f"Generating {num_orders} orders...")
    base_time = datetime.now(timezone.utc) + timedelta(hours=6)
    seeded_zones = list(await db.zones.find({}, {"_id": 0}).to_list(100))
    
    for i in range(num_orders):
        address = f"{random.randint(1, 1000)} {random.choice(STREETS)}, Singapore {random.randint(100000, 999999)}"
        postal = f"{random.randint(100000, 999999)}"
        lat = random.uniform(1.25, 1.45)
        lng = random.uniform(103.7, 103.95)
        weight = round(random.uniform(0.5, 20.0), 1)
        
        order_zone = await find_zone_for_point(lat, lng, seeded_zones)
        
        status = "pending"
        driver_id = None
        if random.random() < 0.3: # 30% chance to be assigned
            status = "assigned"
            driver_id = random.choice(driver_ids)
        elif random.random() < 0.1: # 10% chance to be delivered
            status = "delivered"
            driver_id = random.choice(driver_ids)

        order = Order(
            code=f"ORD-{i+1:05d}",
            address=address,
            postal_code=postal,
            lat=lat,
            lng=lng,
            weight_kg=weight,
            required_by=(base_time + timedelta(hours=random.randint(1, 48))).isoformat(),
            zone_id=order_zone,
            status=status,
            driver_id=driver_id
        )
        await db.orders.insert_one(order.model_dump())

    print("Seeding test users...")
    password_hash = hash_password("huy1234@")
    users = [
        User(email="superadmin@example.com", password_hash=password_hash, role="super_admin", full_name="Admin Tester"),
        User(email="manager@example.com", password_hash=password_hash, role="hub_manager", full_name="Manager Tester", reference_id=manager_ids[0]),
        User(email="shipper@example.com", password_hash=password_hash, role="shipper", full_name="Shipper Tester", reference_id=driver_ids[0]),
    ]
    for user in users:
        await db.users.insert_one(user.model_dump())

    print("Successfully generated dummy data!")
    return {
        "hubs": num_hubs,
        "managers": num_managers,
        "zones": num_zones,
        "drivers": num_drivers,
        "orders": num_orders,
        "users": len(users)
    }

if __name__ == "__main__":
    asyncio.run(generate_dummy_data())
