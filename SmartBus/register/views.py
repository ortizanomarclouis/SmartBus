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

# Constants to avoid duplication
REGISTER_TEMPLATE = "register/register.html"
VERIFY_OTP_TEMPLATE = "register/verify_otp.html"
REGISTER_URL = 'register:register'
LOGIN_URL = 'login:login'
DASHBOARD_URL = 'dashboard:landing'

# ====================================================================
# SUPABASE INITIALIZATION
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_ANON_KEY")

if SUPABASE_URL and SUPABASE_KEY:
    try:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        print(" Supabase client initialized successfully!")
    except Exception as e:
        print("❌ Error initializing Supabase client: " + str(e))
        supabase = None
else:
    print("❌ WARNING: SUPABASE_URL or SUPABASE_ANON_KEY not found in environment.")
    print("   SUPABASE_URL: " + str(SUPABASE_URL))
    print("   SUPABASE_ANON_KEY: " + str(SUPABASE_KEY))
    supabase = None
# ====================================================================


def generate_otp():
    """Generate 6-digit OTP"""
    return ''.join(random.choices(string.digits, k=6))


def send_otp_email(email, otp_code):
    """Send OTP via email"""
    try:
        separator = "=" * 60
        print("\n" + separator)
        print(" ATTEMPTING TO SEND OTP EMAIL")
        print(" TO: " + email)
        print(" OTP CODE: " + otp_code)
        print(" VALID FOR: 10 minutes")
        print(" FROM: " + str(settings.EMAIL_HOST_USER))
        print(separator + "\n")
        
        subject = "SmartBus Email Verification - OTP Code"
        message = """Hello,

Your SmartBus OTP verification code is:

{code}

This code will expire in 10 minutes.

Do not share this code with anyone.

Best regards,
SmartBus Team
""".format(code=otp_code)
        
        # Check if email settings are configured
        if not settings.EMAIL_HOST_USER or not settings.EMAIL_HOST_PASSWORD:
            print("❌ ERROR: Email settings not configured in .env file!")
            print("   EMAIL_HOST_USER: " + str(settings.EMAIL_HOST_USER))
            password_display = '***' if settings.EMAIL_HOST_PASSWORD else 'NOT SET'
            print("   EMAIL_HOST_PASSWORD: " + password_display)
            return False
        
        print(" Sending email from: " + str(settings.EMAIL_HOST_USER))
        print(" Sending email to: " + email)
        
        # Send email
        send_mail(
            subject,
            message,
            settings.EMAIL_HOST_USER,
            [email],
            fail_silently=False,
        )
        
        print("✅ EMAIL SENT SUCCESSFULLY to " + email)
        print("✅ Please check inbox and spam folder\n")
        return True
        
    except Exception as e:
        print("\n❌ FAILED TO SEND EMAIL!")
        print("   Error Type: " + type(e).__name__)
        print("   Error Message: " + str(e))
        print("\n TROUBLESHOOTING:")
        print("   1. Check if App Password is correct in .env")
        print("   2. Verify 2-Step Verification is enabled on Gmail")
        print("   3. Make sure there are no spaces in the App Password")
        print("   4. Try generating a new App Password\n")
        return False


def register_view(request):
    """Handle user registration"""
    if request.user.is_authenticated:
        return redirect(DASHBOARD_URL)
    
    if request.method == "POST":
        username = request.POST.get("username", "").strip()
        email = request.POST.get("email", "").strip()
        password1 = request.POST.get("password1", "").strip()
        password2 = request.POST.get("password2", "").strip()
        
        # Validation
        if not username or not email or not password1:
            messages.error(request, "All fields are required")
            return render(request, REGISTER_TEMPLATE)
        
        if password1 != password2:
            messages.error(request, "Passwords do not match")
            return render(request, REGISTER_TEMPLATE)
        
        if User.objects.filter(username=username).exists():
            messages.error(request, "Username already taken")
            return render(request, REGISTER_TEMPLATE)
        
        if User.objects.filter(email=email).exists():
            messages.error(request, "Email already registered in local database")
            return render(request, REGISTER_TEMPLATE)
        
        # Generate OTP
        otp_code = generate_otp()
        
        # Delete old OTP if exists
        OTPVerification.objects.filter(email=email).delete()
        
        # Create new OTP record
        OTPVerification.objects.create(
            email=email,
            otp_code=otp_code,
            username=username,
            password_hash=password1
        )
        
        # Send OTP Email
        if send_otp_email(email, otp_code):
            success_msg = " OTP sent to {email}! Please check your inbox and spam folder.".format(email=email)
            messages.success(request, success_msg)
            return redirect('register:verify_otp')
        
        messages.error(request, "❌ Failed to send OTP email. Please check console for details or try again.")
        OTPVerification.objects.filter(email=email).delete()
        return render(request, REGISTER_TEMPLATE)
    
    return render(request, REGISTER_TEMPLATE)


def verify_otp_view(request):
    """Handle OTP verification"""
    if request.user.is_authenticated:
        return redirect(DASHBOARD_URL)
    
    if request.method != "POST":
        return render(request, VERIFY_OTP_TEMPLATE)
    
    email = request.POST.get("email", "").strip()
    otp_input = request.POST.get("otp", "").strip()
    
    try:
        otp_record = OTPVerification.objects.get(email=email)
    except OTPVerification.DoesNotExist:
        messages.error(request, "OTP record not found. Please register again.")
        return redirect(REGISTER_URL)
    
    # Check if OTP expired
    if otp_record.is_expired():
        messages.error(request, "OTP expired. Please register again.")
        otp_record.delete()
        return redirect(REGISTER_URL)
    
    # Check attempts
    if otp_record.attempts >= 3:
        messages.error(request, "Too many attempts. Please register again.")
        otp_record.delete()
        return redirect(REGISTER_URL)
    
    # Verify OTP
    if otp_record.otp_code != otp_input:
        otp_record.attempts += 1
        otp_record.save()
        remaining = 3 - otp_record.attempts
        messages.error(request, "Invalid OTP. {remaining} attempts remaining.".format(remaining=remaining))
        return render(request, VERIFY_OTP_TEMPLATE, {"email": email})
    
    # OTP is correct - proceed with registration
    if not supabase:
        messages.error(request, "Supabase service is unavailable. Cannot register.")
        return redirect(REGISTER_URL)
    
    try:
        print("\n🔄 Attempting Supabase signup for: " + otp_record.email)
        
        # Register in Supabase
        user_response = supabase.auth.sign_up({
            "email": otp_record.email,
            "password": otp_record.password_hash,
        })
        
        print(" Supabase signup successful for: " + otp_record.email)
        print("   Response: " + str(user_response))
        
        # Create local Django user
        User.objects.create_user(
            username=otp_record.username,
            email=otp_record.email,
            password=otp_record.password_hash
        )
        
        print(" Django user created for: " + otp_record.username)
        
        # Cleanup
        otp_record.delete()
        messages.success(request, "Email verified! Account created. Please login.")
        return redirect(LOGIN_URL)
    
    except Exception as supabase_e:
        error_msg = str(supabase_e)
        print("\n❌ Supabase registration failed!")
        print("   Error: " + error_msg + "\n")
        
        if "user already exists" in error_msg.lower():
            messages.error(request, "An account with this email already exists in Supabase. Please login.")
        else:
            messages.error(request, "Supabase Registration Failed. Error: " + error_msg)
        
        otp_record.delete()
        return redirect(REGISTER_URL)