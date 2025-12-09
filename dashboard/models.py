from django.db import models
from django.contrib.auth.models import User

# --- BUS MODEL ---
class Bus(models.Model):
    plate_number = models.CharField(max_length=20, unique=True)
    driver_name = models.CharField(max_length=100)
    
    ROUTE_CHOICES = [
        ('USC-Main', 'University of San Carlos (USC - Main)'),
        ('CIT-U', 'Cebu Institute of Technology - University (CIT-U)'),
        ('USJR', 'University of San Jose - Recoletos (USJR)'),
        ('UP-Cebu', 'University of the Philippines Cebu (UP Cebu - Lahug)'),
        ('UV', 'University of the Visayas (UV - Colon St.)'),
        # Add more routes if needed
    ]
    
    STATUS_CHOICES = [
        ('Occupiable', 'Occupiable'),
        ('Fully Occupied', 'Fully Occupied'),
        ('Maintenance', 'Maintenance'),
    ]

    TRAFFIC_CHOICES = [
        ('Normal', 'Normal'),
        ('Heavy', 'Heavy'),
        ('Light', 'Light'),
    ]

    route = models.CharField(max_length=100, choices=ROUTE_CHOICES)
    current_location = models.CharField(max_length=255)
    next_stop = models.CharField(max_length=255)
    capacity = models.IntegerField(default=50)
    occupancy = models.IntegerField(default=0)
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='Occupiable')
    eta_minutes = models.IntegerField(default=0)
    traffic_condition = models.CharField(max_length=50, choices=TRAFFIC_CHOICES, default='Normal')
    
    # Tracking updates
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.plate_number} - {self.driver_name}"

# --- PROFILE MODEL ---
class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    bio = models.TextField(max_length=500, blank=True)
    location = models.CharField(max_length=30, blank=True)
    birth_date = models.DateField(null=True, blank=True)
    
    def __str__(self):
        return f"{self.user.username}'s Profile"