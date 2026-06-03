"""Shipper-facing endpoints (FR-19)."""
from __future__ import annotations

from typing import List, Dict, Any
from fastapi import APIRouter

from app.utils import find_list, find_one

router = APIRouter(prefix="/shipper", tags=["shipper"])


@router.get("/{driver_id}/orders")
async def shipper_inbox(driver_id: str) -> dict:
    """Return the driver's active orders (in optimal sequence) and their route."""
    orders = await find_list("orders", {
        "driver_id": driver_id,
        "status": {"$in": ["assigned", "delivering"]},
    })
    orders.sort(key=lambda o: (o.get("sequence") or 9999))
    route = await find_one("routes", {"driver_id": driver_id})
    return {"orders": orders, "route": route}


@router.get("/{driver_id}/earnings")
async def shipper_earnings(driver_id: str) -> dict:
    """Calculate and return earnings statistics for a shipper."""
    # Find all delivered orders for this driver
    delivered = await find_list("orders", {
        "driver_id": driver_id,
        "status": "delivered"
    })
    
    total_earned = sum(o.get("payout", 0.0) for o in delivered)
    
    # Format data for chart (simple list of {name, value})
    # We'll use the order code and payout for a bar chart
    chart_data = [
        {"name": o["code"], "value": o.get("payout", 0.0)} 
        for o in delivered[-10:] # Last 10 deliveries
    ]
    
    return {
        "total_earned": round(total_earned, 2),
        "delivery_count": len(delivered),
        "chart_data": chart_data,
        "history": delivered
    }
