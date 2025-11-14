-- TechzuPOS Seed Data
-- Insert sample data for testing

-- Insert Users
INSERT INTO "User" ("id", "email", "password", "name", "role", "isActive", "createdAt", "updatedAt") VALUES
('user_admin_001', 'admin@techzu.com', '$2a$10$ofHgIutDiDcWA5ImRbwHe.tqPglC2OetmZfMoZfYyNj4jqqDk/Gv.', 'System Administrator', 'ADMIN', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('user_cashier_001', 'cashier@techzu.com', '$2a$10$/RQ8FYrP726Sgqgx7Waj7OES1zT1E8gv/TbowzgiMPE8Ttg6w1xMq', 'John Cashier', 'CASHIER', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Insert Products
INSERT INTO "Product" ("id", "sku", "name", "description", "price", "cost", "category", "stock", "minStock", "isActive", "createdAt", "updatedAt") VALUES
-- Beverages
('prod_001', 'BEV001', 'Coca Cola 330ml', 'Classic Coca Cola can', 2.50, 1.50, 'Beverages', 100, 10, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('prod_002', 'BEV002', 'Pepsi 330ml', 'Pepsi cola can', 2.50, 1.50, 'Beverages', 80, 10, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('prod_003', 'BEV003', 'Orange Juice 500ml', 'Fresh orange juice bottle', 3.75, 2.25, 'Beverages', 50, 5, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('prod_004', 'BEV004', 'Water Bottle 500ml', 'Pure drinking water', 1.25, 0.75, 'Beverages', 200, 20, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

-- Food Items
('prod_005', 'FOOD001', 'Cheeseburger', 'Beef burger with cheese', 8.99, 4.50, 'Food', 30, 5, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('prod_006', 'FOOD002', 'Chicken Sandwich', 'Grilled chicken sandwich', 7.50, 4.00, 'Food', 25, 5, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('prod_007', 'FOOD003', 'French Fries', 'Crispy french fries', 4.25, 2.00, 'Food', 40, 8, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('prod_008', 'FOOD004', 'Caesar Salad', 'Fresh caesar salad', 6.75, 3.50, 'Food', 20, 3, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

-- Retail Items
('prod_009', 'RET001', 'Phone Charger', 'Universal USB phone charger', 12.99, 7.00, 'Electronics', 15, 3, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('prod_010', 'RET002', 'Notebook A4', 'Spiral notebook 200 pages', 3.50, 2.00, 'Stationery', 60, 10, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('prod_011', 'RET003', 'Blue Pen', 'Ballpoint pen blue ink', 1.50, 0.80, 'Stationery', 150, 25, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('prod_012', 'RET004', 'Chocolate Bar', 'Milk chocolate bar 100g', 2.25, 1.25, 'Snacks', 80, 15, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);