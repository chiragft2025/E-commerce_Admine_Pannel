import { Paged } from './../../services/product';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
  FormArray
} from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ProductService } from '../../services/product';
import { CustomerService } from '../../services/customer.service';
import { OrderService } from '../../services/order.service';
import { Product } from '../../models/product.model';
import { Subject, of } from 'rxjs';
import { debounceTime, takeUntil, catchError } from 'rxjs/operators';
import { Customer } from '../../models/customers.model';

@Component({
  selector: 'app-order-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './orders-form.html',
  styleUrls: ['./orders-form.scss']
})
export class OrderForm implements OnInit, OnDestroy {
  form!: FormGroup;
  customers: any[] = [];
  products: Product[] = [];
  loading = false;
  loadingCustomers = false;
  loadingProducts = false;
  saving = false;
  error: string | null = null;
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private ps: ProductService,
    private cs: CustomerService,
    private os: OrderService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      customerId: [null, Validators.required],
      shippingAddress: [''],
      items: this.fb.array([])
    });

    this.loadCustomers();
    this.loadProducts();
    this.addItem();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadCustomers() {
    this.loadingCustomers = true;
    this.cs.listPaged?.(undefined, 1, 1000)
      .pipe(
        takeUntil(this.destroy$),
        catchError(err => {
          console.error('Failed to load customers', err);
          this.error = 'Failed to load customers. Try again later.';
          return of({ items: [], total: 0, page: 1, pageSize: 0 } as Paged<Customer>);
        })
      )
      .subscribe((paged: Paged<Customer>) => {
        this.customers = paged.items || [];
        this.loadingCustomers = false;
      });
  }

  private loadProducts() {
    this.loadingProducts = true;
    const obs = (this.ps.listPaged?.() ?? this.ps.listPaged?.(undefined, 1, 1000));
    if (!obs) {
      this.loadingProducts = false;
      return;
    }

    obs.pipe(
      takeUntil(this.destroy$),
      catchError(err => {
        console.error('Failed to load products', err);
        this.loadingProducts = false;
        return of([] as Product[]);
      })
    ).subscribe((res: any) => {
      if (!res) {
        this.products = [];
      } else if (Array.isArray(res)) {
        this.products = res;
      } else if (Array.isArray(res.items)) {
        this.products = res.items;
      } else {
        this.products = Array.isArray(res.data) ? res.data : [];
      }
      this.loadingProducts = false;
    });
  }

  get itemsArr(): FormArray {
    return this.form.get('items') as FormArray;
  }

  addItem() {
    const fg = this.fb.group({
      productId: [null, Validators.required],
      productName: [''],
      unitPrice: [0, Validators.required],
      stock: [0],
      quantity: [1, [Validators.required, Validators.min(1)]]
    });

    const productIdControl = fg.get('productId');
    if (productIdControl) {
      productIdControl.valueChanges
        .pipe(debounceTime(200), takeUntil(this.destroy$))
        .subscribe((pid: number | null) => {
          if (!pid) {
            fg.patchValue({ productName: '', unitPrice: 0, stock: 0 }, { emitEvent: false });
            return;
          }

          // Try to find selected product in the already-loaded products list
          const local = this.products.find(p => p.id === pid);
          if (local) {
            fg.patchValue(
              { productName: local.name ?? '', unitPrice: local.price ?? 0, stock: local.stock ?? 0 },
              { emitEvent: false }
            );
            // clear any custom quantity-stock error
            const qtyCtrl = fg.get('quantity');
            if (qtyCtrl && qtyCtrl.errors && qtyCtrl.errors['exceedsStock']) {
              const errs = { ...(qtyCtrl.errors || {}) };
              delete errs['exceedsStock'];
              qtyCtrl.setErrors(Object.keys(errs).length ? errs : null);
            }
            return;
          }

          // fallback: fetch single product by id
          this.ps.get(pid).pipe(takeUntil(this.destroy$)).subscribe({
            next: (p: Product) => {
              fg.patchValue(
                { productName: p.name ?? '', unitPrice: p.price ?? 0, stock: p.stock ?? 0 },
                { emitEvent: false }
              );
            },
            error: (err) => {
              console.error('Product lookup failed', err);
              fg.patchValue({ productName: '(not found)', unitPrice: 0, stock: 0 }, { emitEvent: false });
            }
          });
        }, (err) => {
          console.error('valueChanges error', err);
        });
    }

    // When quantity changes, ensure it doesn't exceed stock (set custom error 'exceedsStock')
    const qtyCtrl = fg.get('quantity');
    if (qtyCtrl) {
      qtyCtrl.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => {
        const q = Number(fg.get('quantity')!.value) || 0;
        const stock = Number(fg.get('stock')!.value) || 0;
        if (q > stock) {
          const existing = fg.get('quantity')!.errors || {};
          fg.get('quantity')!.setErrors({ ...existing, exceedsStock: true });
        } else {
          const existing = fg.get('quantity')!.errors || {};
          if (existing['exceedsStock']) delete existing['exceedsStock'];
          fg.get('quantity')!.setErrors(Object.keys(existing).length ? existing : null);
        }
      });
    }

    this.itemsArr.push(fg);
  }

  removeItem(i: number) {
    this.itemsArr.removeAt(i);
  }

  get total(): number {
    return this.itemsArr.controls.reduce((sum, c) => {
      const q = Number(c.get('quantity')!.value) || 0;
      const up = Number(c.get('unitPrice')!.value) || 0;
      return sum + q * up;
    }, 0);
  }

  submit() {
    this.error = null;

    // mark all to show validation messages
    this.form.markAllAsTouched();

    // customer required
    if (!this.form.value.customerId) {
      this.error = 'Customer is required.';
      return;
    }

    // at least one item
    if (this.itemsArr.length === 0) {
      this.error = 'At least one product is required.';
      return;
    }

    // validate each item and detect duplicate product ids
    const seen = new Set<number>();
    for (const c of this.itemsArr.controls) {
      const pid = c.get('productId')!.value;
      const qty = Number(c.get('quantity')!.value);
      const stock = Number(c.get('stock')!.value);

      if (!pid) {
        this.error = 'Each item must have a selected product.';
        return;
      }

      if (!qty || qty < 1) {
        this.error = 'Quantity must be at least 1.';
        return;
      }

      if (qty > stock) {
        this.error = `Insufficient stock for ${c.get('productName')!.value || 'product'}.`;
        return;
      }

      if (seen.has(pid)) {
        this.error = 'Duplicate product in order. Remove or combine quantities.';
        return;
      }
      seen.add(pid);
    }

    const payload = {
      customerId: Number(this.form.value.customerId),
      shippingAddress: this.form.value.shippingAddress,
      items: this.itemsArr.controls.map(c => ({
        productId: Number(c.get('productId')!.value),
        quantity: Number(c.get('quantity')!.value)
      }))
    };

    this.saving = true;
    this.os.create(payload).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.saving = false; this.router.navigateByUrl('/orders'); },
      error: (err) => {
        this.saving = false;
        this.error = err?.error?.message ?? 'Failed to create order';
        console.error(err);
      }
    });
  }

  cancel() { this.router.navigateByUrl('/orders'); }
}
