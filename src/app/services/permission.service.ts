import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';
import { Permission } from '../models/permission.model';

@Injectable({ providedIn: 'root' })
export class PermissionService {
  private base = `${environment.apiUrl.replace(/\/+$/, '')}/api/Permissions`;

  constructor(private http: HttpClient) {}

  // list all permissions (used to show all checkboxes)
  list(): Observable<Permission[]> {
    return this.http.get<Permission[]>(this.base);
  }
}
