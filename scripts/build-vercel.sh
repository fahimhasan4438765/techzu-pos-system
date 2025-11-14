#!/bin/bash
echo "Running Prisma generate..."
cd api
npx prisma generate
echo "Prisma client generated successfully!"