from django.urls import path
from . import views

app_name = 'admin_management'

urlpatterns = [
    # Admin Dashboard
    path('', views.admin_dashboard, name='dashboard'),
    
    # Bus Management
    path('buses/', views.bus_list, name='bus_list'),
    path('buses/create/', views.bus_create, name='bus_create'),
    path('buses/<int:bus_id>/', views.bus_detail, name='bus_detail'),
    path('buses/<int:bus_id>/edit/', views.bus_update, name='bus_edit'),
    path('buses/<int:bus_id>/delete/', views.bus_delete, name='bus_delete'),
    
    # API endpoints
    path('api/bus-stats/', views.get_bus_stats, name='bus_stats'),
]
