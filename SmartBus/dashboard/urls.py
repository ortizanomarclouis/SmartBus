from django.urls import path
from . import views

app_name = 'dashboard' # Namespace for reverse lookup: dashboard:dashboard

urlpatterns = [
    # Maps /landing/ to landing_view
    path('landing/', views.landing_view, name='landing'),
    # Maps /dashboard/ to dashboard_view
    path('dashboard/', views.dashboard_view, name='dashboard'),
]
