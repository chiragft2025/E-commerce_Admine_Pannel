import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { UserService } from '../../services/UserService';


@Component({
  selector: 'app-user-profile',
  imports: [CommonModule, RouterModule],
  templateUrl: './user-profile.html',
  styleUrls: ['./user-profile.scss'],
})
export class UserProfile implements OnInit, OnDestroy {
  user: any = null;
  loading = false;
  error: string | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    this.load();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  load(): void {
    // reset state
    this.error = null;
    this.loading = true;
    this.user = null;

    this.userService
      .profile()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          // defensive assignment — ensure roles is at least an array
          this.user = {
            ...res,
            roles: Array.isArray(res?.roles) ? res.roles : (res?.roles ? [res.roles] : []),
          };
          this.loading = false;
        },
        error: (err: any) => {
          console.error('Failed to load user profile', err);
          this.error = 'Failed to load user details';
          this.loading = false;
        },
      });
  }

  /**
   * trackBy function for *ngFor on roles
   */
}
