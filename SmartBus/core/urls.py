from django.urls import path
from . import views

app_name = 'core' # Namespace for reverse lookup: core:public_landing

urlpatterns = [
    # Maps the project root URL to the public landing page
    path('', views.public_landing_view, name='public_landing'), 
]