#!/usr/bin/env python3
"""
Database initialization script for production.
Run this script to initialize the database with extensions and migrations.
"""
import asyncio
import sys
from sqlalchemy import text
from app.core.database import engine
from app.core.config import settings


async def init_database():
    """Initialize database with required extensions."""
    print(f"Connecting to database: {settings.POSTGRES_SERVER}:{settings.POSTGRES_PORT}/{settings.POSTGRES_DB}")
    
    try:
        async with engine.begin() as conn:
            # Create pgvector extension
            print("Creating pgvector extension...")
            await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
            
            # Create pgcrypto extension for encryption
            print("Creating pgcrypto extension...")
            await conn.execute(text("CREATE EXTENSION IF NOT EXISTS pgcrypto"))
            
            # Create uuid-ossp extension for UUID generation
            print("Creating uuid-ossp extension...")
            await conn.execute(text("CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\""))
            
            print("Extensions created successfully!")
            
        print("\nDatabase initialization complete!")
        print("Now run: alembic upgrade head")
        
    except Exception as e:
        print(f"Error initializing database: {e}")
        sys.exit(1)
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(init_database())
