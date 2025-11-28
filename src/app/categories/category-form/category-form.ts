import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CategoryService } from '../../services/category';
import { Category } from '../../models/categories.model';

@Component({
  selector: 'app-category-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './category-form.html',
  styleUrls: ['./category-form.css']
})
export class CategoryForm implements OnInit {
  form!: FormGroup;
  id?: number;
  isEdit = false;

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

    const model = this.form.value;

    if (this.isEdit) {
      this.cs.update(this.id!, model).subscribe(() => {
        this.router.navigateByUrl('/categories');
      });
    } else {
      this.cs.create(model).subscribe(() => {
        this.router.navigateByUrl('/categories');
      });
    }
  }

  cancel() {
    this.router.navigateByUrl('/categories');
  }
}
