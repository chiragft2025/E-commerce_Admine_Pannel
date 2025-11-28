import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { CategoryService } from '../../services/category';
import { Category } from '../../models/categories.model';

@Component({
  selector: 'app-category-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './category-list.html',
  styleUrls: ['./category-list.css']
})
export class CategoryList implements OnInit {
  categories: Category[] = [];
  loading = false;

  constructor(private cs: CategoryService, private router: Router) {}

  ngOnInit(): void {
    this.load();
  }

  load() {
    this.loading = true;
    this.cs.list().subscribe({
      next: (res) => {
        this.categories = res;
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
      }
    });
  }

  add() {
    this.router.navigateByUrl('/categories/new');
  }

  edit(cat: Category) {
    this.router.navigateByUrl(`/categories/${cat.id}`);
  }

  remove(cat: Category) {
    if (!confirm(`Delete "${cat.title}"?`)) return;
    this.cs.delete(cat.id!).subscribe(() => this.load());
  }
}
