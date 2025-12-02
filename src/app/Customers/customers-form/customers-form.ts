import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CustomerService } from '../../services/customer.service';

@Component({
  selector: 'app-customer-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './customers-form.html',
  styleUrls: ['./customers-form.scss']
})
export class CustomerForm implements OnInit {

  form!: FormGroup;
  id: number | null = null;
  isEdit = false;
  saving = false;
  error: string | null = null;

  constructor(
    private fb: FormBuilder,
    private cs: CustomerService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      fullName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: [''],
      address: ['']
    });

    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.id = Number(idParam);
      this.isEdit = true;
      this.load();
    }
  }

  load() {
    this.cs.get(this.id!).subscribe({
      next: (c) => this.form.patchValue(c),
      error: (e) => console.error(e)
    });
  }

  save() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }

    this.saving = true;
    this.error = null;

    if (this.isEdit) {
      this.cs.update(this.id!, this.form.value).subscribe({
        next: () => { this.saving = false; this.router.navigateByUrl('/customers'); },
        error: (err) => { this.saving = false; this.error = err?.error?.message || 'Update failed'; }
      });
    } else {
      this.cs.create(this.form.value).subscribe({
        next: () => { this.saving = false; this.router.navigateByUrl('/customers'); },
        error: (err) => { this.saving = false; this.error = err?.error?.message || 'Create failed'; }
      });
    }
  }

  cancel() { this.router.navigateByUrl('/customers'); }
}
