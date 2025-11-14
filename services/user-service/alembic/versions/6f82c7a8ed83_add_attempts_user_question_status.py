"""
add attempts & user_question_status

Revision ID: 6f82c7a8ed83
Revises: 7377b2ea12d1
Create Date: 2025-11-03 10:25:05.153193
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '6f82c7a8ed83'
down_revision = '7377b2ea12d1'
branch_labels = None
depends_on = None

def upgrade():
    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto;")

    op.create_table(
        "attempts",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True),
                  server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("user_id", sa.dialects.postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("question_id", sa.dialects.postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("language", sa.Text(), nullable=False),
        sa.Column("submitted_code", sa.Text(), nullable=False),
        sa.Column("passed_tests", sa.SmallInteger(), nullable=False),
        sa.Column("total_tests", sa.SmallInteger(), nullable=False),
        sa.Column("runtime_ms", sa.Integer()),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True),
                  server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("passed_tests >= 0"),
        sa.CheckConstraint("total_tests >= 0"),
    )
    op.create_index("idx_attempts_user_created", "attempts",
                    ["user_id", "created_at"], unique=False)
    op.create_index("idx_attempts_user_question", "attempts",
                    ["user_id", "question_id", "created_at"], unique=False)

    op.create_table(
        "user_question_status",
        sa.Column("user_id", sa.dialects.postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("question_id", sa.dialects.postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("best_runtime_ms", sa.Integer()),
        sa.Column("solved_at", sa.TIMESTAMP(timezone=True)),
        sa.PrimaryKeyConstraint("user_id", "question_id"),
    )

def downgrade():
    op.drop_table("user_question_status")
    op.drop_index("idx_attempts_user_question", table_name="attempts")
    op.drop_index("idx_attempts_user_created", table_name="attempts")
    op.drop_table("attempts")