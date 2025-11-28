export interface ProductTag {
  tagId?: number;
  name: string;
}

export interface CategoryInfo {
  id: number;
  title: string;
}

export interface Product {
  id?: number | string;
  name: string;
  sku?: string;
  description?: string;
  price: number;
  stock: number;
  isActive: boolean;
  category?: CategoryInfo | null;
  categoryId?: number | null;
  tags?: ProductTag[];
  createdAt?: string;
  updatedAt?: string;
}
