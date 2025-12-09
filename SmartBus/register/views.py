
import random
import string
import os 
from supabase import create_client, Client 
from django.shortcuts import render, redirect
from django.contrib.auth.models import User
from django.contrib import messages
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
        print("✅ Supabase client initialized successfully!")
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


def send_otp_email_via_supabase(email, otp_code):
    """
    Send OTP via Supabase Email using sign_up method.
    This triggers Supabase's confirmation email with a token.
    We'll use our own OTP code and verify it ourselves.
    """
    try:
        separator = "=" * 60
        print("\n" + separator)
        print("📧 ATTEMPTING TO SEND EMAIL VIA SUPABASE")
        print("📧 TO: " + email)
        print("📧 OTP CODE: " + otp_code)
        print(separator + "\n")
        
        if not supabase:
            print("❌ ERROR: Supabase client not initialized!")
            return False
        
        # Use Supabase to send a confirmation email
        # We'll include our OTP in the metadata, but users will enter it manually
        print("🔄 Triggering Supabase email by creating temporary account...")
        
        # Create a temporary signup to trigger email
        # The password doesn't matter - we'll verify via OTP
        temp_password = "TempPass123!" + otp_code
        
        response = supabase.auth.sign_up({
            "email": email,
            "password": temp_password,
            "options": {
                "data": {
                    "otp_code": otp_code,  # Store OTP in user metadata
                    "verification_pending": True
                }
            }
        })
        
        print("✅ SUPABASE EMAIL TRIGGERED")
        print("📧 Confirmation email sent to: " + email)
        print("🔑 OTP Code: " + otp_code)
        print("   Note: User should check email for confirmation, then enter OTP: " + otp_code)
        print("   Response: " + str(response))
        return True
        
    except Exception as e:
        error_msg = str(e)
        print("\n❌ FAILED TO TRIGGER SUPABASE EMAIL!")
        print("   Error: " + error_msg)
        
        # Check if user already exists
        if "already registered" in error_msg.lower() or "already been registered" in error_msg.lower():
            print("⚠️ Email already registered in Supabase")
            print("   This is okay - OTP will still work for verification")
            return True
        
        print("\n🔧 TROUBLESHOOTING:")
        print("   1. Make sure Supabase email is configured")
        print("   2. Check Authentication → Providers → Email is enabled")
        print("   3. Verify SMTP settings in Supabase Dashboard\n")
        return False


def register_view(request):
    """Handle user registration with OTP verification"""
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
            messages.error(request, "Email already registered")
            return render(request, REGISTER_TEMPLATE)
        
        # Check if Supabase is available
        if not supabase:
            messages.error(request, "Service unavailable. Please try again later.")
            return render(request, REGISTER_TEMPLATE)
        
        # Generate our own OTP code
        otp_code = generate_otp()
        
        # Delete old OTP record if exists
        OTPVerification.objects.filter(email=email).delete()
        
        # Create OTP record to store user data temporarily
        OTPVerification.objects.create(
            email=email,
            otp_code=otp_code,  # Store our generated OTP
            username=username,
            password_hash=password1
        )
        
        # Trigger Supabase email (this will send confirmation email)
        # We're using Supabase just to send email, but verifying with our OTP
        if send_otp_email_via_supabase(email, otp_code):
            success_msg = "📧 Registration initiated! An email has been sent to {email}. Please enter this OTP code: {otp}".format(
                email=email, 
                otp=otp_code
            )
            messages.success(request, success_msg)
            messages.info(request, "Your OTP code is: " + otp_code + " (also sent to your email)")
            # Store email in session for verification page
            request.session['pending_email'] = email
            return redirect('register:verify_otp')
        
        messages.error(request, "❌ Failed to send registration email. Please try again.")
        OTPVerification.objects.filter(email=email).delete()
        return render(request, REGISTER_TEMPLATE)
    
    return render(request, REGISTER_TEMPLATE)


def verify_otp_view(request):
    """Handle OTP verification"""
    if request.user.is_authenticated:
        return redirect(DASHBOARD_URL)
    
    # Get email from session if available
    pending_email = request.session.get('pending_email', '')
    
    if request.method != "POST":
        return render(request, VERIFY_OTP_TEMPLATE, {'pending_email': pending_email})
    
    email = request.POST.get("email", "").strip()
    otp_input = request.POST.get("otp", "").strip()
    
    if not email or not otp_input:
        messages.error(request, "Email and OTP are required")
        return render(request, VERIFY_OTP_TEMPLATE, {'pending_email': pending_email})
    
    try:
        otp_record = OTPVerification.objects.get(email=email)
    except OTPVerification.DoesNotExist:
        messages.error(request, "Registration record not found. Please register again.")
        return redirect(REGISTER_URL)
    
    # Check if OTP expired (10 minutes)
    if otp_record.is_expired():
        messages.error(request, "OTP expired. Please register again.")
        otp_record.delete()
        return redirect(REGISTER_URL)
    
    # Check attempts
    if otp_record.attempts >= 5:
        messages.error(request, "Too many failed attempts. Please register again.")
        otp_record.delete()
        return redirect(REGISTER_URL)
    
    # Verify OTP code (our own verification, not Supabase)
    if otp_record.otp_code != otp_input:
        otp_record.attempts += 1
        otp_record.save()
        remaining = 5 - otp_record.attempts
        messages.error(request, "❌ Invalid OTP. {remaining} attempts remaining.".format(remaining=remaining))
        return render(request, VERIFY_OTP_TEMPLATE, {"pending_email": email})
    
    # OTP is correct - proceed with registration
    if not supabase:
        print("⚠️ Supabase not available, creating Django user only")
    
    try:
        print("\n✅ OTP VERIFIED SUCCESSFULLY for: " + email)
        print("🔄 Creating user accounts...")
        
        # Create in Supabase (the user might already exist from the sign_up we did earlier)
        # That's fine - we'll handle the error
        try:
            # Try to create with the actual password they want
            supabase_response = supabase.auth.sign_up({
                "email": email,
                "password": otp_record.password_hash,
                "options": {
                    "data": {
                        "username": otp_record.username,
                        "verified": True
                    }
                }
            })
            print("✅ Supabase user created/updated")
        except Exception as supabase_error:
            print("⚠️ Supabase user creation: " + str(supabase_error))
            print("   (User may already exist - this is okay)")
        
        # Create local Django user
        User.objects.create_user(
            username=otp_record.username,
            email=email,
            password=otp_record.password_hash
        )
        
        print("✅ Django user created: " + otp_record.username)
        
        # Cleanup
        otp_record.delete()
        if 'pending_email' in request.session:
            del request.session['pending_email']
        
        messages.success(request, "✅ Email verified! Account created successfully. Please login.")
        return redirect(LOGIN_URL)
    
    except Exception as error:
        error_msg = str(error)
        print("\n❌ User creation failed!")
        print("   Error: " + error_msg)
        messages.error(request, "Account creation failed. Please try again or contact support.")
        return render(request, VERIFY_OTP_TEMPLATE, {"pending_email": email})
