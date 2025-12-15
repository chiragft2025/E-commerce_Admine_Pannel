import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';
import { Category, CategoryPagedResponse } from '../models/categories.model';

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private base = `${environment.apiUrl}/api/categories`;
  

  constructor(private http: HttpClient) {}

  /**
   * Get paginated list of categories
   * ?page=1&pageSize=10&q=term
   */
   list(page = 1, pageSize = 10, q = ''): Observable<CategoryPagedResponse | Category[]> {
    let params = new HttpParams()
      .set('page', String(page))
      .set('pageSize', String(pageSize));

    const term = (q ?? '').toString().trim();
    if (term.length > 0) {
      params = params.set('search', term).set('q', term);
    }

    return this.http.get<any>(this.base, { params });
  }

  get(id: number): Observable<Category> {
    return this.http.get<Category>(`${this.base}/${id}`);
  }

  create(model: Partial<Category>): Observable<Category> {
    return this.http.post<Category>(this.base, model);
  }

  update(id: number, model: Partial<Category>): Observable<Category> {
    return this.http.put<Category>(`${this.base}/${id}`, model);
  }

  delete(id: number): Observable<HttpResponse<void>> {
    return this.http.delete<void>(`${this.base}/${id}`, { observe: 'response' });
  }
}
