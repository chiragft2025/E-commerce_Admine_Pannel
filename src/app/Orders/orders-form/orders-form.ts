import { Component, OnInit } from '@angular/core';
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
import { debounceTime } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
  selector: 'app-order-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './orders-form.html',
  styleUrls: ['./orders-form.css']
})
export class OrderForm implements OnInit {
  form!: FormGroup;
  customers: any[] = [];
  loading = false;
  saving = false;
  error: string | null = null;

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

    // load customers for dropdown
    //this.cs.list().subscribe({ next: c => this.customers = c, error: e => console.error(e) });

    // add initial one item row
    this.addItem();
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

    // valueChanges can emit number | null | undefined, so type accordingly
    const productIdControl = fg.get('productId');
    if (productIdControl) {
      productIdControl.valueChanges
        .pipe(debounceTime(300))
        .subscribe((pid: number | null) => {
          // guard: if falsy (null/undefined/0) reset fields
          if (!pid) {
            fg.patchValue({ productName: '', unitPrice: 0, stock: 0 }, { emitEvent: false });
            return;
          }

          // fetch product details by id
          this.ps.get(pid).subscribe({
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
          // valueChanges stream error (rare) — log it
          console.error('valueChanges error', err);
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
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }

    // validate stock for each item (optional)
    for (const c of this.itemsArr.controls) {
      const qty = Number(c.get('quantity')!.value) || 0;
      const stock = Number(c.get('stock')!.value) || 0;
      if (qty > stock) {
        this.error = `Insufficient stock for ${c.get('productName')!.value || 'product'}`;
        return;
      }
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
    this.os.create(payload).subscribe({
      next: () => { this.saving = false; this.router.navigateByUrl('/orders'); },
      error: (err) => { this.saving = false; this.error = err?.error?.message ?? 'Failed to create order'; console.error(err); }
    });
  }

  cancel() { this.router.navigateByUrl('/orders'); }
}
