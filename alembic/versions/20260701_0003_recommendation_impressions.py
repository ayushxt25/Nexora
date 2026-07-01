"""add recommendation impressions

Revision ID: 20260701_0003
Revises: 20260701_0002
Create Date: 2026-07-01 17:10:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260701_0003"
down_revision: Union[str, None] = "20260701_0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "recommendation_impressions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("recommendation_type", sa.String(length=100), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("priority_score", sa.Float(), nullable=False),
        sa.Column("related_contact_id", sa.Integer(), nullable=True),
        sa.Column("related_event_id", sa.Integer(), nullable=True),
        sa.Column("related_follow_up_id", sa.Integer(), nullable=True),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_recommendation_impressions_id"), "recommendation_impressions", ["id"], unique=False)
    op.create_index(
        op.f("ix_recommendation_impressions_user_id"),
        "recommendation_impressions",
        ["user_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_recommendation_impressions_recommendation_type"),
        "recommendation_impressions",
        ["recommendation_type"],
        unique=False,
    )
    op.create_index(
        op.f("ix_recommendation_impressions_related_contact_id"),
        "recommendation_impressions",
        ["related_contact_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_recommendation_impressions_related_event_id"),
        "recommendation_impressions",
        ["related_event_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_recommendation_impressions_related_follow_up_id"),
        "recommendation_impressions",
        ["related_follow_up_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_recommendation_impressions_created_at"),
        "recommendation_impressions",
        ["created_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_recommendation_impressions_created_at"), table_name="recommendation_impressions")
    op.drop_index(
        op.f("ix_recommendation_impressions_related_follow_up_id"),
        table_name="recommendation_impressions",
    )
    op.drop_index(op.f("ix_recommendation_impressions_related_event_id"), table_name="recommendation_impressions")
    op.drop_index(
        op.f("ix_recommendation_impressions_related_contact_id"),
        table_name="recommendation_impressions",
    )
    op.drop_index(
        op.f("ix_recommendation_impressions_recommendation_type"),
        table_name="recommendation_impressions",
    )
    op.drop_index(op.f("ix_recommendation_impressions_user_id"), table_name="recommendation_impressions")
    op.drop_index(op.f("ix_recommendation_impressions_id"), table_name="recommendation_impressions")
    op.drop_table("recommendation_impressions")
