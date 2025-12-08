from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from admin_management.models import AdminProfile

class Command(BaseCommand):
    help = 'Create an admin user for the SmartBus system'

    def add_arguments(self, parser):
        parser.add_argument('--username', type=str, default='admin', help='Admin username')
        parser.add_argument('--email', type=str, default='admin@smartbus.com', help='Admin email')
        parser.add_argument('--password', type=str, default='AdminPass123!', help='Admin password')

    def handle(self, *args, **options):
        username = options['username']
        email = options['email']
        password = options['password']

        # Check if admin user already exists
        if User.objects.filter(username=username).exists():
            self.stdout.write(
                self.style.WARNING(f'✓ Admin user "{username}" already exists!')
            )
            return

        # Create the user
        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            is_staff=True,
            is_superuser=True
        )

        # Create admin profile
        AdminProfile.objects.create(
            user=user,
            is_admin=True
        )

        self.stdout.write(
            self.style.SUCCESS(
                f'\n✓ Admin user created successfully!\n'
                f'  Username: {username}\n'
                f'  Email: {email}\n'
                f'  Password: {password}\n'
                f'  Access URL: /admin/\n'
            )
        )
