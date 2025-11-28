import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { OrderService } from '../../services/order.service';

@Component({
  selector: 'app-order-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './orders-details.html',
  styleUrls: ['./orders-details.css']
})
export class OrderDetail implements OnInit {
  id?: number;
  order: any = null;
  loading = false;

  constructor(private route: ActivatedRoute, private os: OrderService) {}

  ngOnInit(): void {
    const idStr = this.route.snapshot.paramMap.get('id');
    if (!idStr) return;
    this.id = Number(idStr);
    this.load();
  }

  load() {
    this.loading = true;
    this.os.get(this.id!).subscribe({
      next: o => { this.order = o; this.loading = false; },
      error: e => { console.error(e); this.loading = false; }
    });
  }

  cancel() {
    if (!confirm('Cancel this order?')) return;
    this.os.cancel(this.id!).subscribe({
      next: () => this.load(),
      error: e => console.error(e)
    });
  }
}
