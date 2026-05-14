# Импорт всех моделей обеспечивает их регистрацию в Base.metadata
# (необходимо для корректной работы create_all и alembic autogenerate)
from .admin import AdminSetting
from .auth_user import AdminUser
from .behavior import LeadBehavior
from .lead import Lead
from .portfolio import CaseStudy, LandingExample

__all__ = ["Lead", "LeadBehavior", "AdminSetting", "AdminUser", "LandingExample", "CaseStudy"]
