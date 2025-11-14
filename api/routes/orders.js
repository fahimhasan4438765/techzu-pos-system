const express = require('express');
const prisma = require('../lib/prisma');
const { authenticateToken, requireAdmin, requireCashierOrAdmin } = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Orders
 *   description: Order management endpoints
 */

/**
 * @swagger
 * /api/orders:
 *   get:
 *     summary: Get all orders with pagination (Admin only)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of orders to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of orders to skip
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [COMPLETED, VOID]
 *         description: Filter orders by status
 *     responses:
 *       200:
 *         description: List of orders retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 orders:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Order'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     limit:
 *                       type: integer
 *                     offset:
 *                       type: integer
 *                     total:
 *                       type: integer
 *       401:
 *         description: Unauthorized - Admin access required
 */
// Get all orders (admin only, with pagination)
router.get('/', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const { limit = 50, offset = 0, status } = req.query;

    const where = status ? { status: status.toUpperCase() } : {};

    const orders = await prisma.order.findMany({
      where,
      include: {
        cashier: {
          select: {
            id: true,
            email: true,
            role: true
          }
        },
        orderItems: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                category: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: parseInt(limit),
      skip: parseInt(offset)
    });

    // Convert cents to dollars
    const ordersWithDollarAmounts = orders.map(order => ({
      ...order,
      subtotal: order.subtotalCents / 100,
      tax: order.taxCents / 100,
      total: order.totalCents / 100,
      orderItems: order.orderItems.map(item => ({
        ...item,
        unitPrice: item.unitPriceCents / 100,
        lineTotal: item.lineTotalCents / 100
      }))
    }));

    res.json({
      orders: ordersWithDollarAmounts,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: await prisma.order.count({ where })
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get order by ID (admin only)
router.get('/:id', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        cashier: {
          select: {
            id: true,
            email: true,
            role: true
          }
        },
        orderItems: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                category: true,
                imageUrl: true
              }
            }
          }
        }
      }
    });

    if (!order) {
      return res.status(404).json({
        error: 'Order not found'
      });
    }

    // Convert cents to dollars
    const orderWithDollarAmounts = {
      ...order,
      subtotal: order.subtotalCents / 100,
      tax: order.taxCents / 100,
      total: order.totalCents / 100,
      orderItems: order.orderItems.map(item => ({
        ...item,
        unitPrice: item.unitPriceCents / 100,
        lineTotal: item.lineTotalCents / 100
      }))
    };

    res.json({ order: orderWithDollarAmounts });
  } catch (error) {
    next(error);
  }
});

// Create new order (cashier or admin)
router.post('/', authenticateToken, requireCashierOrAdmin, async (req, res, next) => {
  try {
    const { paymentMethod, items, clientCreatedAt } = req.body;
    const cashierId = req.user.userId;

    // Validation
    if (!paymentMethod || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(422).json({
        error: 'Payment method and items array are required'
      });
    }

    if (!['CASH', 'CARD', 'QR'].includes(paymentMethod.toUpperCase())) {
      return res.status(422).json({
        error: 'Invalid payment method. Must be CASH, CARD, or QR'
      });
    }

    // Validate and fetch products
    const productIds = items.map(item => item.productId);
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds }
      }
    });

    if (products.length !== productIds.length) {
      return res.status(422).json({
        error: 'One or more products not found'
      });
    }

    // Calculate totals
    let subtotalCents = 0;
    let taxCents = 0;

    const orderItemsData = items.map(item => {
      const product = products.find(p => p.id === item.productId);
      
      if (!product) {
        throw new Error(`Product ${item.productId} not found`);
      }

      if (!item.qty || item.qty <= 0) {
        throw new Error('Item quantity must be greater than 0');
      }

      const unitPriceCents = product.priceCents;
      const lineTotalCents = unitPriceCents * item.qty;
      const lineTaxCents = Math.round(lineTotalCents * (product.taxRate / 100));

      subtotalCents += lineTotalCents;
      taxCents += lineTaxCents;

      return {
        productId: product.id,
        qty: item.qty,
        unitPriceCents,
        taxRate: product.taxRate,
        lineTotalCents
      };
    });

    const totalCents = subtotalCents + taxCents;

    // Create order with items in a transaction
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
      },
      include: {
        cashier: {
          select: {
            id: true,
            email: true,
            role: true
          }
        },
        orderItems: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                category: true
              }
            }
          }
        }
      }
    });

    // Convert cents to dollars for response
    const orderWithDollarAmounts = {
      ...order,
      subtotal: order.subtotalCents / 100,
      tax: order.taxCents / 100,
      total: order.totalCents / 100,
      orderItems: order.orderItems.map(item => ({
        ...item,
        unitPrice: item.unitPriceCents / 100,
        lineTotal: item.lineTotalCents / 100
      }))
    };

    res.status(201).json({
      orderId: order.id,
      order: orderWithDollarAmounts,
      totals: {
        subtotal: subtotalCents / 100,
        tax: taxCents / 100,
        total: totalCents / 100
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get cashier's recent orders (last 20)
router.get('/cashier/recent', authenticateToken, requireCashierOrAdmin, async (req, res, next) => {
  try {
    const cashierId = req.user.userId;
    const { limit = 20 } = req.query;

    const orders = await prisma.order.findMany({
      where: {
        cashierId
      },
      include: {
        orderItems: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                category: true
              }
            }
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
      orderItems: order.orderItems.map(item => ({
        ...item,
        unitPrice: item.unitPriceCents / 100,
        lineTotal: item.lineTotalCents / 100
      }))
    }));

    res.json({
      orders: ordersWithDollarAmounts
    });
  } catch (error) {
    next(error);
  }
});

// Update order status (admin only)
router.patch('/:id/status', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['COMPLETED', 'VOID'].includes(status.toUpperCase())) {
      return res.status(422).json({
        error: 'Invalid status. Must be COMPLETED or VOID'
      });
    }

    const order = await prisma.order.update({
      where: { id },
      data: {
        status: status.toUpperCase()
      },
      include: {
        cashier: {
          select: {
            id: true,
            email: true,
            role: true
          }
        },
        orderItems: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                category: true
              }
            }
          }
        }
      }
    });

    // Convert cents to dollars
    const orderWithDollarAmounts = {
      ...order,
      subtotal: order.subtotalCents / 100,
      tax: order.taxCents / 100,
      total: order.totalCents / 100,
      orderItems: order.orderItems.map(item => ({
        ...item,
        unitPrice: item.unitPriceCents / 100,
        lineTotal: item.lineTotalCents / 100
      }))
    };

    res.json({ order: orderWithDollarAmounts });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        error: 'Order not found'
      });
    }
    next(error);
  }
});

module.exports = router;