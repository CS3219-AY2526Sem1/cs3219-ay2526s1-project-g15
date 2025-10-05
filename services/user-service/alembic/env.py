from logging.config import fileConfig
import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from sqlalchemy import engine_from_config, pool
from alembic import context
from app.core.config import settings
from app.models.user import Base as UserBase
from app.models.refresh_token import Base as RTBase

# Combine metadata
target_metadata = UserBase.metadata

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

config.set_main_option("sqlalchemy.url", settings.DATABASE_URL.replace("+asyncpg", ""))

def run_migrations_offline():
    context.configure(url=config.get_main_option("sqlalchemy.url"), target_metadata=target_metadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online():
    connectable = engine_from_config(
        config.get_section(config.config_ini_section), prefix="sqlalchemy.", poolclass=pool.NullPool
    )
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()