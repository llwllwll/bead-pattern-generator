from database import get_db
from models import User
from sqlalchemy import select
import asyncio

async def get_user_credits():
    async for db in get_db():
        try:
            result = await db.execute(select(User))
            users = result.scalars().all()
            for user in users:
                print(f'User: {user.username}, Credits: {user.remaining_credits}, Total Used: {user.total_used}')
        finally:
            await db.close()

if __name__ == '__main__':
    asyncio.run(get_user_credits())