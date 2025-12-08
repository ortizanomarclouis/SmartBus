from django.db import models

class Bus(models.Model):
    """Model for bus information"""
    ROUTE_CHOICES = [
        ('NORTH', 'North Route'),
        ('SOUTH', 'South Route'),
        ('EAST', 'East Route'),
        ('WEST', 'West Route'),
        ('CENTRAL', 'Central Hub'),
    ]
    
    STATUS_CHOICES = [
        ('ACTIVE', 'Active'),
        ('INACTIVE', 'Inactive'),
        ('MAINTENANCE', 'Maintenance'),
    ]
    
    plate_number = models.CharField(max_length=20, unique=True, verbose_name="Plate Number")
    driver_name = models.CharField(max_length=100, verbose_name="Driver Name")
    route = models.CharField(max_length=50, choices=ROUTE_CHOICES, verbose_name="Route")
    capacity = models.IntegerField(default=50, verbose_name="Seat Capacity")
    current_location = models.CharField(max_length=255, verbose_name="Current Location")
    next_stop = models.CharField(max_length=255, verbose_name="Next Stop")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ACTIVE', verbose_name="Status")
    occupancy = models.IntegerField(default=0, verbose_name="Current Occupancy")
    eta_minutes = models.IntegerField(default=0, verbose_name="ETA (minutes)")
    traffic_condition = models.CharField(
        max_length=50, 
        default='Normal',
        choices=[('Light', 'Light'), ('Normal', 'Normal'), ('Heavy', 'Heavy')],
        verbose_name="Traffic Condition"
    )
    last_updated = models.DateTimeField(auto_now=True, verbose_name="Last Updated")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Created At")
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = "Bus"
        verbose_name_plural = "Buses"
    
    def __str__(self):
        return f"{self.plate_number} - {self.route}"
