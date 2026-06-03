"""User domain model for authentication and authorization."""
from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, EmailStr

from app.models.common import MongoModel

UserRole = Literal["super_admin", "hub_manager", "shipper"]


class User(MongoModel):
    """Internal user representation with hashed password."""
    email: EmailStr
    password_hash: str
    role: UserRole
    full_name: str
    avatar_url: Optional[str] = None
    # Reference to the actual entity (HubManager ID or Driver ID)
    reference_id: Optional[str] = None


class UserIn(BaseModel):
    """Schema for creating a new user."""
    email: EmailStr
    password: str
    role: UserRole
    full_name: str
    avatar_url: Optional[str] = None
    reference_id: Optional[str] = None


class UserOut(BaseModel):
    """Schema for returning user data (no password)."""
    id: str
    email: EmailStr
    role: UserRole
    full_name: str
    avatar_url: Optional[str] = None
    reference_id: Optional[str] = None


class LoginRequest(BaseModel):
    """Schema for login requests."""
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    """Schema for successful login responses."""
    access_token: str
    token_type: str = "bearer"
    user: UserOut
