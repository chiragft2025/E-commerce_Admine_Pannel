import { HasPermissionDirective } from './../../directives/has-permission.directive';
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OrderService } from '../../services/order.service';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-orders-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule,HasPermissionDirective],
  templateUrl: './orders-list.html',
  styleUrls: ['./orders-list.scss']
})
export class OrdersList implements OnInit {
  orders: any[] = [];
  page = 1;
  pageSize = 20;
  total = 0;
  loading = false;

  constructor(private os: OrderService, private router: Router) {}

  ngOnInit(): void {
    this.load();
  }

  load(p = 1) {
    this.loading = true;
    this.os.list(p, this.pageSize).subscribe({
      next: res => {
        this.orders = res.items;
        this.total = res.total;
        this.page = res.page;
        this.pageSize = res.pageSize;
        this.loading = false;
      },
      error: e => { console.error(e); this.loading = false; }
    });
  }

  // convenience getter for template
  get pageCount(): number {
    return Math.max(1, Math.ceil(this.total / this.pageSize));
  }

  view(o: any) {
    this.router.navigateByUrl(`/orders/${o.id}`)
  }

  create() {
    this.router.navigateByUrl('/orders/new');
  }

  prev() { if (this.page > 1) this.load(this.page - 1); }
  next() { if (this.page < this.pageCount) this.load(this.page + 1); }
}
