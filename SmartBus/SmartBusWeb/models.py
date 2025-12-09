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


# Represents a Bus
class Bus(models.Model):
    plate_number = models.CharField(max_length=20, unique=True)
    driver_name = models.CharField(max_length=50)
    capacity = models.IntegerField()
    status = models.CharField(max_length=20, default='Inactive')

    def __str__(self):
        return f"{self.plate_number} - {self.driver_name}"


# Represents a Bus Stop or Station
class Stop(models.Model):
    name = models.CharField(max_length=50)
    latitude = models.FloatField()
    longitude = models.FloatField()

    def __str__(self):
        return self.name


# Represents the Route of a Bus
class Route(models.Model):
    bus = models.ForeignKey(Bus, on_delete=models.CASCADE, related_name='routes')
    stops = models.ManyToManyField(Stop, through='RouteStop')
    start_time = models.TimeField()
    end_time = models.TimeField()

    def __str__(self):
        return f"Route for {self.bus.plate_number}"


# Intermediate table for ordering stops in a route
class RouteStop(models.Model):
    route = models.ForeignKey(Route, on_delete=models.CASCADE)
    stop = models.ForeignKey(Stop, on_delete=models.CASCADE)
    order = models.IntegerField()

    class Meta:
        unique_together = ('route', 'stop')
        ordering = ['order']


# Real-time location data of the bus
class BusLocation(models.Model):
    bus = models.ForeignKey(Bus, on_delete=models.CASCADE)
    latitude = models.FloatField()
    longitude = models.FloatField()
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.bus.plate_number} at {self.timestamp}"