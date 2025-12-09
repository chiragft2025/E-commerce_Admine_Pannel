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

  // --- user menu state ---
  userMenuOpen = false;
  userName = 'Admin';

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

    // Initialize username: prefer Auth service if it exposes a getter, otherwise decode token
    try {
      // If your Auth service has getUserName() or currentUser property, use it:
      const maybeName = (this.auth as any).getUserName?.() || (this.auth as any).userName || (this.auth as any).currentUser?.username;
      if (maybeName && typeof maybeName === 'string') {
        this.userName = maybeName;
      } else {
        const token = this.getTokenFromStorage();
        const nameFromToken = token ? this.getUserNameFromJwt(token) : null;
        if (nameFromToken) this.userName = nameFromToken;
      }
    } catch {
      // fallback silent
    }
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
    //const userId = this.auth.getUserId();
   // if (!userId) return;
    this.router.navigate(['/profile']);
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

  // ----------------- User dropdown related -----------------

  /** Toggle user dropdown. Template should call this with $event to stop propagation. */
  toggleUserMenu(event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.userMenuOpen = !this.userMenuOpen;
  }

  /** Called when user clicks "Profile" item in dropdown */
  onProfile(): void {
    this.userMenuOpen = false;
    this.profile();
  }

  /** Called when user clicks "Logout" item in dropdown */
  onLogout(): void {
    this.userMenuOpen = false;
    this.logout();
  }

  // Close the user dropdown when clicking anywhere outside
  @HostListener('document:click')
  onDocumentClick(): void {
    if (this.userMenuOpen) {
      this.userMenuOpen = false;
    }
    // also close sidebar on mobile if click outside? keep existing behavior separate
  }

  // Close dropdown or mobile sidebar on Escape key
  @HostListener('document:keydown.escape')
  onEscape(): void {
    // existing behavior: close sidebar on small screens
    if (this.sidebarOpen && typeof window !== 'undefined' && window.innerWidth <= 920) {
      this.closeSidebar();
    }

    // also close user menu if open
    if (this.userMenuOpen) {
      this.userMenuOpen = false;
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

  // ----------------- Helpers for username extraction -----------------

  /** Try to get JWT from storage. Adjust key if you use another one. */
  private getTokenFromStorage(): string | null {
    try {
      return localStorage.getItem('access_token') || sessionStorage.getItem('access_token') || localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    } catch {
      return null;
    }
  }

  /** Read a username from a JWT token payload (very small helper). */
  private getUserNameFromJwt(token: string): string | null {
    try {
      const parts = token.split('.');
      if (parts.length < 2) return null;
      const payload = parts[1];
      // base64url -> base64
      const b64 = payload.replace(/-/g, '+').replace(/_/g, '/');
      const padded = this.padBase64(b64);
      const decoded = atob(padded);
      const obj = JSON.parse(decoded);
      // Try common claim names: 'unique_name', 'name', 'username', 'sub'
      return obj['unique_name'] || obj['name'] || obj['username'] || obj['sub'] || null;
    } catch {
      return null;
    }
  }

  private padBase64(base64: string) {
    const pad = base64.length % 4;
    if (pad === 2) return base64 + '==';
    if (pad === 3) return base64 + '=';
    if (pad === 1) return base64 + '===';
    return base64;
  }
}
