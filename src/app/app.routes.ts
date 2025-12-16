import { Permission } from './models/permission.model';
import { Forbidden } from './forbidden/forbidden';
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
import { PermissionGuard } from './guards/permission.guard';
import { UserRoleManage } from './User/user-role-manage/user-role-manage';
import { UserProfile } from './User/user-profile/user-profile';
import { CategoriesView } from './categories/categories-view/categories-view';

export const routes: Routes = [
  { path: 'login', component: Login },
  { path: 'register', component: Register },
  { path: 'forbidden', component: Forbidden },

  {
    path: '',
    component: MainLayout,
    canActivate: [AuthGuard],
    children: [
      { path: '', component: Home },
      { path: 'home', component: Home },

      // Products
      {
        path: 'products',
        component: ProductsList,
        canActivate: [PermissionGuard],
        data: { permission: 'Product.View' },
      },
      {
        path: 'products/new',
        component: ProductForm,
        canActivate: [PermissionGuard],
        data: { permission: 'Product.Create' },
      },
      {
        path: 'products/:id',
        component: ProductForm,
        canActivate: [PermissionGuard],
        data: { permission: 'Product.Edit' },
      },

      // Categories
      {
        path: 'categories',
        component: CategoryList,
        canActivate: [PermissionGuard],
        data: { permission: 'Category.View' },
      },
      {
        path: 'categories/show/:id',
        component: CategoriesView,
        canActivate: [PermissionGuard],
        data: { permission: 'Category.Show' },
      },
      {
        path: 'categories/new',
        component: CategoryForm,
        canActivate: [PermissionGuard],
        data: { permission: 'Category.Create' },
      },
      {
        path: 'categories/:id',
        component: CategoryForm,
        canActivate: [PermissionGuard],
        data: { permission: 'Category.Edit' },
      },

      // Users
      {
        path: 'users',
        component: UserList,
        canActivate: [PermissionGuard],
        data: { permission: 'User.View' },
      },
      {
        path: 'users/new',
        component: UserForm,
        canActivate: [PermissionGuard],
        data: { permission: 'User.Create' },
      },
      {
        path: 'users/:id',
        component: UserForm,
        canActivate: [PermissionGuard],
        data: { permission: 'User.Edit' },
      },
      {
        path: 'users/view/:id',
        component: UserDetails,
        canActivate: [PermissionGuard],
        data: { permission: 'User.View' },
      },
      {
        path:'profile',
        component:UserProfile
      },
      {
        path: 'users/:id/roles',
        component: UserRoleManage,
        canActivate: [PermissionGuard],
        data: { permission: 'User.Edit' },
      },

      // Customers
      {
        path: 'customers',
        component: CustomerList,
        canActivate: [PermissionGuard],
        data: { permission: 'Customer.View' },
      },
      {
        path: 'customers/new',
        component: CustomerForm,
        canActivate: [PermissionGuard],
        data: { permission: 'Customer.Create' },
      },
      {
        path: 'customers/:id',
        component: CustomerForm,
        canActivate: [PermissionGuard],
        data: { permission: 'Customer.Edit' },
      },
      {
        path: 'customers/view/:id',
        component: CustomerDetail,
        canActivate: [PermissionGuard],
        data: { permission: 'Customer.View' },
      },

      // Orders
      {
        path: 'orders',
        component: OrdersList,
        canActivate: [PermissionGuard],
        data: { permission: 'Order.View' },
      },
      {
        path: 'orders/new',
        component: OrderForm,
        canActivate: [PermissionGuard],
        data: { permission: 'Order.Manage' },
      },
      {
        path: 'orders/:id',
        component: OrderDetail,
        canActivate: [PermissionGuard],
        data: { permission: 'Order.View' },
      },

      // Roles
      {
        path: 'roles',
        component: RoleList,
        canActivate: [PermissionGuard],
        data: { permission: 'Role.View' }, // only users with Role.Manage can view/manage roles
      },
      {
        path: 'roles/new',
        component: RoleForm,
        canActivate: [PermissionGuard],
        data: { permission: 'Role.Manage' },
      },
      {
        path: 'roles/:id',
        component: RoleForm,
        canActivate: [PermissionGuard],
        data: { permission: 'Role.Manage' },
      },
    ],
  },

  { path: '**', redirectTo: '' },
];
