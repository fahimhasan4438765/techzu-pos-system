#!/bin/bash

# Wait for PostgreSQL to be ready
echo "🔄 Waiting for PostgreSQL to be ready..."
until docker-compose exec postgres pg_isready -U techzu_user -d techzu_pos > /dev/null 2>&1; do
  sleep 1
done

echo "✅ PostgreSQL is ready!"

# Push the database schema
echo "🔧 Pushing database schema..."
cd api && pnpm prisma db push

# Seed the database
echo "🌱 Seeding database..."
pnpm db:seed

echo "🎉 Database setup complete!"
echo ""
echo "🔑 Login Credentials:"
echo "   Admin: admin@techzu.com / admin123"
echo "   Cashier: cashier@techzu.com / cashier123"