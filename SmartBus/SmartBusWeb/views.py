from django.shortcuts import render

def login_view(request):
    return render(request, "smartbus/login.html")

def register_view(request):
    return render(request, "smartbus/register.html")