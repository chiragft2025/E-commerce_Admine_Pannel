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
import { Customer } from '../../models/customers.model';
import { Subject, of } from 'rxjs';
import { debounceTime, takeUntil, catchError, finalize, map } from 'rxjs/operators';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-order-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './orders-form.html',
  styleUrls: ['./orders-form.scss']
})
export class OrderForm implements OnInit, OnDestroy {
  form!: FormGroup;
  customers: Customer[] = [];
  products: Product[] = [];

  loading = false;
  loadingCustomers = false;
  loadingProducts = false;
  saving = false;
  error: string | null = null;

  private destroy$ = new Subject<void>();

  private Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    timer: 2000,
    showConfirmButton: false,
    timerProgressBar: true
  });

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

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ----------------------------------------------
  // LOAD DATA
  // ----------------------------------------------

  private loadCustomers() {
    this.loadingCustomers = true;
    this.cs.listPaged?.(undefined, 1, 1000)
      ?.pipe(
        takeUntil(this.destroy$),
        catchError(err => {
          console.error('Failed to load customers', err);
          return of({ items: [] });
        }),
        finalize(() => this.loadingCustomers = false)
      )
      .subscribe(res => this.customers = res.items || []);
  }

  private loadProducts() {
    this.loadingProducts = true;
    const obs = this.ps.listPaged?.() ?? this.ps.listPaged?.(undefined, 1, 1000);
    if (!obs) return;

    obs.pipe(
      takeUntil(this.destroy$),
      catchError(err => {
        console.error('Failed to load products', err);
        return of([]);
      }),
      finalize(() => this.loadingProducts = false)
    ).subscribe((res: any) => {
      if (Array.isArray(res)) this.products = res;
      else if (Array.isArray(res.items)) this.products = res.items;
      else this.products = [];
    });
  }

  // ----------------------------------------------
  // FORM HELPERS
  // ----------------------------------------------

  get itemsArr(): FormArray {
    return this.form.get('items') as FormArray;
  }

  addItem() {
    const group = this.fb.group({
      productId: [null, Validators.required],
      productName: [''],
      unitPrice: [0, Validators.required],
      stock: [0],
      quantity: [1, [Validators.required, Validators.min(1)]]
    });

    // When product changes, update fields
    group.get('productId')?.valueChanges
      .pipe(debounceTime(200), takeUntil(this.destroy$))
      .subscribe(pid => {
        const product = this.products.find(p => p.id === pid);
        if (product) {
          group.patchValue(
            {
              productName: product.name,
              unitPrice: product.price,
              stock: product.stock
            },
            { emitEvent: false }
          );
        }
      });

    this.itemsArr.push(group);
  }

  removeItem(i: number) {
    this.itemsArr.removeAt(i);
  }

  get total(): number {
    return this.itemsArr.controls.reduce((sum, c) => {
      return sum + (Number(c.get('quantity')?.value) * Number(c.get('unitPrice')?.value));
    }, 0);
  }

  // ----------------------------------------------
  // SUBMIT ORDER
  // ----------------------------------------------

  submit() {
    this.error = null;
    this.form.markAllAsTouched();

    if (this.form.invalid) {
      this.error = "Please fix validation errors.";
      return;
    }

    // Validate item list
    if (this.itemsArr.length === 0) {
      this.error = "At least one item is required.";
      return;
    }

    // Build correct backend format
    const items = this.itemsArr.controls.map(c => {
      const pid = Number(c.get('productId')!.value);
      const product = this.products.find(p => p.id === pid);

      return {
        id: pid,  // backend requires "id"
        quantity: Number(c.get('quantity')!.value),
        unitPrice: Number(c.get('unitPrice')!.value),
        product: {
          id: product?.id ?? pid,
          name: product?.name ?? "",
          sku: product?.sku ?? "unknown"
        }
      };
    });

    const payload = {
      customerId: Number(this.form.value.customerId),
      shippingAddress: this.form.value.shippingAddress,
      items: items
    };

    console.log("FINAL PAYLOAD SENT TO BACKEND:", payload);

    Swal.fire({
      title: "Create Order?",
      html: `<strong>Total:</strong> ${this.total}`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Create"
    }).then(res => {
      if (res.isConfirmed) this.saveOrder(payload);
    });
  }

  private saveOrder(payload: any) {
    this.saving = true;

    Swal.fire({
      title: "Saving...",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    this.os.create(payload)
      .pipe(
        takeUntil(this.destroy$),
        map(() => true),
        catchError(err => {
          console.error("Order creation failed:", err.error);
          this.error = "Failed to create order.";
          Swal.fire("Error", this.error, "error");
          return of(false);
        }),
        finalize(() => {
          this.saving = false;
          Swal.close();
        })
      )
      .subscribe(ok => {
        if (!ok) return;

        this.Toast.fire({ icon: "success", title: "Order created" });
        this.router.navigateByUrl('/orders');
      });
  }

  cancel() {
    this.router.navigateByUrl('/orders');
  }
}
