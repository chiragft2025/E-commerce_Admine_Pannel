import { CommonModule } from '@angular/common';
import {
  Component,
  HostListener,
  OnDestroy,
  OnInit,
  Renderer2
} from '@angular/core';
import { Router, NavigationStart, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { HasPermissionDirective } from '../../directives/has-permission.directive';
import { Auth } from './../../services/auth';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, HasPermissionDirective],
  templateUrl: './main-layout.html',
  styleUrls: ['./main-layout.scss'],
})
export class MainLayout implements OnInit, OnDestroy {
  sidebarOpen = true;
  year = new Date().getFullYear();

  private routerSub: Subscription | null = null;

  constructor(
    private router: Router,
    private renderer: Renderer2,
    private auth: Auth
  ) {}

  ngOnInit(): void {
    // Desktop default open, mobile default closed
    if (typeof window !== 'undefined') {
      this.sidebarOpen = window.innerWidth > 920;
    } else {
      this.sidebarOpen = true;
    }

    // Ensure html fallback class matches initial state
    this.syncHtmlClass();

    // Close sidebar on navigation for small screens
    this.routerSub = this.router.events.subscribe((ev) => {
      if (ev instanceof NavigationStart) {
        if (typeof window !== 'undefined' && window.innerWidth <= 920) {
          this.sidebarOpen = false;
          this.syncHtmlClass();
        }
      }
    });
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
    this.routerSub = null;
    // remove fallback class when destroyed
    try {
      this.renderer.removeClass(document.documentElement, 'sidebar-open');
    } catch (e) {
      // ignore in non-browser envs
    }
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
    this.syncHtmlClass();
  }

  openSidebar(): void {
    this.sidebarOpen = true;
    this.syncHtmlClass();
  }

  profile(): void {
    const userId = this.auth.getUserId();
    if (!userId) return;
    this.router.navigate(['/users/view', userId]);
  }

  closeSidebar(): void {
    this.sidebarOpen = false;
    this.syncHtmlClass();
  }

  logout(): void {
    try {
      localStorage.removeItem('access_token');
    } catch {}
    this.router.navigate(['/login']).catch(() => (window.location.href = '/login'));
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.sidebarOpen && typeof window !== 'undefined' && window.innerWidth <= 920) {
      this.closeSidebar();
    }
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: UIEvent): void {
    const w = (event.target as Window).innerWidth;
    // when resizing, restore desktop open state when > 920, otherwise close
    this.sidebarOpen = w > 920;
    this.syncHtmlClass();
  }

  /** keep a fallback class on <html> for environments where component class binding fails */
  private syncHtmlClass(): void {
    try {
      if (this.sidebarOpen) {
        this.renderer.addClass(document.documentElement, 'sidebar-open');
      } else {
        this.renderer.removeClass(document.documentElement, 'sidebar-open');
      }
    } catch (e) {
      // ignore (server-side rendering or non-browser envs)
    }
  }
}
