"""
drop runtime_ms from attempts

Revision ID: d13d1aed88a7
Revises: 775be30b64ea
Create Date: 2025-11-05 13:06:49.086103
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'd13d1aed88a7'
down_revision = '775be30b64ea'
branch_labels = None
depends_on = None

def upgrade():
    with op.batch_alter_table("attempts") as batch_op:
        batch_op.drop_column("runtime_ms")

def downgrade():
    with op.batch_alter_table("attempts") as batch_op:
        batch_op.add_column(sa.Column("runtime_ms", sa.Integer(), nullable=True))