const express = require('express');
const prisma = require('../lib/prisma');
const { authenticateToken, requireCashierOrAdmin } = require('../middleware/auth');

const router = express.Router();

// Bulk sync orders from offline POS
router.post('/orders', authenticateToken, requireCashierOrAdmin, async (req, res, next) => {
  try {
    const { orders } = req.body;
    const cashierId = req.user.userId;

    if (!orders || !Array.isArray(orders) || orders.length === 0) {
      return res.status(422).json({
        error: 'Orders array is required'
      });
    }

    const results = [];

    // Process each order
    for (const orderData of orders) {
      try {
        const { tempId, payload } = orderData;

        if (!tempId || !payload) {
          results.push({
            tempId: tempId || 'unknown',
            status: 'error',
            error: 'tempId and payload are required'
          });
          continue;
        }

        const { paymentMethod, items, clientCreatedAt } = payload;

        // Validation
        if (!paymentMethod || !items || !Array.isArray(items) || items.length === 0) {
          results.push({
            tempId,
            status: 'error',
            error: 'Payment method and items array are required'
          });
          continue;
        }

        if (!['CASH', 'CARD', 'QR'].includes(paymentMethod.toUpperCase())) {
          results.push({
            tempId,
            status: 'error',
            error: 'Invalid payment method'
          });
          continue;
        }

        // Validate and fetch products
        const productIds = items.map(item => item.productId);
        const products = await prisma.product.findMany({
          where: {
            id: { in: productIds }
          }
        });

        // Filter out inactive/missing products but continue with valid ones
        const validItems = items.filter(item => 
          products.find(p => p.id === item.productId)
        );

        if (validItems.length === 0) {
          results.push({
            tempId,
            status: 'error',
            error: 'No valid products found'
          });
          continue;
        }

        // Calculate totals
        let subtotalCents = 0;
        let taxCents = 0;

        const orderItemsData = validItems.map(item => {
          const product = products.find(p => p.id === item.productId);
          
          const unitPriceCents = product.priceCents;
          const lineTotalCents = unitPriceCents * (item.qty || 1);
          const lineTaxCents = Math.round(lineTotalCents * (product.taxRate / 100));

          subtotalCents += lineTotalCents;
          taxCents += lineTaxCents;

          return {
            productId: product.id,
            qty: item.qty || 1,
            unitPriceCents,
            taxRate: product.taxRate,
            lineTotalCents
          };
        });

        const totalCents = subtotalCents + taxCents;

        // Create order
        const order = await prisma.order.create({
          data: {
            cashierId,
            paymentMethod: paymentMethod.toUpperCase(),
            subtotalCents,
            taxCents,
            totalCents,
            status: 'COMPLETED',
            ...(clientCreatedAt && { createdAt: new Date(clientCreatedAt) }),
            orderItems: {
              create: orderItemsData
            }
          }
        });

        results.push({
          tempId,
          orderId: order.id,
          status: 'ok',
          totals: {
            subtotal: subtotalCents / 100,
            tax: taxCents / 100,
            total: totalCents / 100
          },
          ...(validItems.length < items.length && {
            warning: `${items.length - validItems.length} invalid items were skipped`
          })
        });

      } catch (error) {
        console.error(`Error processing order ${orderData.tempId}:`, error);
        results.push({
          tempId: orderData.tempId || 'unknown',
          status: 'error',
          error: error.message
        });
      }
    }

    res.json({ results });
  } catch (error) {
    next(error);
  }
});

// Get sync status/info
router.get('/status', authenticateToken, requireCashierOrAdmin, async (req, res, next) => {
  try {
    const cashierId = req.user.userId;

    // Get recent stats
    const stats = await prisma.order.aggregate({
      where: {
        cashierId,
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      },
      _count: {
        id: true
      },
      _sum: {
        totalCents: true
      }
    });

    const totalProducts = await prisma.product.count();
    const totalCategories = await prisma.product.findMany({
      select: { category: true },
      distinct: ['category']
    });

    res.json({
      syncStatus: 'healthy',
      timestamp: new Date().toISOString(),
      cashierStats: {
        ordersLast24h: stats._count.id || 0,
        salesLast24h: (stats._sum.totalCents || 0) / 100
      },
      catalog: {
        totalProducts,
        totalCategories: totalCategories.length
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get products for offline sync
router.get('/products', async (req, res, next) => {
  try {
    const { lastSync } = req.query;

    const where = lastSync ? {
      updatedAt: {
        gte: new Date(lastSync)
      }
    } : {};

    const products = await prisma.product.findMany({
      where,
      orderBy: [
        { category: 'asc' },
        { name: 'asc' }
      ]
    });

    // Convert cents to dollars
    const productsWithDollarPrices = products.map(product => ({
      ...product,
      price: product.priceCents / 100
    }));

    res.json({
      products: productsWithDollarPrices,
      syncTimestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;