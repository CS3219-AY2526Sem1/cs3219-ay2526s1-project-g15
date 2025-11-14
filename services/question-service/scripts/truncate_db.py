"""
Truncate all data from the questions table but keep the schema.
Add more tables to the TRUNCATE statement as needed.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.core.database import engine

with engine.connect() as conn:
    conn.execute(text("TRUNCATE TABLE questions RESTART IDENTITY CASCADE;"))
    # Add more tables here if needed, e.g.:
    # conn.execute(text("TRUNCATE TABLE users RESTART IDENTITY CASCADE;"))
    conn.commit()
print("All data truncated, schema preserved.")
