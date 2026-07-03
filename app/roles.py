from app.config import get_admin_emails, get_admin_usernames

ALLOWED_USER_ROLES = {"user", "admin"}
DEFAULT_ROLE = "user"
ADMIN_ROLE = "admin"


def normalize_user_role(role: str | None) -> str:
    normalized = (role or DEFAULT_ROLE).strip().lower()
    if normalized not in ALLOWED_USER_ROLES:
        raise ValueError(f"role must be one of {sorted(ALLOWED_USER_ROLES)}")
    return normalized


def coerce_user_role(role: str | None) -> str:
    try:
        return normalize_user_role(role)
    except ValueError:
        return DEFAULT_ROLE


def is_admin_role(role: str | None) -> bool:
    return normalize_user_role(role) == ADMIN_ROLE


def resolve_user_role(
    *,
    username: str | None = None,
    email: str | None = None,
    fallback_role: str | None = None,
) -> str:
    normalized_username = (username or "").strip().lower()
    normalized_email = (email or "").strip().lower()

    if normalized_username and normalized_username in set(get_admin_usernames()):
        return ADMIN_ROLE
    if normalized_email and normalized_email in set(get_admin_emails()):
        return ADMIN_ROLE

    return coerce_user_role(fallback_role)
