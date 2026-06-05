import { Customer, Transaction } from '../types/fashion';

export const MOCK_CUSTOMERS: Customer[] = [
  {
    id: 'c1',
    firstName: 'Alice',
    lastName: 'Smith',
    email: 'alice.smith@example.com',
    phone: '555-0101',
    gender: 'Female',
    totalSpent: 1250.50,
    createdAt: new Date('2023-01-15'),
    address: {
      street: '123 Fashion Ave',
      city: 'New York',
      state: 'NY',
      zipCode: '10001'
    },
    notes: 'Prefers eco-friendly materials',
    tags: ['VIP', 'Eco-conscious']
  },
  {
    id: 'c2',
    firstName: 'Bob',
    lastName: 'Johnson',
    email: 'bob.j@example.com',
    phone: '555-0102',
    gender: 'Male',
    totalSpent: 450.00,
    createdAt: new Date('2023-03-20'),
    address: {
      street: '456 Style St',
      city: 'Brooklyn',
      state: 'NY',
      zipCode: '11201'
    }
  },
  {
    id: 'c3',
    firstName: 'Charlie',
    lastName: 'Brown',
    phone: '555-0103',
    totalSpent: 0,
    createdAt: new Date('2023-11-05')
  }
];

export const MOCK_TRANSACTIONS: Transaction[] = [
  {
    id: 'TX-1001',
    date: new Date('2023-12-01T10:30:00'),
    cashierName: 'Sarah J.',
    customerId: 'c1',
    customerName: 'Alice Smith',
    items: [
      {
        productId: 'p1',
        productName: 'Classic Denim Jacket',
        variantId: 'v1',
        sku: 'DNM-JKT-001',
        size: 'M',
        color: 'Blue',
        quantity: 1,
        price: 89.99
      }
    ],
    subtotal: 89.99,
    tax: 7.20,
    total: 97.19,
    paymentMethod: 'Card',
    status: 'Completed'
  },
  {
    id: 'TX-1002',
    date: new Date('2023-12-01T11:15:00'),
    cashierName: 'Mike R.',
    items: [
      {
        productId: 'p2',
        productName: 'Silk Scarf',
        variantId: 'v2',
        sku: 'SLK-SCF-002',
        size: 'One Size',
        color: 'Red',
        quantity: 2,
        price: 45.00
      }
    ],
    subtotal: 90.00,
    tax: 7.20,
    total: 97.20,
    paymentMethod: 'Cash',
    status: 'Completed'
  }
];