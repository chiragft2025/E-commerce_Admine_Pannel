export interface OrderItemDto {
  productId: number;
  quantity: number;
  unitPrice?: number;
  productName?: string;
}

export interface CreateOrderRequest {
  customerId: number;
  shippingAddress?: string;
  items: OrderItemDto[];
}

export interface OrderSummary {
  id: number;
  placedAt: string;
  status: string;
  totalAmount: number;
  customer: { id: number; fullName: string; };
}

export interface OrderDetail {
  id: number;
  placedAt: string;
  status: string;
  totalAmount: number;
  shippingAddress?: string;
  createdBy?: string;
  items: Array<{
    productId: number;
    product: { id:number; name:string } | null;
    quantity: number;
    unitPrice: number;
  }>;
  customer: { id:number; fullName:string } | null;
}
