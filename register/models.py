from django.db import models
from django.utils import timezone
from datetime import timedelta

# OTP Model for Email Verification
class OTPVerification(models.Model):
    email = models.EmailField(unique=True)
    otp_code = models.CharField(max_length=6)
    username = models.CharField(max_length=150)
    password_hash = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    is_verified = models.BooleanField(default=False)
    attempts = models.IntegerField(default=0)
    
    def is_expired(self):
        from django.conf import settings
        expiry_time = self.created_at + timedelta(minutes=settings.OTP_EXPIRY_MINUTES)
        return timezone.now() > expiry_time
    
    def __str__(self):
        return f"OTP for {self.email}"
