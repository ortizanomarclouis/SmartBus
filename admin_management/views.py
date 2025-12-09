from django.shortcuts import render, redirect, get_object_or_404
from django.contrib import messages
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.contrib.auth.models import User
from .models import AdminProfile
from dashboard.models import Bus  # Importing Bus only once from the correct place

def admin_required(view_func):
    """Decorator to check if user is admin"""
    def wrapper(request, *args, **kwargs):
        if not request.user.is_authenticated:
            return redirect('login:login')
        try:
            admin_profile = AdminProfile.objects.get(user=request.user, is_admin=True)
        except AdminProfile.DoesNotExist:
            messages.error(request, "Access Denied.")
            return redirect('dashboard:landing')
        return view_func(request, *args, **kwargs)
    return wrapper

@admin_required
def dashboard(request):
    """Main Admin Dashboard View"""
    total_buses = Bus.objects.count()
    active_buses = Bus.objects.filter(status='Occupiable').count() + Bus.objects.filter(status='Fully Occupied').count()
    maintenance_buses = Bus.objects.filter(status='Maintenance').count()
    recent_buses = Bus.objects.all().order_by('-id')[:5]

    context = {
        'total_buses': total_buses,
        'active_buses': active_buses,
        'maintenance_buses': maintenance_buses,
        'buses': recent_buses,
        'active_section': 'dashboard'
    }
    return render(request, 'admin_management/admin_dashboard.html', context)

@admin_required
def bus_list(request):
    """List all buses with filtering"""
    buses = Bus.objects.all().order_by('-created_at')
    
    status_filter = request.GET.get('status')
    route_filter = request.GET.get('route')
    search_query = request.GET.get('search')
    
    if status_filter:
        buses = buses.filter(status=status_filter)
    if route_filter:
        buses = buses.filter(route=route_filter)
    if search_query:
        buses = buses.filter(plate_number__icontains=search_query) | \
                buses.filter(driver_name__icontains=search_query)

    context = {
        'buses': buses,
        'status_choices': Bus.STATUS_CHOICES,
        'route_choices': Bus.ROUTE_CHOICES,
        'active_section': 'bus_list',
        'search_query': search_query or '',
        'status_filter': status_filter or '',
        'route_filter': route_filter or ''
    }
    return render(request, 'admin_management/bus_list.html', context)

@admin_required
def bus_create(request):
    """Add a new bus"""
    if request.method == 'POST':
        try:
            Bus.objects.create(
                plate_number=request.POST.get('plate_number'),
                driver_name=request.POST.get('driver_name'),
                route=request.POST.get('route'),
                status=request.POST.get('status'),
                capacity=request.POST.get('capacity', 50),
                occupancy=request.POST.get('occupancy', 0),
                current_location=request.POST.get('current_location'),
                next_stop=request.POST.get('next_stop'),
                eta_minutes=request.POST.get('eta_minutes', 0),
                traffic_condition=request.POST.get('traffic_condition', 'Normal')
            )
            messages.success(request, "Bus created successfully!")
            return redirect('admin_management:bus_list')
        except Exception as e:
            messages.error(request, f"Error creating bus: {str(e)}")
            
    context = {
        'route_choices': Bus.ROUTE_CHOICES,
        'status_choices': Bus.STATUS_CHOICES,
        'traffic_choices': Bus.TRAFFIC_CHOICES,
        'active_section': 'bus_create'
    }
    return render(request, 'admin_management/bus_form.html', context)

@admin_required
def bus_edit(request, pk):
    """Edit an existing bus"""
    bus = get_object_or_404(Bus, pk=pk)
    
    if request.method == 'POST':
        try:
            bus.plate_number = request.POST.get('plate_number')
            bus.driver_name = request.POST.get('driver_name')
            bus.route = request.POST.get('route')
            bus.status = request.POST.get('status')
            bus.capacity = request.POST.get('capacity')
            bus.occupancy = request.POST.get('occupancy')
            bus.current_location = request.POST.get('current_location')
            bus.next_stop = request.POST.get('next_stop')
            bus.eta_minutes = request.POST.get('eta_minutes')
            bus.traffic_condition = request.POST.get('traffic_condition')
            bus.save()
            
            messages.success(request, "Bus updated successfully!")
            return redirect('admin_management:bus_list')
        except Exception as e:
            messages.error(request, f"Error updating bus: {str(e)}")

    context = {
        'bus': bus,
        'is_edit': True,
        'route_choices': Bus.ROUTE_CHOICES,
        'status_choices': Bus.STATUS_CHOICES,
        'traffic_choices': Bus.TRAFFIC_CHOICES,
    }
    return render(request, 'admin_management/bus_form.html', context)

@admin_required
def bus_detail(request, pk):
    """View bus details"""
    bus = get_object_or_404(Bus, pk=pk)
    return render(request, 'admin_management/bus_detail.html', {'bus': bus})

@admin_required
def bus_delete(request, pk):
    """Delete a bus"""
    bus = get_object_or_404(Bus, pk=pk)
    
    if request.method == 'POST':
        bus.delete()
        messages.success(request, "Bus deleted successfully.")
        return redirect('admin_management:bus_list')
        
    return render(request, 'admin_management/bus_confirm_delete.html', {'bus': bus})

@admin_required
def user_list(request):
    """Display all registered users"""
    users = User.objects.all().order_by('-date_joined')
    context = {
        'users': users,
        'total_users': users.count(),
        'active_section': 'users'
    }
    return render(request, 'admin_management/user_list.html', context)

@admin_required
def user_delete(request, user_id):
    """Delete a user account"""
    user_to_delete = get_object_or_404(User, id=user_id)
    if user_to_delete.is_superuser:
        messages.error(request, "Cannot delete a superuser account.")
        return redirect('admin_management:user_list')
    if request.method == 'POST':
        user_to_delete.delete()
        messages.success(request, "User deleted.")
        return redirect('admin_management:user_list')
    return render(request, 'admin_management/user_confirm_delete.html', {'object': user_to_delete})

@admin_required
def user_edit(request, user_id):
    """Edit an existing user (User Story 2 & 4)"""
    user_to_edit = get_object_or_404(User, id=user_id)
    
    # Try to get or create profile safely
    profile, created = AdminProfile.objects.get_or_create(user=user_to_edit)

    if request.method == 'POST':
        username = request.POST.get('username')
        email = request.POST.get('email')
        is_admin = request.POST.get('is_admin') == 'on'

        # User Story 4: Invalid Data Update
        if not username or not email:
            messages.error(request, "Username and Email are required.")
            return render(request, 'admin_management/user_form.html', {
                'edit_user': user_to_edit,
                'is_admin_user': profile.is_admin
            })

        try:
            # Update User model
            user_to_edit.username = username
            user_to_edit.email = email
            user_to_edit.save()

            # Update Admin Profile
            profile.is_admin = is_admin
            profile.save()

            messages.success(request, f"User {username} updated successfully!")
            return redirect('admin_management:user_list')
        
        except Exception as e:
            messages.error(request, f"Error updating user: {str(e)}")

    context = {
        'edit_user': user_to_edit,
        'is_admin_user': profile.is_admin,
        'active_section': 'users'
    }
    return render(request, 'admin_management/user_form.html', context)