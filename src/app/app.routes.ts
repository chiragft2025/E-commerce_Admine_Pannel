import { Routes } from '@angular/router';
import { Login } from './auth/login/login';
import { Register } from './auth/register/register';
import { MainLayout } from './layout/main-layout/main-layout';
import { Home } from './layout/home/home';
import { AuthGuard } from './guards/auth-guard';
import { ProductsList } from './products/products-list/products-list';
import { ProductForm } from './products/product-form/product-form';
import { CategoryList } from './categories/category-list/category-list';
import { CategoryForm } from './categories/category-form/category-form';
import { UserList } from './User/user-list/user-list';
import { UserForm } from './User/user-form/user-form';
import { OrdersList } from './Orders/orders-list/orders-list';
import { OrderForm } from './Orders/orders-form/orders-form';
import { OrderDetail } from './Orders/orders-details/orders-details';
import { CustomerList } from './Customers/customers-list/customers-list';
import { CustomerForm } from './Customers/customers-form/customers-form';
import { CustomerDetail } from './Customers/customers-details/customers-details';
import { RoleList } from './roles/role-list/role-list';
import { RoleForm } from './roles/role-form/role-form';
import { UserDetails } from './User/user-details/user-details';

export const routes: Routes = [
  { path: 'login', component: Login },
  { path: 'register', component: Register },

  {
    path: '',
    component: MainLayout,
    canActivate: [AuthGuard],
    children: [
      { path: '', component: Home },
      { path: 'home', component: Home },

      { path: 'products', component: ProductsList },
      { path: 'products/new', component: ProductForm },
      { path: 'products/:id', component: ProductForm },

      { path: 'categories', component: CategoryList },
      { path: 'categories/new', component: CategoryForm },
      { path: 'categories/:id', component: CategoryForm },

      { path: 'users', component: UserList },
      { path: 'users/new', component: UserForm },
      { path: 'users/:id', component: UserForm },
      {path: 'users/view/:id', component: UserDetails },

      { path: 'customers', component: CustomerList },
      { path: 'customers/new', component: CustomerForm },
      { path: 'customers/:id', component: CustomerForm },
      { path: 'customers/view/:id', component: CustomerDetail },

      { path: 'orders', component: OrdersList },
      { path: 'orders/new', component: OrderForm },
      { path: 'orders/:id', component: OrderDetail },

      { path: 'roles', component: RoleList },
      { path: 'roles/new', component: RoleForm },
      { path: 'roles/:id', component: RoleForm },
    ],
  },

  { path: '**', redirectTo: '' },
];
