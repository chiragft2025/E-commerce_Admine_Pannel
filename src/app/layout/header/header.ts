import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Auth } from '../../services/auth';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header.html',
  styleUrls: ['./header.css'],
})
export class Header {

  constructor(private auth: Auth, private router: Router) {}

  logout() {
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }

  openprofile() {
    const userId = this.auth.getUserId();
    if (!userId) return;

    this.router.navigate(['/users/view', userId]);
  }
}
