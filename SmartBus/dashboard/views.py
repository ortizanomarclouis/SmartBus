from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.http import JsonResponse
from .models import Profile
from django.contrib.auth.models import User
from core.models import Bus

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

@login_required(login_url='core:public_landing')
def get_buses_api(request):
    buses = Bus.objects.all().values(
        'id', 'plate_number', 'driver_name', 'current_location',
        'next_stop', 'eta_minutes', 'status', 'occupancy', 'traffic_condition'
    )
    return JsonResponse({'success': True, 'buses': list(buses)})
