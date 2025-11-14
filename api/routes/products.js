const express = require('express');
const prisma = require('../lib/prisma');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Products
 *   description: Product management endpoints
 */

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Get all products with pagination and filtering
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter products by category
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of products to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of products to skip
 *     responses:
 *       200:
 *         description: List of products retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 products:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Product'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     limit:
 *                       type: integer
 *                     offset:
 *                       type: integer
 *                     total:
 *                       type: integer
 */
// Get all products (public for POS app)
router.get('/', async (req, res, next) => {
  try {
    const { category, limit = 50, offset = 0 } = req.query;

    const where = category ? { category } : {};

    const products = await prisma.product.findMany({
      where,
      orderBy: [
        { category: 'asc' },
        { name: 'asc' }
      ],
      take: parseInt(limit),
      skip: parseInt(offset)
    });

    // Convert cents to dollars for response
    const productsWithDollarPrices = products.map(product => ({
      ...product,
      price: product.priceCents / 100
    }));

    res.json({
      products: productsWithDollarPrices,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: await prisma.product.count({ where })
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get product by ID
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const product = await prisma.product.findUnique({
      where: { id }
    });

    if (!product) {
      return res.status(404).json({
        error: 'Product not found'
      });
    }

    res.json({
      product: {
        ...product,
        price: product.priceCents / 100
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Create a new product (Admin only)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sku
 *               - name
 *               - price
 *               - category
 *             properties:
 *               sku:
 *                 type: string
 *                 description: Product SKU
 *               name:
 *                 type: string
 *                 description: Product name
 *               price:
 *                 type: number
 *                 format: decimal
 *                 minimum: 0.01
 *                 description: Product price in dollars
 *               category:
 *                 type: string
 *                 description: Product category
 *               taxRate:
 *                 type: number
 *                 format: decimal
 *                 default: 8.25
 *                 minimum: 0
 *                 maximum: 100
 *                 description: Tax rate percentage
 *               imageUrl:
 *                 type: string
 *                 format: uri
 *                 description: Product image URL
 *     responses:
 *       201:
 *         description: Product created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 product:
 *                   $ref: '#/components/schemas/Product'
 *       401:
 *         description: Unauthorized - Admin access required
 *       422:
 *         description: Validation error
 */
// Create product (admin only)
router.post('/', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const { 
      sku, 
      name, 
      price, 
      category, 
      taxRate = 8.25, 
      imageUrl 
    } = req.body;

    // Validation
    if (!sku || !name || !price || !category) {
      return res.status(422).json({
        error: 'SKU, name, price, and category are required'
      });
    }

    if (price <= 0) {
      return res.status(422).json({
        error: 'Price must be greater than 0'
      });
    }

    if (taxRate < 0 || taxRate > 100) {
      return res.status(422).json({
        error: 'Tax rate must be between 0 and 100'
      });
    }

    const product = await prisma.product.create({
      data: {
        sku,
        name,
        priceCents: Math.round(price * 100), // Convert dollars to cents
        category,
        taxRate,
        imageUrl
      }
    });

    res.status(201).json({
      product: {
        ...product,
        price: product.priceCents / 100
      }
    });
  } catch (error) {
    next(error);
  }
});

// Update product (admin only)
router.patch('/:id', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    // Convert price to cents if provided
    if (updateData.price !== undefined) {
      if (updateData.price <= 0) {
        return res.status(422).json({
          error: 'Price must be greater than 0'
        });
      }
      updateData.priceCents = Math.round(updateData.price * 100);
      delete updateData.price;
    }

    // Validate tax rate if provided
    if (updateData.taxRate !== undefined) {
      if (updateData.taxRate < 0 || updateData.taxRate > 100) {
        return res.status(422).json({
          error: 'Tax rate must be between 0 and 100'
        });
      }
    }

    const product = await prisma.product.update({
      where: { id },
      data: updateData
    });

    res.json({
      product: {
        ...product,
        price: product.priceCents / 100
      }
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        error: 'Product not found'
      });
    }
    next(error);
  }
});

// Delete product (admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;

    await prisma.product.delete({
      where: { id }
    });

    res.status(204).send();
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        error: 'Product not found'
      });
    }
    next(error);
  }
});

// Get product categories
router.get('/meta/categories', async (req, res, next) => {
  try {
    const categories = await prisma.product.findMany({
      select: {
        category: true
      },
      distinct: ['category'],
      orderBy: {
        category: 'asc'
      }
    });

    res.json({
      categories: categories.map(item => item.category)
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;