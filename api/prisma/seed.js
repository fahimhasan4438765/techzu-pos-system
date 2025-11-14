const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create admin user
  const adminPasswordHash = await bcrypt.hash('admin123', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@techzu.com' },
    update: {},
    create: {
      email: 'admin@techzu.com',
      passwordHash: adminPasswordHash,
      role: 'ADMIN',
    },
  });

  // Create cashier user
  const cashierPasswordHash = await bcrypt.hash('cashier123', 12);
  const cashier = await prisma.user.upsert({
    where: { email: 'cashier@techzu.com' },
    update: {},
    create: {
      email: 'cashier@techzu.com',
      passwordHash: cashierPasswordHash,
      role: 'CASHIER',
    },
  });

  console.log('👤 Created users:', { admin: admin.email, cashier: cashier.email });

  // Create sample products across 3 categories
  const products = [
    // Beverages Category
    {
      sku: 'BEV001',
      name: 'Premium Coffee',
      priceCents: 450, // $4.50
      category: 'Beverages',
      taxRate: 8.25,
      imageUrl: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=300',
    },
    {
      sku: 'BEV002',
      name: 'Green Tea Latte',
      priceCents: 525, // $5.25
      category: 'Beverages',
      taxRate: 8.25,
      imageUrl: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=300',
    },
    {
      sku: 'BEV003',
      name: 'Fresh Orange Juice',
      priceCents: 375, // $3.75
      category: 'Beverages',
      taxRate: 8.25,
      imageUrl: 'https://images.unsplash.com/photo-1546173159-315724a31696?w=300',
    },
    {
      sku: 'BEV004',
      name: 'Sparkling Water',
      priceCents: 225, // $2.25
      category: 'Beverages',
      taxRate: 8.25,
      imageUrl: 'https://images.unsplash.com/photo-1523362628745-0c100150b504?w=300',
    },

    // Food Category
    {
      sku: 'FOOD001',
      name: 'Artisan Sandwich',
      priceCents: 1295, // $12.95
      category: 'Food',
      taxRate: 8.25,
      imageUrl: 'https://images.unsplash.com/photo-1539252554453-80ab65ce3586?w=300',
    },
    {
      sku: 'FOOD002',
      name: 'Caesar Salad',
      priceCents: 1150, // $11.50
      category: 'Food',
      taxRate: 8.25,
      imageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=300',
    },
    {
      sku: 'FOOD003',
      name: 'Margherita Pizza Slice',
      priceCents: 695, // $6.95
      category: 'Food',
      taxRate: 8.25,
      imageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=300',
    },
    {
      sku: 'FOOD004',
      name: 'Chocolate Croissant',
      priceCents: 485, // $4.85
      category: 'Food',
      taxRate: 8.25,
      imageUrl: 'https://images.unsplash.com/photo-1555507036-ab794f629d70?w=300',
    },

    // Retail Category
    {
      sku: 'RETAIL001',
      name: 'Coffee Beans (1lb)',
      priceCents: 1895, // $18.95
      category: 'Retail',
      taxRate: 8.25,
      imageUrl: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=300',
    },
    {
      sku: 'RETAIL002',
      name: 'Ceramic Travel Mug',
      priceCents: 2450, // $24.50
      category: 'Retail',
      taxRate: 8.25,
      imageUrl: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=300',
    },
    {
      sku: 'RETAIL003',
      name: 'Organic Honey (16oz)',
      priceCents: 1275, // $12.75
      category: 'Retail',
      taxRate: 8.25,
      imageUrl: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=300',
    },
    {
      sku: 'RETAIL004',
      name: 'Gift Card ($25)',
      priceCents: 2500, // $25.00
      category: 'Retail',
      taxRate: 0.00, // Gift cards typically not taxed
      imageUrl: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=300',
    },
  ];

  console.log('🛍️ Creating products...');
  
  for (const productData of products) {
    await prisma.product.upsert({
      where: { sku: productData.sku },
      update: productData,
      create: productData,
    });
  }

  // Create a sample order
  const sampleOrder = await prisma.order.create({
    data: {
      cashierId: cashier.id,
      paymentMethod: 'CARD',
      subtotalCents: 1645, // $16.45
      taxCents: 136, // $1.36
      totalCents: 1781, // $17.81
      status: 'COMPLETED',
      orderItems: {
        create: [
          {
            productId: (await prisma.product.findUnique({ where: { sku: 'BEV001' } })).id,
            qty: 2,
            unitPriceCents: 450,
            taxRate: 8.25,
            lineTotalCents: 900,
          },
          {
            productId: (await prisma.product.findUnique({ where: { sku: 'FOOD004' } })).id,
            qty: 1,
            unitPriceCents: 485,
            taxRate: 8.25,
            lineTotalCents: 485,
          },
          {
            productId: (await prisma.product.findUnique({ where: { sku: 'BEV004' } })).id,
            qty: 1,
            unitPriceCents: 225,
            taxRate: 8.25,
            lineTotalCents: 225,
          },
        ],
      },
    },
    include: {
      orderItems: {
        include: {
          product: true,
        },
      },
    },
  });

  console.log('✅ Database seeded successfully!');
  console.log('📊 Summary:');
  console.log(`   • Users: 2 (1 admin, 1 cashier)`);
  console.log(`   • Products: ${products.length} (across 3 categories)`);
  console.log(`   • Sample order: ${sampleOrder.id}`);
  console.log('');
  console.log('🔑 Login Credentials:');
  console.log('   Admin: admin@techzu.com / admin123');
  console.log('   Cashier: cashier@techzu.com / cashier123');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });