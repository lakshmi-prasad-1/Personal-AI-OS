#!/usr/bin/env python3
"""
Database seeding script for development/testing.
Run this script to populate the database with sample data.
"""
import asyncio
import sys
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import async_session_maker
from app.models.core_models import User


async def seed_database():
    """Seed database with sample data."""
    print("Seeding database...")
    
    try:
        async with async_session_maker() as session:
            # Check if admin user exists
            from sqlalchemy import select
            result = await session.execute(
                select(User).where(User.email == "admin@example.com")
            )
            admin_user = result.scalar_one_or_none()
            
            if not admin_user:
                # Create admin user
                from passlib.context import CryptContext
                pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
                
                admin_user = User(
                    email="admin@example.com",
                    hashed_password=pwd_context.hash("admin123"),
                    full_name="Admin User",
                    is_active=True,
                    is_superuser=True,
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow()
                )
                session.add(admin_user)
                await session.commit()
                print("Created admin user: admin@example.com / admin123")
            else:
                print("Admin user already exists")
            
            print("\nDatabase seeding complete!")
            
    except Exception as e:
        print(f"Error seeding database: {e}")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(seed_database())
