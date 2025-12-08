from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from core.models import Bus
from .models import AdminProfile
import json
import os
from datetime import datetime

def check_admin(user):
    """Check if user is admin"""
    if not user.is_authenticated:
        return False
    try:
        return AdminProfile.objects.get(user=user, is_admin=True).exists()
    except AdminProfile.DoesNotExist:
        return False

def admin_required(view_func):
    """Decorator to check if user is admin"""
    def wrapper(request, *args, **kwargs):
        if not request.user.is_authenticated:
            messages.error(request, "You must be logged in.")
            return redirect('login:login')
        
        try:
            admin_profile = AdminProfile.objects.get(user=request.user, is_admin=True)
        except AdminProfile.DoesNotExist:
            messages.error(request, "You do not have permission to access this page.")
            return redirect('dashboard:landing')
        
        return view_func(request, *args, **kwargs)
    
    wrapper.__name__ = view_func.__name__
    return wrapper

# Admin Dashboard
@admin_required
def admin_dashboard(request):
    """Admin dashboard view"""
    buses = Bus.objects.all()
    total_buses = buses.count()
    active_buses = buses.filter(status='ACTIVE').count()
    maintenance_buses = buses.filter(status='MAINTENANCE').count()
    
    context = {
        'total_buses': total_buses,
        'active_buses': active_buses,
        'maintenance_buses': maintenance_buses,
        'buses': buses[:10],  # Latest 10 buses
    }
    
    return render(request, 'admin_management/admin_dashboard.html', context)

# List Buses
@admin_required
def bus_list(request):
    """List all buses"""
    buses = Bus.objects.all()
    
    # Search functionality
    search_query = request.GET.get('search', '')
    if search_query:
        buses = buses.filter(
            plate_number__icontains=search_query
        ) | buses.filter(
            driver_name__icontains=search_query
        ) | buses.filter(
            route__icontains=search_query
        )
    
    # Filter by status
    status_filter = request.GET.get('status', '')
    if status_filter:
        buses = buses.filter(status=status_filter)
    
    # Filter by route
    route_filter = request.GET.get('route', '')
    if route_filter:
        buses = buses.filter(route=route_filter)
    
    context = {
        'buses': buses,
        'search_query': search_query,
        'status_filter': status_filter,
        'route_filter': route_filter,
        'status_choices': Bus._meta.get_field('status').choices,
        'route_choices': Bus._meta.get_field('route').choices,
    }
    
    return render(request, 'admin_management/bus_list.html', context)

# Create Bus
@admin_required
def bus_create(request):
    """Create a new bus"""
    if request.method == 'POST':
        try:
            plate_number = request.POST.get('plate_number', '').strip()
            driver_name = request.POST.get('driver_name', '').strip()
            route = request.POST.get('route', '').strip()
            current_location = request.POST.get('current_location', '').strip()
            next_stop = request.POST.get('next_stop', '').strip()
            status = request.POST.get('status', 'ACTIVE').strip()
            traffic_condition = request.POST.get('traffic_condition', 'Normal').strip()
            
            # Validation - check required text fields
            if not all([plate_number, driver_name, route, current_location, next_stop]):
                messages.error(request, "All fields are required.")
                return render(request, 'admin_management/bus_form.html', {
                    'route_choices': Bus._meta.get_field('route').choices,
                    'status_choices': Bus._meta.get_field('status').choices,
                })
            
            # Check if plate number already exists
            if Bus.objects.filter(plate_number=plate_number).exists():
                messages.error(request, "Bus with this plate number already exists.")
                return render(request, 'admin_management/bus_form.html', {
                    'route_choices': Bus._meta.get_field('route').choices,
                    'status_choices': Bus._meta.get_field('status').choices,
                })
            
            # Parse numeric fields with defaults
            try:
                capacity = int(request.POST.get('capacity', '50').strip() or '50')
            except (ValueError, TypeError):
                capacity = 50
                
            try:
                occupancy = int(request.POST.get('occupancy', '0').strip() or '0')
            except (ValueError, TypeError):
                occupancy = 0
                
            try:
                eta_minutes = int(request.POST.get('eta_minutes', '0').strip() or '0')
            except (ValueError, TypeError):
                eta_minutes = 0
            
            # Create bus in local database
            bus = Bus.objects.create(
                plate_number=plate_number,
                driver_name=driver_name,
                route=route,
                capacity=int(capacity),
                current_location=current_location,
                next_stop=next_stop,
                status=status,
                occupancy=int(occupancy),
                eta_minutes=int(eta_minutes),
                traffic_condition=traffic_condition,
            )
            
            
            messages.success(request, f"Bus {plate_number} created successfully!")
            return redirect('admin_management:bus_list')
        
        except Exception as e:
            messages.error(request, f"Error creating bus: {str(e)}")
            return render(request, 'admin_management/bus_form.html', {
                'route_choices': Bus._meta.get_field('route').choices,
                'status_choices': Bus._meta.get_field('status').choices,
            })
    
    context = {
        'route_choices': Bus._meta.get_field('route').choices,
        'status_choices': Bus._meta.get_field('status').choices,
        'traffic_choices': Bus._meta.get_field('traffic_condition').choices,
    }
    
    return render(request, 'admin_management/bus_form.html', context)

# Update Bus
@admin_required
def bus_update(request, bus_id):
    """Update bus information"""
    bus = get_object_or_404(Bus, id=bus_id)
    
    if request.method == 'POST':
        try:
            bus.plate_number = request.POST.get('plate_number', bus.plate_number).strip()
            bus.driver_name = request.POST.get('driver_name', bus.driver_name).strip()
            bus.route = request.POST.get('route', bus.route).strip()
            bus.current_location = request.POST.get('current_location', bus.current_location).strip()
            bus.next_stop = request.POST.get('next_stop', bus.next_stop).strip()
            bus.status = request.POST.get('status', bus.status).strip()
            bus.traffic_condition = request.POST.get('traffic_condition', bus.traffic_condition).strip()
            
            # Parse numeric fields safely
            try:
                bus.capacity = int(request.POST.get('capacity', str(bus.capacity)).strip() or str(bus.capacity))
            except (ValueError, TypeError):
                bus.capacity = 50
                
            try:
                bus.occupancy = int(request.POST.get('occupancy', str(bus.occupancy)).strip() or str(bus.occupancy))
            except (ValueError, TypeError):
                bus.occupancy = 0
                
            try:
                bus.eta_minutes = int(request.POST.get('eta_minutes', str(bus.eta_minutes)).strip() or str(bus.eta_minutes))
            except (ValueError, TypeError):
                bus.eta_minutes = 0
            
            bus.save()
            
            messages.success(request, f"Bus {bus.plate_number} updated successfully!")
            return redirect('admin_management:bus_list')
        
        except Exception as e:
            messages.error(request, f"Error updating bus: {str(e)}")
    
    context = {
        'bus': bus,
        'route_choices': Bus._meta.get_field('route').choices,
        'status_choices': Bus._meta.get_field('status').choices,
        'traffic_choices': Bus._meta.get_field('traffic_condition').choices,
        'is_edit': True,
    }
    
    return render(request, 'admin_management/bus_form.html', context)

# Delete Bus
@admin_required
def bus_delete(request, bus_id):
    """Delete a bus"""
    bus = get_object_or_404(Bus, id=bus_id)
    plate_number = bus.plate_number
    
    if request.method == 'POST':
        try:
            # Delete from local database
            bus.delete()
            messages.success(request, f"Bus {plate_number} deleted successfully!")
            return redirect('admin_management:bus_list')
        
        except Exception as e:
            messages.error(request, f"Error deleting bus: {str(e)}")
            return redirect('admin_management:bus_list')
    
    context = {
        'bus': bus,
    }
    
    return render(request, 'admin_management/bus_confirm_delete.html', context)

# Bus Detail
@admin_required
def bus_detail(request, bus_id):
    """View bus details"""
    bus = get_object_or_404(Bus, id=bus_id)
    
    context = {
        'bus': bus,
    }
    
    return render(request, 'admin_management/bus_detail.html', context)

# API endpoint for stats
@admin_required
@require_http_methods(["GET"])
def get_bus_stats(request):
    """Get bus statistics as JSON"""
    total_buses = Bus.objects.count()
    active_buses = Bus.objects.filter(status='ACTIVE').count()
    maintenance_buses = Bus.objects.filter(status='MAINTENANCE').count()
    inactive_buses = Bus.objects.filter(status='INACTIVE').count()
    
    # Calculate occupancy stats
    all_occupancy = list(Bus.objects.values_list('occupancy', flat=True))
    avg_occupancy = sum(all_occupancy) / len(all_occupancy) if all_occupancy else 0
    
    data = {
        'total_buses': total_buses,
        'active_buses': active_buses,
        'maintenance_buses': maintenance_buses,
        'inactive_buses': inactive_buses,
        'avg_occupancy': round(avg_occupancy, 2),
    }
    
    return JsonResponse(data)
