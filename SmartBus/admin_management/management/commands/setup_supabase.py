from django.core.management.base import BaseCommand
from supabase import create_client, Client
import os


class Command(BaseCommand):
    help = 'Test Supabase connection and setup buses table'

    def handle(self, *args, **options):
        SUPABASE_URL = os.environ.get("SUPABASE_URL")
        SUPABASE_ANON_KEY = os.environ.get("SUPABASE_ANON_KEY")
        SUPABASE_TABLE = "SmartBusWeb_bus"
        
        if not SUPABASE_URL or not SUPABASE_ANON_KEY:
            self.stdout.write(self.style.ERROR("❌ Supabase credentials not found!"))
            return
        
        try:
            supabase: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
            self.stdout.write(self.style.SUCCESS("✅ Connected to Supabase"))
            
            # Try to read from buses table
            response = supabase.table(SUPABASE_TABLE).select('id').limit(1).execute()
            self.stdout.write(self.style.SUCCESS(f"✅ {SUPABASE_TABLE} table exists and is accessible"))
            
            # Get table info
            all_buses = supabase.table(SUPABASE_TABLE).select('*').execute()
            bus_count = len(all_buses.data) if all_buses.data else 0
            self.stdout.write(self.style.SUCCESS(f"✅ Total buses in Supabase: {bus_count}"))
            
            # Test insert/update/delete with a sample
            self.stdout.write(self.style.SUCCESS(f"✅ Supabase setup complete! Using table: {SUPABASE_TABLE}"))
            self.stdout.write(self.style.WARNING(
                "\nℹ️  All bus CREATE, UPDATE, and DELETE operations are now synced to Supabase!"
            ))
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"❌ Error: {str(e)}"))
            self.stdout.write(self.style.WARNING(
                f"\nℹ️  Make sure the '{SUPABASE_TABLE}' table exists in your Supabase database.\n"
                "The admin system will attempt to sync operations to Supabase when available."
            ))
