import random
import string
import os # NEW: Added to access environment variables
from supabase import create_client, Client # NEW: Added Supabase imports
from django.shortcuts import render, redirect
from django.contrib.auth.models import User
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.contrib.auth import login, authenticate, logout
from django.core.mail import send_mail
from django.conf import settings
from .models import OTPVerification

# ====================================================================
# NEW: SUPABASE INITIALIZATION
# The Supabase URL and Key must be defined in your .env file
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

# Check if the keys exist before trying to create the client
if SUPABASE_URL and SUPABASE_KEY:
    try:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    except Exception as e:
        print(f"Error initializing Supabase client: {e}")
        supabase = None
else:
    print("WARNING: SUPABASE_URL or SUPABASE_KEY not found in environment.")
    supabase = None
# ====================================================================

# Generate 6-digit OTP
def generate_otp():
    return ''.join(random.choices(string.digits, k=6))

# Send OTP Email
def send_otp_email(email, otp_code):
    try:
        print(f"\n{'='*60}")
        print(f"OTP EMAIL SENT TO: {email}")
        print(f"OTP CODE: {otp_code}")
        print(f"VALID FOR: 10 minutes")
        print(f"{'='*60}\n")
        
        subject = "SmartBus Email Verification - OTP Code"
        message = f"""
Hello,

Your SmartBus OTP verification code is:

{otp_code}

This code will expire in 10 minutes.

Do not share this code with anyone.

Best regards,
SmartBus Team
        """
        
        try:
            send_mail(
                subject,
                message,
                settings.DEFAULT_FROM_EMAIL,
                [email],
                fail_silently=False,
            )
        except Exception as mail_e:
            # We allow mail sending to fail silently to let development continue
            # but we print the error for debugging purposes
            print(f"Failed to send email: {mail_e}")
            pass
        
        return True
    except Exception as e:
        print(f"Error in send_otp_email: {e}")
        return False

# Public Landing Page
def public_landing_view(request):
    if request.user.is_authenticated:
        return redirect('landing')
    return render(request, 'smartbus/public_landing.html')

# Register View - Step 1: Take email, username, password
def register_view(request):
    if request.user.is_authenticated:
        return redirect('landing')
    
    if request.method == "POST":
        username = request.POST.get("username", "").strip()
        email = request.POST.get("email", "").strip()
        password1 = request.POST.get("password1", "").strip()
        password2 = request.POST.get("password2", "").strip()
        
        # Validation
        if not username or not email or not password1:
            messages.error(request, "All fields are required")
            return render(request, "smartbus/register.html")
        
        if password1 != password2:
            messages.error(request, "Passwords do not match")
            return render(request, "smartbus/register.html")
        
        # NOTE: We can't check Supabase for existence here without a complex call,
        # so we rely on the final Supabase sign_up to catch the existence error.
        
        if User.objects.filter(username=username).exists():
            messages.error(request, "Username already taken")
            return render(request, "smartbus/register.html")
        
        # NOTE: If we use Django's User model, Django needs unique email/username.
        if User.objects.filter(email=email).exists():
            messages.error(request, "Email already registered in local database")
            return render(request, "smartbus/register.html")
        
        # Generate OTP
        otp_code = generate_otp()
        
        # Delete old OTP if exists
        OTPVerification.objects.filter(email=email).delete()
        
        # Create new OTP record
        OTPVerification.objects.create(
            email=email,
            otp_code=otp_code,
            username=username,
            password_hash=password1 # Storing the plain password temporarily
        )
        
        # Send OTP Email
        if send_otp_email(email, otp_code):
            messages.success(request, f"OTP sent to {email}")
            # Redirect to verify_otp, passing email contextually if needed for the template
            return redirect('verify_otp')
        else:
            messages.error(request, "Failed to send OTP. Please check email settings.")
            OTPVerification.objects.filter(email=email).delete()
            return render(request, "smartbus/register.html")
    
    return render(request, "smartbus/register.html")

# OTP Verification View
def verify_otp_view(request):
    if request.user.is_authenticated:
        return redirect('landing')
    
    if request.method == "POST":
        email = request.POST.get("email", "").strip()
        otp_input = request.POST.get("otp", "").strip()
        
        try:
            otp_record = OTPVerification.objects.get(email=email)
            
            if otp_record.is_expired():
                messages.error(request, "OTP expired. Please register again.")
                otp_record.delete()
                return redirect('register')
            
            if otp_record.attempts >= 3:
                messages.error(request, "Too many attempts. Please register again.")
                otp_record.delete()
                return redirect('register')
            
            if otp_record.otp_code == otp_input:
                # ====================================================================
                # CRITICAL FIX: CREATE USER IN SUPABASE FIRST
                # ====================================================================
                if not supabase:
                    messages.error(request, "Supabase service is unavailable. Cannot register.")
                    return redirect('register')

                try:
                    # 1. ATTEMPT TO REGISTER IN SUPABASE AUTH
                    user_response = supabase.auth.sign_up(
                        {
                            "email": otp_record.email,
                            "password": otp_record.password_hash,
                            # Optionally add username to user_metadata if supported
                            # "data": {"username": otp_record.username} 
                        }
                    )
                    
                    # 2. If Supabase signup succeeds, create the local Django user
                    # If Supabase Auth is configured for email confirmation, this Django 
                    # user is created but the Supabase user will be unconfirmed until the user
                    # clicks the confirmation link sent by Supabase.
                    user = User.objects.create_user(
                        username=otp_record.username,
                        email=otp_record.email,
                        password=otp_record.password_hash # Django hashes the password
                    )
                    
                    # Cleanup and Success
                    otp_record.delete()
                    messages.success(request, "Email verified! Account created. Please check your email for the **Supabase confirmation link** (if required) then login.")
                    return redirect('login')

                except Exception as supabase_e:
                    # This catches Supabase API errors (e.g., "User already registered")
                    error_msg = str(supabase_e)
                    
                    # Check for common Supabase errors to provide cleaner messages
                    if "user already exists" in error_msg.lower():
                         messages.error(request, "An account with this email already exists in Supabase. Please login.")
                    else:
                        messages.error(request, f"Supabase Registration Failed. Error: {error_msg}")
                    
                    # CRITICAL: Delete the OTP record to prevent further attempts on failed Supabase registration
                    otp_record.delete()
                    return redirect('register')
                # ====================================================================
            else:
                otp_record.attempts += 1
                otp_record.save()
                messages.error(request, f"Invalid OTP. {3 - otp_record.attempts} attempts remaining.")
                return render(request, "smartbus/verify_otp.html", {"email": email})
        
        except OTPVerification.DoesNotExist:
            messages.error(request, "OTP record not found. Please register again.")
            return redirect('register')
    
    return render(request, "smartbus/verify_otp.html")

# Login View - FIXED
def login_view(request):
    if request.user.is_authenticated:
        return redirect('landing')
    
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
                messages.success(request, f"Welcome back, {user.username}!")
                return redirect('landing')
            else:
                messages.error(request, "Invalid email or password")
                return render(request, "smartbus/login.html")
        
        except User.DoesNotExist:
            messages.error(request, "Invalid email or password")
            return render(request, "smartbus/login.html")
    
    return render(request, "smartbus/login.html")

# Logout View
def logout_view(request):
    # NOTE: If you were using Supabase for session management, you would need
    # to include a supabase.auth.sign_out() call here.
    logout(request)
    messages.success(request, "You have been logged out")
    return redirect('public_landing')

# Landing View
@login_required(login_url='public_landing')
def landing_view(request):
    return render(request, 'smartbus/landing.html')

# Dashboard View
@login_required(login_url='public_landing')
def dashboard_view(request):
    return render(request, 'smartbus/dashboard.html')