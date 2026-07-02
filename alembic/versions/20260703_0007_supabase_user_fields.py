"""add supabase user fields

Revision ID: 20260703_0007
Revises: 20260703_0006
Create Date: 2026-07-03 23:40:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260703_0007"
down_revision: Union[str, None] = "20260703_0006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("users") as batch_op:
        batch_op.add_column(sa.Column("supabase_user_id", sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column("role", sa.String(length=32), nullable=False, server_default="user"))
        batch_op.create_index(batch_op.f("ix_users_supabase_user_id"), ["supabase_user_id"], unique=True)
        batch_op.create_index(batch_op.f("ix_users_role"), ["role"], unique=False)


def downgrade() -> None:
    with op.batch_alter_table("users") as batch_op:
        batch_op.drop_index(batch_op.f("ix_users_role"))
        batch_op.drop_index(batch_op.f("ix_users_supabase_user_id"))
        batch_op.drop_column("role")
        batch_op.drop_column("supabase_user_id")
