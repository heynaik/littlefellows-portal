export type Stage =
  | 'Uploaded'
  | 'Assigned to Vendor'
  | 'Printing'
  | 'Quality Check'
  | 'Packed'
  | 'Shipped to Admin'
  | 'Received by Admin'
  | 'Final Packed for Customer'
  | 'Shipped to Customer'
  | 'Delivered';

export const STAGES: Stage[] = [
  'Uploaded',
  'Assigned to Vendor',
  'Printing',
  'Quality Check',
  'Packed',
  'Shipped to Admin',
  'Received by Admin',
  'Final Packed for Customer',
  'Shipped to Customer',
  'Delivered',
];

export type Order = {
  id?: string;
  orderId: string;
  bookTitle: string;
  binding: 'Soft' | 'Hard';
  deadline: string;
  notes?: string;
  s3Key?: string | null;
  stage?: Stage;
  vendorId?: string | null;
  createdAt?: number;
  updatedAt?: number;
  // WooCommerce fields
  wcId?: number;
  customerName?: string;
  customerEmail?: string;
  totalAmount?: string;
  currency?: string;
  lineItems?: Array<{
    id: number;
    name: string;
    quantity: number;
    total: string;
  }>;
  wcStatus?: string;
};

export type Product = {
  id: number;
  name: string;
  slug: string;
  permalink: string;
  date_created: string;
  status: 'publish' | 'draft' | 'pending' | 'private';
  featured: boolean;
  description: string;
  short_description: string;
  sku: string;
  price: string;
  regular_price: string;
  sale_price: string;
  price_html: string;
  on_sale: boolean;
  purchasable: boolean;
  total_sales: number;
  virtual: boolean;
  downloadable: boolean;
  stock_quantity: number | null;
  stock_status: 'instock' | 'outofstock' | 'onbackorder';
  images: Array<{
    id: number;
    src: string;
    alt: string;
  }>;
  categories: Array<{
    id: number;
    name: string;
    slug: string;
  }>;
};

export type Vendor = {
  vendorId: string;
  name: string;
  contactEmail?: string;
  active?: boolean;
};