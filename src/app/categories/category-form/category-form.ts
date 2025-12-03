import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CategoryService } from '../../services/category';
import { Category } from '../../models/categories.model';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-category-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './category-form.html',
  styleUrls: ['./category-form.scss']
})
export class CategoryForm implements OnInit {
  form!: FormGroup;
  id?: number;
  isEdit = false;
  saving = false;
  serverErrorMessage = ''; // general error

  constructor(
    private fb: FormBuilder,
    private cs: CategoryService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      title: ['', Validators.required],
      description: ['']
    });

    this.id = Number(this.route.snapshot.paramMap.get('id'));
    this.isEdit = !!this.id;

    if (this.isEdit) {
      this.cs.get(this.id).subscribe(cat => this.form.patchValue(cat));
    }
  }

  save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving = true;
    this.serverErrorMessage = '';

    const model = this.form.value;

    const onSuccess = () => {
      this.saving = false;
      this.router.navigateByUrl('/categories');
    };

    const onError = (err: HttpErrorResponse) => {
      this.saving = false;

      // backend returns BadRequest("Category title already exists")
      // err.error may be a string or object depending on server; normalize it:
      const msg = (typeof err.error === 'string') ? err.error : (err.error?.message || JSON.stringify(err.error));

      // If this is the duplicate-title error, mark the title control with a 'duplicate' error
      if (err.status === 400 && msg && msg.toLowerCase().includes('title') && msg.toLowerCase().includes('exists')) {
        this.form.get('title')?.setErrors({ duplicate: true });
        // ensure it's visible
        this.form.get('title')?.markAsTouched();
        return;
      }

      // otherwise show a generic server error
      this.serverErrorMessage = msg || 'An unexpected error occurred';
    };

    if (this.isEdit) {
      this.cs.update(this.id!, model).subscribe({ next: onSuccess, error: onError });
    } else {
      this.cs.create(model).subscribe({ next: onSuccess, error: onError });
    }
  }

  cancel() {
    this.router.navigateByUrl('/categories');
  }
}
