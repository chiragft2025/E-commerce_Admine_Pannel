export interface Role {
  id: number;
  name: string;
}

export interface User {
  id?: number;
  userName: string;
  email: string;
  isActive: boolean;
  roleIds?: number[]; // simpler form for list payloads
  roles?: Role[];     // populated by server when needed
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateUserRequest {
  userName: string;
  email: string;
  password: string;
  isActive?: boolean;
  roleIds?: number[];
}

export interface UpdateUserRequest {
  userName?: string;
  email?: string;
  password?: string; // optional — backend should accept empty as 'no-change'
  isActive?: boolean;
  roleIds?: number[];
}
