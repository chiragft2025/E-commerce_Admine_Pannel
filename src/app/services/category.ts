import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';
import { Category } from '../models/categories.model';

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private base = `${environment.apiUrl}/api/categories`;

  constructor(private http: HttpClient) {}

  list(): Observable<Category[]> {
    return this.http.get<Category[]>(this.base);
  }

  get(id: number): Observable<Category> {
    return this.http.get<Category>(`${this.base}/${id}`);
  }

  create(model: Category) {
    return this.http.post<Category>(this.base, model);
  }

  update(id: number, model: Category) {
    return this.http.put<Category>(`${this.base}/${id}`, model);
  }

  delete(id: number) {
    return this.http.delete(`${this.base}/${id}`);
  }
}
