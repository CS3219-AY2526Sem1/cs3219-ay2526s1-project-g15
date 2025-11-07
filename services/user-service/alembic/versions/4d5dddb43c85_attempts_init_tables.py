"""
attempts: init tables

Revision ID: 4d5dddb43c85
Revises: 6f82c7a8ed83
Create Date: 2025-11-03 17:22:35.284423
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '4d5dddb43c85'
down_revision = '6f82c7a8ed83'
branch_labels = None
depends_on = None

def upgrade():
    op.create_table(
        "attempts",
        sa.Column("id", sa.String(), primary_key=True),  # String PK (matches your model)
        sa.Column("user_id", sa.String(), nullable=False, index=True),
        sa.Column("question_id", sa.String(), nullable=False, index=True),
        sa.Column("language", sa.String(), nullable=False),
        sa.Column("submitted_code", sa.Text(), nullable=False),
        sa.Column("passed_tests", sa.SmallInteger(), nullable=False),
        sa.Column("total_tests", sa.SmallInteger(), nullable=False),
        sa.Column("runtime_ms", sa.Integer()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.CheckConstraint("passed_tests >= 0"),
        sa.CheckConstraint("total_tests >= 0"),
    )
    op.create_index("idx_attempts_user_created", "attempts", ["user_id", "created_at"])
    op.create_index("idx_attempts_user_question", "attempts", ["user_id", "question_id", "created_at"])

    op.create_table(
        "user_question_status",
        sa.Column("user_id", sa.String(), primary_key=True),
        sa.Column("question_id", sa.String(), primary_key=True),
        sa.Column("best_runtime_ms", sa.Integer()),
        sa.Column("solved_at", sa.DateTime(timezone=True)),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
    )

def downgrade():
    op.drop_table("user_question_status")
    op.drop_index("idx_attempts_user_question", table_name="attempts")
    op.drop_index("idx_attempts_user_created", table_name="attempts")
    op.drop_table("attempts")