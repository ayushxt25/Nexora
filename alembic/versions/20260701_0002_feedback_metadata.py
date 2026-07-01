"""add feedback metadata columns

Revision ID: 20260701_0002
Revises: 20260701_0001
Create Date: 2026-07-01 15:50:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260701_0002"
down_revision: Union[str, None] = "20260701_0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("feedback", schema=None) as batch_op:
        batch_op.add_column(sa.Column("category", sa.String(length=32), nullable=True))
        batch_op.add_column(sa.Column("target_type", sa.String(length=32), nullable=True))
        batch_op.add_column(sa.Column("target_id", sa.String(length=64), nullable=True))
        batch_op.add_column(sa.Column("notes", sa.Text(), nullable=True))
        batch_op.create_index(batch_op.f("ix_feedback_category"), ["category"], unique=False)
        batch_op.create_index(batch_op.f("ix_feedback_target_id"), ["target_id"], unique=False)
        batch_op.create_index(batch_op.f("ix_feedback_target_type"), ["target_type"], unique=False)


def downgrade() -> None:
    with op.batch_alter_table("feedback", schema=None) as batch_op:
        batch_op.drop_index(batch_op.f("ix_feedback_target_type"))
        batch_op.drop_index(batch_op.f("ix_feedback_target_id"))
        batch_op.drop_index(batch_op.f("ix_feedback_category"))
        batch_op.drop_column("notes")
        batch_op.drop_column("target_id")
        batch_op.drop_column("target_type")
        batch_op.drop_column("category")
