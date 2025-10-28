from django.urls import path
from . import views

app_name = 'register' # Namespace for reverse lookup: register:register

urlpatterns = [
    # Maps /register/ to register_view
    path('', views.register_view, name='register'),
    # Maps /verify-otp/ to verify_otp_view
    path('verify-otp/', views.verify_otp_view, name='verify_otp'), 
]
