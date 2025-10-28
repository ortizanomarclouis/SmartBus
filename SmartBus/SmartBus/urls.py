from django.contrib import admin
from django.urls import path, include
# REMOVE: from SmartBusWeb import views 
# We now use include() for routing

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # 1. CORE (Public Entry) - Maps the root URL '' to the core app
    path('', include('core.urls')), 
    
    # 2. AUTHENTICATION
    # All login/register routes start with the path defined here
    path('register/', include('register.urls')), 
    path('login/', include('login.urls')),
    
    # 3. AUTHENTICATED CONTENT
    # All authenticated routes start with 'app/'
    path('app/', include('dashboard.urls')),
]
