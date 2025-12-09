from django.contrib import admin
from django.urls import path
from SmartBusWeb import views

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', views.public_landing_view, name='public_landing'),
    path('register/', views.register_view, name='register'),
    path('verify-otp/', views.verify_otp_view, name='verify_otp'),
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
    path('landing/', views.landing_view, name='landing'),
    path('dashboard/', views.dashboard_view, name='dashboard'),
]