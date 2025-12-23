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
  coverImage?: string;
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
  vendor_upload?: {
    url: string;
    name: string;
    timestamp: number;
  };
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

export type WooCommerceOrder = {
  id: number;
  number: string;
  status: string;
  currency: string;
  date_created: string;
  total: string;
  customer_note?: string;
  billing: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    address_1: string;
    address_2: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
  };
  line_items: Array<{
    id: number;
    name: string;
    sku?: string;
    quantity: number;
    total: string;
    meta_data: Array<{
      id: number;
      key: string;
      value: any;
      display_key: string;
      display_value: string;
    }>;
    image: {
      src: string;
    };
  }>;
  meta_data: Array<{
    id: number;
    key: string;
    value: any;
  }>;
  vendor_name?: string;
  s3Key?: string;
  vendor_upload?: {
    url: string;
  };
};