import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ProductService, Paged } from '../../services/product';
import { Product } from '../../models/product.model';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-products-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './products-list.html',
  styleUrls: ['./products-list.css']
})
export class ProductsList implements OnInit {
  products: Product[] = [];
  loading = false;
  q = '';

  // pagination state
  total = 0;
  page = 1;
  pageSize = 10;
  pages: number[] = [];

  constructor(private ps: ProductService, private router: Router) {}

  ngOnInit(): void {
    this.load();
  }

  load(search?: string, page?: number) {
    const s = typeof search === 'string' ? search : this.q;
    const p = page ?? this.page;

    console.log('Load products', { search: s, page: p, pageSize: this.pageSize });
    this.loading = true;

    this.ps.listPaged(s, p, this.pageSize).subscribe({
      next: (res: Paged<Product>) => {
        this.products = res.items;
        this.total = res.total;
        this.page = res.page;
        this.pageSize = res.pageSize;
        this.computePages();
        this.loading = false;
      },
      error: (e) => {
        console.error('PRODUCTS API ERROR:', e);
        this.loading = false;
      }
    });
  }

  computePages() {
    const pageCount = Math.max(1, Math.ceil(this.total / this.pageSize));
    const arr: number[] = [];
    for (let i = 1; i <= pageCount; i++) arr.push(i);
    this.pages = arr;
  }

  goToPage(p: number) {
    if (p === this.page) return;
    this.load(this.q, p);
  }

  prev() {
    if (this.page > 1) this.goToPage(this.page - 1);
  }

  next() {
    const pageCount = Math.ceil(this.total / this.pageSize);
    if (this.page < pageCount) this.goToPage(this.page + 1);
  }

  onSearch() {
    this.page = 1;
    this.load(this.q, 1);
  }

  add() { this.router.navigateByUrl('/products/new'); }
  edit(p: Product) { this.router.navigateByUrl(`/products/${p.id}`); }
  remove(p: Product) {
    if (!confirm(`Delete product "${p.name}"?`)) return;
    this.ps.delete(p.id!).subscribe({
      next: () => this.load(this.q, this.page),
      error: (e) => console.error(e)
    });
  }

  // helper to show category title safely
  catTitle(p: Product) {
    return p.category?.title ?? '—';
  }

  tagsList(p: Product) {
    return (p.tags ?? []).map(t => t.name).join(', ');
  }
}
