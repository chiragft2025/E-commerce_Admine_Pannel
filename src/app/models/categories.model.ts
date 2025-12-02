export interface Category {
  id?: number;
  title: string;
  description: string;
}
export interface CategoryPagedResponse {
  items: Category[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}
