import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';
import { RoleDto, CreateRoleRequest, UpdateRoleRequest } from '../models/role.model';

@Injectable({ providedIn: 'root' })
export class RoleService {
  private base = `${environment.apiUrl.replace(/\/+$/, '')}/api/RoleManagement`;

  constructor(private http: HttpClient) {}

  list(): Observable<RoleDto[]> {
    return this.http.get<RoleDto[]>(this.base);
  }

  get(id: number): Observable<RoleDto> {
    return this.http.get<RoleDto>(`${this.base}/${id}`);
  }

  create(payload: CreateRoleRequest): Observable<RoleDto> {
    return this.http.post<RoleDto>(this.base, payload);
  }

  update(id: number, payload: UpdateRoleRequest): Observable<RoleDto> {
    return this.http.put<RoleDto>(`${this.base}/${id}`, payload);
  }

  delete(id: number): Observable<HttpResponse<void>> {
    return this.http.delete<void>(`${this.base}/${id}`,{observe: 'response'});
  }

  // Permissions endpoints
  listRolePermissions(id: number): Observable<{ id: number; name: string }[]> {
    return this.http.get<{ id: number; name: string }[]>(`${this.base}/${id}/permissions`);
  }

  replaceRolePermissions(id: number, permissionIds: number[]): Observable<void> {
    return this.http.post<void>(`${this.base}/${id}/permissions`, { permissionIds });
  }
}
