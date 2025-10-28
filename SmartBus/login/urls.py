from django.urls import path
from . import views

app_name = 'login' # Namespace for reverse lookup: login:login

urlpatterns = [
    # Maps /login/ to login_view
    path('', views.login_view, name='login'),
    # Maps /logout/ to logout_view
    path('logout/', views.logout_view, name='logout'), 
]
