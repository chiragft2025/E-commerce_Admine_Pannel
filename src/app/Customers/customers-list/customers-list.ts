import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { CustomerService, Paged } from '../../services/customer.service';
import { Customer } from '../../models/customers.model';
import { FormsModule } from '@angular/forms';
import { HasPermissionDirective } from '../../directives/has-permission.directive';

@Component({
  selector: 'app-customer-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule,HasPermissionDirective],
  templateUrl: './customers-list.html',
  styleUrls: ['./customers-list.scss']
})
export class CustomerList implements OnInit {
  customers: Customer[] = [];
  loading = false;
  q = '';

  // paging
  page = 1;
  pageSize = 10;
  total = 0;

  constructor(private cs: CustomerService, private router: Router) {}

  ngOnInit(): void {
    this.load();
  }

  load(search?: string, page?: number) {
    const s = typeof search === 'string' ? search : this.q;
    const p = page ?? this.page;
    this.loading = true;
    this.cs.listPaged(s, p, this.pageSize).subscribe({
      next: (res: Paged<Customer>) => {
        this.customers = res.items;
        this.total = res.total;
        this.page = res.page;
        this.pageSize = res.pageSize;
        this.loading = false;
      },
      error: (e) => {
        console.error('CUSTOMERS LOAD ERROR', e);
        this.loading = false;
      }
    });
  }

  onSearch() {
    this.page = 1;
    this.load(this.q, 1);
  }

  goToPage(p: number) {
    if (p === this.page) return;
    this.load(this.q, p);
  }

  add() { this.router.navigateByUrl('/customers/new'); }
  edit(c: Customer) { this.router.navigateByUrl(`/customers/${c.id}`); }
  view(c: Customer) { this.router.navigateByUrl(`/customers/view/${c.id}`); }

  remove(c: Customer) {
    if (!confirm(`Delete customer "${c.fullName}"?`)) return;
    this.cs.delete(c.id!).subscribe({
      next: () => this.load(this.q, this.page),
      error: (e) => console.error(e)
    });
  }

  get pageCount(): number {
    return Math.max(1, Math.ceil(this.total / this.pageSize));
  }
}
