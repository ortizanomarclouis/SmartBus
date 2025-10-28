import random
import string
import os 
from supabase import create_client, Client 
from django.shortcuts import render, redirect
from django.contrib.auth.models import User
from django.contrib import messages
from django.core.mail import send_mail
from django.conf import settings
from .models import OTPVerification 

# ====================================================================
# NEW: SUPABASE INITIALIZATION (Keep this here as the utility center)
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


# Generate 6-digit OTP (Keep utility functions here)
def generate_otp():
    return ''.join(random.choices(string.digits, k=6))

# Send OTP Email (Keep utility functions here)
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
            print(f"Failed to send email: {mail_e}")
            pass
        
        return True
    except Exception as e:
        print(f"Error in send_otp_email: {e}")
        return False


# Register View - Step 1: Take email, username, password
def register_view(request):
    # NOTE: Assuming the 'landing' URL name is defined in your 'dashboard' app's urls.py
    if request.user.is_authenticated:
        return redirect('dashboard:landing')
    
    if request.method == "POST":
        username = request.POST.get("username", "").strip()
        email = request.POST.get("email", "").strip()
        password1 = request.POST.get("password1", "").strip()
        password2 = request.POST.get("password2", "").strip()
        
        # Validation (Template path fixed)
        if not username or not email or not password1:
            messages.error(request, "All fields are required")
            return render(request, "register/register.html")
        
        if password1 != password2:
            messages.error(request, "Passwords do not match")
            return render(request, "register/register.html")
        
        if User.objects.filter(username=username).exists():
            messages.error(request, "Username already taken")
            return render(request, "register/register.html")
        
        if User.objects.filter(email=email).exists():
            messages.error(request, "Email already registered in local database")
            return render(request, "register/register.html")
        
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
            # Redirect to verify_otp
            return redirect('register:verify_otp')
        else:
            messages.error(request, "Failed to send OTP. Please check email settings.")
            OTPVerification.objects.filter(email=email).delete()
            return render(request, "register/register.html") # Template path fixed
    
    return render(request, "register/register.html") # Template path fixed

# OTP Verification View
def verify_otp_view(request):
    # NOTE: Assuming the 'landing' URL name is defined in your 'dashboard' app's urls.py
    if request.user.is_authenticated:
        return redirect('dashboard:landing')
    
    if request.method == "POST":
        email = request.POST.get("email", "").strip()
        otp_input = request.POST.get("otp", "").strip()
        
        try:
            otp_record = OTPVerification.objects.get(email=email)
            
            if otp_record.is_expired():
                messages.error(request, "OTP expired. Please register again.")
                otp_record.delete()
                return redirect('register:register')
            
            if otp_record.attempts >= 3:
                messages.error(request, "Too many attempts. Please register again.")
                otp_record.delete()
                return redirect('register:register')
            
            if otp_record.otp_code == otp_input:
                
                if not supabase:
                    messages.error(request, "Supabase service is unavailable. Cannot register.")
                    return redirect('register')

                try:
                    # 1. ATTEMPT TO REGISTER IN SUPABASE AUTH
                    user_response = supabase.auth.sign_up(
                        {
                            "email": otp_record.email,
                            "password": otp_record.password_hash,
                        }
                    )
                    
                    # 2. If Supabase signup succeeds, create the local Django user
                    user = User.objects.create_user(
                        username=otp_record.username,
                        email=otp_record.email,
                        password=otp_record.password_hash # Django hashes the password
                    )
                    
                    # Cleanup and Success
                    otp_record.delete()
                    messages.success(request, "Email verified! Account created. Please check your email for the **Supabase confirmation link** (if required) then login.")
                    return redirect('login:login') # Redirects to the login view, defined in the 'login' app

                except Exception as supabase_e:
                    error_msg = str(supabase_e)
                    
                    if "user already exists" in error_msg.lower():
                         messages.error(request, "An account with this email already exists in Supabase. Please login.")
                    else:
                        messages.error(request, f"Supabase Registration Failed. Error: {error_msg}")
                    
                    otp_record.delete()
                    return redirect('register:register')
                
            else:
                otp_record.attempts += 1
                otp_record.save()
                messages.error(request, f"Invalid OTP. {3 - otp_record.attempts} attempts remaining.")
                return render(request, "register/verify_otp.html", {"email": email}) # Template path fixed
        
        except OTPVerification.DoesNotExist:
            messages.error(request, "OTP record not found. Please register again.")
            return redirect('register:register')
    
    return render(request, "register/verify_otp.html") # Template path fixed