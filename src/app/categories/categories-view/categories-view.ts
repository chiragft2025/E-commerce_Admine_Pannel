import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CategoryService } from '../../services/category';
import { Category } from '../../models/categories.model';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-category-show',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './categories-view.html',
  styleUrls: ['./categories-view.scss']
})
export class CategoriesView implements OnInit {
  loading = false;
  id?: number;
  category?: Category;

  constructor(
    private cs: CategoryService,
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

    this.fetchCategory(this.id);
  }

  private fetchCategory(id: number) {
    this.loading = true;

    this.cs.get(id).subscribe({
      next: (cat: Category) => {
        if (!cat) {
          this.handleNotFound();
          return;
        }
        this.category = cat;
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load category', err);
        this.loading = false;
        this.handleNotFound();
      }
    });
  }

  edit(category?: Category) {
    if (!category?.id) return;
    this.router.navigate(['/categories', category.id, 'edit']);
  }

  back() {
    this.router.navigateByUrl('/categories');
  }

  private handleNotFound() {
    Swal.fire({
      title: 'Not found',
      text: 'Category not found.',
      icon: 'warning'
    }).then(() => {
      this.router.navigateByUrl('/categories');
    });
  }
}
