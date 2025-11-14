"""
attempts:question_id to varchar

Revision ID: 0609cb61ef62
Revises: 4d5dddb43c85
Create Date: 2025-11-03 19:54:52.769227
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '0609cb61ef62'
down_revision = '4d5dddb43c85'
branch_labels = None
depends_on = None

def upgrade():
    op.alter_column(
        "attempts", "question_id",
        type_=sa.String(),
        postgresql_using="question_id::text",
    )

def downgrade():
    from sqlalchemy.dialects import postgresql
    op.alter_column(
        "attempts", "question_id",
        type_=postgresql.UUID(as_uuid=True),
        postgresql_using="question_id::uuid",
    )