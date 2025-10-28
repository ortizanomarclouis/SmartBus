import random
import string
import os 
from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required

# Landing View
@login_required(login_url='core:public_landing')
def landing_view(request):
    return render(request, 'dashboard/landing.html')

# Dashboard View
@login_required(login_url='core:public_landing')
def dashboard_view(request):
    return render(request, 'dashboard/dashboard.html')