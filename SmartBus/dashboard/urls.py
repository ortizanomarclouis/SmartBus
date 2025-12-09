from django.urls import path
from . import views

app_name = 'dashboard'

urlpatterns = [
    path('landing/', views.landing_view, name='landing'),
    path('dashboard/', views.dashboard_view, name='dashboard'),
    path('profile/', views.profile_view, name='profile'),
    
    # Only ONE path for the API, pointing to the new bus_api
    path('api/buses/', views.bus_api, name='bus_api'),
]