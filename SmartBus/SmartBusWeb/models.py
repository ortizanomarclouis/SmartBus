from django.db import models

# SmartBusWeb/models.py
from django.db import models

# Represents a Bus
class Bus(models.Model):
    plate_number = models.CharField(max_length=20, unique=True)
    driver_name = models.CharField(max_length=50)
    capacity = models.IntegerField()
    status = models.CharField(max_length=20, default='Inactive')  # Active, Inactive

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
    order = models.IntegerField()  # stop sequence

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
