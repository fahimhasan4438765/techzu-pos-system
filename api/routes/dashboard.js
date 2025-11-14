const express = require('express');
const prisma = require('../lib/prisma');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Dashboard
 *   description: Dashboard analytics and statistics endpoints (Admin only)
 */

/**
 * @swagger
 * /api/dashboard/stats:
 *   get:
 *     summary: Get dashboard statistics (Admin only)
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalRevenue:
 *                   type: number
 *                   format: decimal
 *                   description: Total revenue in dollars
 *                 totalOrders:
 *                   type: integer
 *                   description: Total number of orders
 *                 totalProducts:
 *                   type: integer
 *                   description: Total number of products
 *                 totalUsers:
 *                   type: integer
 *                   description: Total number of users
 *                 todayRevenue:
 *                   type: number
 *                   format: decimal
 *                   description: Today's revenue in dollars
 *                 todayOrders:
 *                   type: integer
 *                   description: Today's number of orders
 *                 averageOrderValue:
 *                   type: number
 *                   format: decimal
 *                   description: Average order value in dollars
 *       401:
 *         description: Unauthorized - Admin access required
 */
// Get dashboard statistics (admin only)
router.get('/stats', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Get total statistics
    const [
      totalRevenue,
      totalOrders,
      totalProducts,
      totalUsers,
      todayRevenue,
      todayOrders
    ] = await Promise.all([
      // Total revenue
      prisma.order.aggregate({
        where: {
          status: 'COMPLETED'
        },
        _sum: {
          totalCents: true
        }
      }),
      // Total orders
      prisma.order.count({
        where: {
          status: 'COMPLETED'
        }
      }),
      // Total products
      prisma.product.count(),
      // Total users
      prisma.user.count(),
      // Today's revenue
      prisma.order.aggregate({
        where: {
          status: 'COMPLETED',
          createdAt: {
            gte: todayStart
          }
        },
        _sum: {
          totalCents: true
        }
      }),
      // Today's orders
      prisma.order.count({
        where: {
          status: 'COMPLETED',
          createdAt: {
            gte: todayStart
          }
        }
      })
    ]);

    const totalRevenueDollars = (totalRevenue._sum.totalCents || 0) / 100;
    const todayRevenueDollars = (todayRevenue._sum.totalCents || 0) / 100;
    const averageOrderValue = totalOrders > 0 ? totalRevenueDollars / totalOrders : 0;

    res.json({
      totalRevenue: totalRevenueDollars,
      totalOrders,
      totalProducts,
      totalUsers,
      todayRevenue: todayRevenueDollars,
      todayOrders,
      averageOrderValue: Math.round(averageOrderValue * 100) / 100
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/dashboard/revenue-chart:
 *   get:
 *     summary: Get revenue chart data for the last 7 days (Admin only)
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Revenue chart data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 chartData:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       date:
 *                         type: string
 *                         format: date
 *                         description: Date in YYYY-MM-DD format
 *                       revenue:
 *                         type: number
 *                         format: decimal
 *                         description: Revenue for that day in dollars
 *                       orders:
 *                         type: integer
 *                         description: Number of orders for that day
 *       401:
 *         description: Unauthorized - Admin access required
 */
// Get revenue chart data (admin only)
router.get('/revenue-chart', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const { days = 7 } = req.query;
    const daysCount = Math.min(parseInt(days), 30); // Max 30 days

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - daysCount + 1);
    startDate.setHours(0, 0, 0, 0);

    // Get daily revenue data
    const dailyData = await prisma.order.groupBy({
      by: ['createdAt'],
      where: {
        status: 'COMPLETED',
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      _sum: {
        totalCents: true
      },
      _count: {
        id: true
      }
    });

    // Create array of last N days with zero values
    const chartData = [];
    for (let i = 0; i < daysCount; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      
      const dateStr = date.toISOString().split('T')[0];
      
      // Find data for this date
      const dayData = dailyData.filter(item => {
        const itemDate = new Date(item.createdAt).toISOString().split('T')[0];
        return itemDate === dateStr;
      });

      const revenue = dayData.reduce((sum, item) => sum + (item._sum.totalCents || 0), 0) / 100;
      const orders = dayData.reduce((sum, item) => sum + item._count.id, 0);

      chartData.push({
        date: dateStr,
        revenue: Math.round(revenue * 100) / 100,
        orders
      });
    }

    res.json({ chartData });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/dashboard/popular-products:
 *   get:
 *     summary: Get top-selling products (Admin only)
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of products to return
 *     responses:
 *       200:
 *         description: Popular products retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 products:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       product:
 *                         $ref: '#/components/schemas/Product'
 *                       totalSold:
 *                         type: integer
 *                         description: Total quantity sold
 *                       totalRevenue:
 *                         type: number
 *                         format: decimal
 *                         description: Total revenue from this product
 *       401:
 *         description: Unauthorized - Admin access required
 */
// Get popular products (admin only)
router.get('/popular-products', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const { limit = 10 } = req.query;

    const popularProducts = await prisma.orderItem.groupBy({
      by: ['productId'],
      _sum: {
        qty: true,
        lineTotalCents: true
      },
      _count: {
        id: true
      },
      orderBy: {
        _sum: {
          qty: 'desc'
        }
      },
      take: parseInt(limit)
    });

    // Get product details
    const productIds = popularProducts.map(item => item.productId);
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds }
      }
    });

    // Combine data
    const result = popularProducts.map(item => {
      const product = products.find(p => p.id === item.productId);
      return {
        product: {
          ...product,
          price: product.priceCents / 100
        },
        totalSold: item._sum.qty,
        totalRevenue: Math.round((item._sum.lineTotalCents / 100) * 100) / 100,
        orderCount: item._count.id
      };
    });

    res.json({ products: result });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/dashboard/recent-orders:
 *   get:
 *     summary: Get recent orders for dashboard (Admin only)
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of recent orders to return
 *     responses:
 *       200:
 *         description: Recent orders retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 orders:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Order'
 *       401:
 *         description: Unauthorized - Admin access required
 */
// Get recent orders (admin only)
router.get('/recent-orders', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const { limit = 10 } = req.query;

    const orders = await prisma.order.findMany({
      include: {
        cashier: {
          select: {
            id: true,
            email: true,
            role: true
          }
        },
        _count: {
          select: {
            orderItems: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: parseInt(limit)
    });

    // Convert cents to dollars
    const ordersWithDollarAmounts = orders.map(order => ({
      ...order,
      subtotal: order.subtotalCents / 100,
      tax: order.taxCents / 100,
      total: order.totalCents / 100,
      itemCount: order._count.orderItems
    }));

    res.json({ orders: ordersWithDollarAmounts });
  } catch (error) {
    next(error);
  }
});

module.exports = router;