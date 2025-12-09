from django.urls import path
from . import views

app_name = 'admin_management'

urlpatterns = [
    # Dashboard
    path('', views.dashboard, name='dashboard'),

    # Bus Management
    path('buses/', views.bus_list, name='bus_list'),
    path('buses/create/', views.bus_create, name='bus_create'),
    path('buses/<int:pk>/', views.bus_detail, name='bus_detail'),
    path('buses/<int:pk>/edit/', views.bus_edit, name='bus_edit'),
    path('buses/<int:pk>/delete/', views.bus_delete, name='bus_delete'),

    # User Management (FIXED)
    path('users/', views.user_list, name='user_list'),
    path('users/<int:user_id>/edit/', views.user_edit, name='user_edit'),     # Matches view logic
    path('users/<int:user_id>/delete/', views.user_delete, name='user_delete'), # Matches view logic
]