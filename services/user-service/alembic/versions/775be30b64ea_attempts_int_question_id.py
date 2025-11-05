"""
attempts int question_id

Revision ID: 775be30b64ea
Revises: 0609cb61ef62
Create Date: 2025-11-04 11:07:31.463012
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '775be30b64ea'
down_revision = '0609cb61ef62'
branch_labels = None
depends_on = None

def upgrade():
    op.drop_table("user_question_status", if_exists=True)
    op.drop_table("attempts", if_exists=True)

    op.create_table(
        "attempts",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("user_id", sa.String(), nullable=False, index=True),
        sa.Column("question_id", sa.Integer(), nullable=False),
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

    op.create_table(
        "user_question_status",
        sa.Column("user_id", sa.String(), primary_key=True),
        sa.Column("question_id", sa.Integer(), primary_key=True),
        sa.Column("best_runtime_ms", sa.Integer()),
        sa.Column("solved_at", sa.DateTime(timezone=True)),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
    )

def downgrade():
    op.drop_table("user_question_status")
    op.drop_table("attempts")