import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Product } from '../models/product.model';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

@Injectable({ providedIn: 'root' })
export class ProductService {
  private base = `${environment.apiUrl}/api/products`;

  constructor(private http: HttpClient) {}

  // returns paged result
  listPaged(search?: string, page = 1, pageSize = 10): Observable<Paged<Product>> {
    let params = new HttpParams()
      .set('page', String(page))
      .set('pageSize', String(pageSize));
    if (search?.trim()) params = params.set('search', search.trim());

    return this.http.get<Paged<Product>>(this.base, { params }).pipe(
      map(res => ({
        items: res?.items ?? [],
        total: res?.total ?? 0,
        page: res?.page ?? page,
        pageSize: res?.pageSize ?? pageSize
      }))
    );
  }

  get(id: number | string): Observable<Product> {
    return this.http.get<Product>(`${this.base}/${id}`);
  }

  create(product: Partial<Product>): Observable<Product> {
    return this.http.post<Product>(this.base, product);
  }

  update(id: number | string, product: Partial<Product>): Observable<Product> {
    return this.http.put<Product>(`${this.base}/${id}`, product);
  }

  delete(id: number | string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
