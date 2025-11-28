export interface PagedResult<T> {
  total: number;
  page: number;
  pageSize: number;
  items: T[];
}
