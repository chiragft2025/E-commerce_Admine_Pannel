import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { UserService } from '../../services/UserService';

@Component({
  selector: 'app-user-details',
  standalone: true,
  imports: [CommonModule,RouterModule],
  templateUrl: './user-details.html',
  styleUrls: ['./user-details.css']
})
export class UserDetails implements OnInit {

  user: any = null;
  loading = true;
  error: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private userService: UserService
  ) {}

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      this.error = "Invalid user id";
      this.loading = false;
      return;
    }

    this.load(id);
  }

  load(id: number) {
    this.loading = true;

    this.userService.get(id).subscribe({
      next: (res) => {
        this.user = res;
        this.loading = false;
      },
      error: (err) => {
        this.error = "Failed to load user details";
        console.error(err);
        this.loading = false;
      }
    });
  }
}
