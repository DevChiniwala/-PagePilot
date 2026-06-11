import asyncio
from prisma import Prisma

async def check():
    db = Prisma()
    await db.connect()
    tables = await db.query_raw(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
    )
    print(f'Tables ({len(tables)}):')
    for t in tables:
        cols = await db.query_raw(
            f"SELECT column_name, data_type, is_nullable FROM information_schema.columns "
            f"WHERE table_schema = 'public' AND table_name = '{t['table_name']}' "
            f"ORDER BY ordinal_position"
        )
        print(f'  - {t["table_name"]}: {len(cols)} columns')
    await db.disconnect()

asyncio.run(check())
