import random
import string
import os 
from supabase import create_client, Client 
from django.shortcuts import render, redirect
from django.contrib.auth.models import User
from django.contrib import messages
from django.contrib.auth import login, authenticate, logout

# Login View 
def login_view(request):
    if request.user.is_authenticated:
        return redirect('dashboard:landing')
    
    if request.method == "POST":
        email = request.POST.get("email", "").strip()
        password = request.POST.get("password", "").strip()
        
        # NOTE: Since the login must work for both Django and Supabase users, 
        # it relies on Django's authenticate which is good for local users. 
        # If you were solely using Supabase, you would need supabase.auth.sign_in_with_password here.
        
        try:
            # Get user by email
            user_obj = User.objects.get(email=email)
            username = user_obj.username
            
            # Authenticate using username and password (which will check Django's hashed password)
            user = authenticate(request, username=username, password=password)
            
            if user is not None:
                login(request, user)
                return redirect('dashboard:landing')
            else:
                messages.error(request, "Invalid email or password")
                return render(request, "login/login.html")
        
        except User.DoesNotExist:
            messages.error(request, "Invalid email or password")
            return render(request, "login/login.html")
    
    return render(request, "login/login.html")

# Logout View
def logout_view(request):
    logout(request)
    return redirect('core:public_landing')
