import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { Customer } from '../models/customers.model';

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

@Injectable({ providedIn: 'root' })
export class CustomerService {
  private base = `${environment.apiUrl.replace(/\/+$/, '')}/api/customers`;

  constructor(private http: HttpClient) {}

  // Flexible list that supports server paging or plain array fallback
  listPaged(search?: string, page = 1, pageSize = 10): Observable<Paged<Customer>> {
    let params = new HttpParams().set('page', String(page)).set('pageSize', String(pageSize));
    if (search?.trim()) params = params.set('search', search.trim());

    return this.http.get<any>(this.base, { params }).pipe(
      map(res => {
        // If server already returns paged { items, total, page, pageSize }
        if (res && Array.isArray(res.items)) {
          return {
            items: res.items as Customer[],
            total: res.total ?? res.items.length,
            page: res.page ?? page,
            pageSize: res.pageSize ?? pageSize
          } as Paged<Customer>;
        }

        // If server returns plain array -> do client-side pagination
        if (Array.isArray(res)) {
          const all: Customer[] = res;
          const total = all.length;
          const start = (page - 1) * pageSize;
          const items = all.slice(start, start + pageSize);
          return { items, total, page, pageSize } as Paged<Customer>;
        }

        // Unexpected shape: try to coerce single object
        if (!res) return { items: [], total: 0, page, pageSize } as Paged<Customer>;
        // fallback: if API returned object that contains customer[] under some key
        const maybeItems = res.items ?? res.data ?? [];
        const arr = Array.isArray(maybeItems) ? maybeItems : [];
        const total = res.total ?? arr.length;
        const start = (page - 1) * pageSize;
        const items = arr.slice ? arr.slice(start, start + pageSize) : arr;
        return { items, total, page, pageSize } as Paged<Customer>;
      })
    );
  }

  get(id: number): Observable<Customer> {
    return this.http.get<Customer>(`${this.base}/${id}`);
  }

  create(data: Customer) {
    return this.http.post<Customer>(this.base, data);
  }

  update(id: number, data: Customer) {
    return this.http.put<Customer>(`${this.base}/${id}`, data);
  }

  delete(id: number):Observable<HttpResponse<void>>  {
    return this.http.delete<void>(`${this.base}/${id}`,{observe:'response' });
  }
}
