import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';
import { User, CreateUserRequest, UpdateUserRequest } from '../models/User.model';

@Injectable({ providedIn: 'root' })
export class UserService {
  private base = `${environment.apiUrl}/api/UserManagement`;

  constructor(private http: HttpClient) {}

  list(search?: string): Observable<User[]> {
  const params = search?.trim()
    ? new HttpParams().set('search', search.trim())
    : undefined;

  return this.http.get<User[]>(this.base, { params });
}

  get(id: number | string): Observable<User> {
    return this.http.get<User>(`${this.base}/${id}`);
  }

  create(model: CreateUserRequest): Observable<User> {
    return this.http.post<User>(this.base, model);
  }

  update(id: number | string, model: UpdateUserRequest): Observable<void> {
    return this.http.put<void>(`${this.base}/${id}`, model);
  }

  delete(id: number | string): Observable<HttpResponse<void>> {
    return this.http.delete<void>(`${this.base}/${id}`,{observe: 'response'});
  }

  profile(): Observable<User> {
    return this.http.get<User>(`${this.base}/profile`);
  }

  assignRoles(id: number | string, roleIds: number[]): Observable<void> {
    const payload = { roleIds };
    return this.http.post<void>(`${this.base}/${id}/roles`, payload);
  }
}
