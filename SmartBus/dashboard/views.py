from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.http import JsonResponse
from .models import Profile, Bus # Only import from dashboard models

@login_required(login_url='core:public_landing')
def landing_view(request):
    return render(request, 'dashboard/landing.html')

@login_required(login_url='core:public_landing')
def dashboard_view(request):
    return render(request, 'dashboard/dashboard.html')

@login_required(login_url='core:public_landing')
def profile_view(request):
    profile, created = Profile.objects.get_or_create(user=request.user)

    if request.method == 'POST':
        username = request.POST.get('username').strip()
        bio = request.POST.get('bio').strip()

        if len(username) < 3:
            messages.error(request, 'Username must be at least 3 characters.')
        else:
            request.user.username = username
            request.user.save()
            profile.bio = bio
            profile.save()
            messages.success(request, 'Profile updated successfully!')

        return redirect('dashboard:profile')

    context = {
        'username': request.user.username,
        'email': request.user.email,
        'bio': profile.bio,
    }

    return render(request, 'profile/profile.html', context)

def bus_api(request):
    """API to send REAL Supabase bus data to the frontend"""
    try:
        buses = Bus.objects.all().order_by('-created_at')
        data = []
        
        for bus in buses:
            data.append({
                'id': bus.id,
                'plate_number': bus.plate_number,
                'driver_name': bus.driver_name,
                'route': bus.get_route_display(), # Gets readable route name
                'status': bus.status,
                'occupancy': bus.occupancy,
                'capacity': bus.capacity,
                'current_location': bus.current_location,
                'eta_minutes': bus.eta_minutes,
                'traffic_condition': bus.traffic_condition,
            })
        
        return JsonResponse({'success': True, 'buses': data})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})