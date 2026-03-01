import asyncio
from app.database import engine
from sqlalchemy import text

async def test():
    async with engine.connect() as conn:
        r = await conn.execute(text("""
            SELECT table_name FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        """))
        tables = [row[0] for row in r.fetchall()]
        print("Tables:", tables)
        
        if "users" in tables:
            r2 = await conn.execute(text("SELECT id, email FROM users LIMIT 5"))
            for row in r2.fetchall():
                print(f"  User: {row[1]} (id={row[0]})")
        else:
            print("WARNING: 'users' table not found! Run migration.sql first.")

asyncio.run(test())
