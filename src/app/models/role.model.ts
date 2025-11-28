import { Permission } from './permission.model';

export interface RoleDto {
  id: number;
  name: string;
  description?: string;
  isActive?: boolean;
  permissions?: Permission[]; // for detail
}

export interface CreateRoleRequest {
  name: string;
  description?: string;
  isActive?: boolean;
  permissionIds?: number[];
}

export interface UpdateRoleRequest {
  name?: string;
  description?: string;
  isActive?: boolean;
}
