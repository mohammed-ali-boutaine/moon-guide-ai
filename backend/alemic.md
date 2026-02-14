alembic init alembic


### then edit

from app.core.database import Base
from app.core.config import settings

config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)
target_metadata = Base.metadata


### Create first migration:

alembic revision --autogenerate -m "init"
alembic upgrade head
