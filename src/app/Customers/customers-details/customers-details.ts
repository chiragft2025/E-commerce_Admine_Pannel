import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink, RouterModule } from '@angular/router';
import { CustomerService } from '../../services/customer.service';
import { Customer } from '../../models/customers.model';

@Component({
  selector: 'app-customer-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './customers-details.html',
  styleUrls: ['./customers-details.css']
})
export class CustomerDetail implements OnInit {
  id?: number;
  customer: Customer | null = null;
  loading = false;

  constructor(private route: ActivatedRoute, private cs: CustomerService, private router: Router) {}

  ngOnInit(): void {
    const idStr = this.route.snapshot.paramMap.get('id');
    if (!idStr) return;
    this.id = Number(idStr);
    this.load();
  }

 cancel() { this.router.navigateByUrl('/customers'); }

  load() {
    this.loading = true;
    this.cs.get(this.id!).subscribe({
      next: c => { this.customer = c; this.loading = false; },
      error: e => { console.error(e); this.loading = false; }
    });
  }
}
