#!/bin/bash

# Migration script from Supabase to Local PostgreSQL
# Run this script to migrate your data

echo "🚀 Starting migration from Supabase to Local PostgreSQL..."

# Check if required environment variables are set
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "❌ Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set"
    exit 1
fi

if [ -z "$POSTGRES_HOST" ] || [ -z "$POSTGRES_DATABASE" ] || [ -z "$POSTGRES_USER" ]; then
    echo "❌ Error: PostgreSQL connection variables must be set"
    exit 1
fi

# Step 1: Create local PostgreSQL database schema
echo "📋 Creating PostgreSQL database schema..."
psql -h $POSTGRES_HOST -U $POSTGRES_USER -d $POSTGRES_DATABASE -f scripts/postgresql_migration.sql

if [ $? -eq 0 ]; then
    echo "✅ Database schema created successfully"
else
    echo "❌ Error creating database schema"
    exit 1
fi

# Step 2: Export data from Supabase (you'll need to implement this based on your data)
echo "📤 Exporting data from Supabase..."
echo "⚠️  Manual step required: Export your data from Supabase dashboard or use pg_dump"
echo "   1. Go to your Supabase dashboard"
echo "   2. Navigate to Settings > Database"
echo "   3. Use the connection string to export data with pg_dump"
echo "   4. Import the data to your local PostgreSQL database"

# Step 3: Update environment variables
echo "🔧 Update your environment variables:"
echo "   Remove: SUPABASE_* variables"
echo "   Add: POSTGRES_* variables for local connection"

echo "✅ Migration preparation complete!"
echo "📝 Next steps:"
echo "   1. Export your data from Supabase"
echo "   2. Import data to local PostgreSQL"
echo "   3. Update environment variables"
echo "   4. Test the application with local database"
