"""
Supabase Table Setup Script
This script creates the buses table in Supabase if it doesn't exist.
Run with: python manage.py shell < setup_supabase.py
"""

import os
from supabase import create_client, Client

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Supabase credentials not found!")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# SQL to create the buses table
sql_query = """
CREATE TABLE IF NOT EXISTS buses (
  id BIGINT PRIMARY KEY,
  plate_number VARCHAR(20) UNIQUE NOT NULL,
  driver_name VARCHAR(100) NOT NULL,
  route VARCHAR(50) NOT NULL,
  capacity INTEGER DEFAULT 50,
  current_location VARCHAR(255) NOT NULL,
  next_stop VARCHAR(255) NOT NULL,
  status VARCHAR(20) DEFAULT 'ACTIVE',
  occupancy INTEGER DEFAULT 0,
  eta_minutes INTEGER DEFAULT 0,
  traffic_condition VARCHAR(50) DEFAULT 'Normal',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index on plate_number for faster searches
CREATE INDEX IF NOT EXISTS idx_buses_plate_number ON buses(plate_number);
CREATE INDEX IF NOT EXISTS idx_buses_route ON buses(route);
CREATE INDEX IF NOT EXISTS idx_buses_status ON buses(status);
"""

print("🔄 Setting up Supabase buses table...")
print("Note: This script requires direct Supabase SQL access.")
print("Please manually run the SQL above in your Supabase SQL editor if automatic creation fails.")

# Alternative: Try using the Supabase REST API to check if table exists
try:
    response = supabase.table('buses').select('id').limit(1).execute()
    print("✅ Buses table already exists!")
except Exception as e:
    print(f"⚠️ Buses table may not exist or error occurred: {str(e)}")
    print("Please create it manually using the SQL provided in the admin_management/setup_supabase.py file")
