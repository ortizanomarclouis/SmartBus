from django.contrib import admin
from .models import Bus

@admin.register(Bus)
class BusAdmin(admin.ModelAdmin):
    list_display = ('plate_number', 'driver_name', 'route', 'status', 'occupancy', 'current_location', 'last_updated')
    list_filter = ('status', 'route', 'traffic_condition', 'last_updated')
    search_fields = ('plate_number', 'driver_name', 'route', 'current_location')
    readonly_fields = ('last_updated', 'created_at')
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('plate_number', 'driver_name', 'route', 'status')
        }),
        ('Capacity', {
            'fields': ('capacity', 'occupancy')
        }),
        ('Location & Route', {
            'fields': ('current_location', 'next_stop', 'eta_minutes')
        }),
        ('Traffic & Conditions', {
            'fields': ('traffic_condition', 'last_updated', 'created_at')
        }),
    )

