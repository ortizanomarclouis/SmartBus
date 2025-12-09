import os 
from django.shortcuts import render, redirect
from django.contrib.auth import login, authenticate, logout

# Public Landing Page
def public_landing_view(request):
    if request.user.is_authenticated:
        return redirect('dashboard:landing')
    return render(request, 'core/public_landing.html')
