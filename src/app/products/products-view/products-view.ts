import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ProductService } from '../../services/product';
import { Product } from '../../models/product.model';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-product-view',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './products-view.html',
  styleUrls: ['./products-view.scss']
})
export class ProductsView implements OnInit {
  loading = false;
  id?: number;
  product?: Product;

  constructor(
    private ps: ProductService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    this.id = idParam ? Number(idParam) : undefined;

    if (!this.id) {
      this.handleNotFound();
      return;
    }

    this.fetchProduct(this.id);
  }

  private fetchProduct(id: number): void {
    this.loading = true;

    this.ps.get(id).subscribe({
      next: (prod: Product) => {
        if (!prod) {
          this.handleNotFound();
          return;
        }
        this.product = prod;
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load product', err);
        this.loading = false;
        this.handleNotFound();
      }
    });
  }

  edit(product?: Product): void {
    if (!product?.id) return;
    this.router.navigate(['/products', product.id, 'edit']);
  }

  back(): void {
    this.router.navigateByUrl('/products');
  }

  private handleNotFound(): void {
    Swal.fire({
      title: 'Not found',
      text: 'Product not found.',
      icon: 'warning'
    }).then(() => {
      this.router.navigateByUrl('/products');
    });
  }
}
