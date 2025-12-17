import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';
import { OrderSummary, OrderDetail, CreateOrderRequest } from '../models/order.model';

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

@Injectable({ providedIn: 'root' })
export class OrderService {
  private base = `${environment.apiUrl.replace(/\/+$/, '')}/api/orders`;

  constructor(private http: HttpClient) {}

  list(page = 1, pageSize = 20, search?: string): Observable<Paged<OrderSummary>> {
    let params = new HttpParams()
      .set('page', String(page))
      .set('pageSize', String(pageSize));

    if (search && search.trim().length > 0) {
      params = params.set('search', search.trim());
    }

    return this.http.get<Paged<OrderSummary>>(this.base, { params });
  }

  get(id: number): Observable<OrderDetail> {
    return this.http.get<OrderDetail>(`${this.base}/${id}`);
  }

  create(payload: CreateOrderRequest): Observable<any> {
    return this.http.post(this.base, payload);
  }

  cancel(id: number): Observable<void> {
    return this.http.post<void>(`${this.base}/${id}/cancel`, {});
  }

  /** Delete order (soft delete on backend) */
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
