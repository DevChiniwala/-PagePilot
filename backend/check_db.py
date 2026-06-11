import asyncio
from prisma import Prisma

async def check():
    db = Prisma()
    await db.connect()
    try:
        result = await db.query_raw("SELECT current_database() as db, current_schema() as schema")
        print(f'OK  Connected to database: {result[0]["db"]}')
        print(f'     Schema: {result[0]["schema"]}')

        tables = await db.query_raw(
            "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
        )
        if tables:
            names = [t["table_name"] for t in tables]
            print(f'     Existing tables: {", ".join(names)}')
        else:
            print('     No tables yet (ready for migration)')
    except Exception as e:
        print(f'FAIL: {e}')
    finally:
        await db.disconnect()

asyncio.run(check())
