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
};