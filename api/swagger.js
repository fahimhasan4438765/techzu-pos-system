const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'TechzuPOS API',
      version: '1.0.0',
      description: 'REST API for TechzuPOS system - A comprehensive point of sale solution',
      contact: {
        name: 'TechzuPOS Support',
        email: 'support@techzu.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Development server'
      },
      {
        url: 'http://192.168.0.211:3001',
        description: 'Local network server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'User unique identifier'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address'
            },
            role: {
              type: 'string',
              enum: ['ADMIN', 'CASHIER'],
              description: 'User role in the system'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'User creation timestamp'
            }
          }
        },
        Product: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Product unique identifier'
            },
            name: {
              type: 'string',
              description: 'Product name'
            },
            price: {
              type: 'number',
              format: 'decimal',
              description: 'Product price'
            },
            category: {
              type: 'string',
              description: 'Product category'
            },
            inStock: {
              type: 'boolean',
              description: 'Product availability status'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Product creation timestamp'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Product last update timestamp'
            }
          }
        },
        Order: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Order unique identifier'
            },
            total: {
              type: 'number',
              format: 'decimal',
              description: 'Order total amount'
            },
            status: {
              type: 'string',
              enum: ['PENDING', 'COMPLETED', 'CANCELLED'],
              description: 'Order status'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Order creation timestamp'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Order last update timestamp'
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error message'
            }
          }
        }
      }
    }
  },
  apis: ['./routes/*.js'], // paths to files containing OpenAPI definitions
};

const specs = swaggerJSDoc(options);

module.exports = {
  specs,
  swaggerUi
};