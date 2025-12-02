// src/app/directives/has-permission.directive.ts
import { Directive, Input, TemplateRef, ViewContainerRef } from '@angular/core';
import { Auth } from '../services/auth';

@Directive({
  standalone: true,            // <-- important: makes this directive importable by standalone components
  selector: '[appHasPermission]'
})
export class HasPermissionDirective {
  private hasView = false;

  constructor(private tpl: TemplateRef<any>, private vcr: ViewContainerRef, private auth: Auth) {}

  @Input()
  set appHasPermission(value: string | string[] | { perms: string[]; mode?: 'any'|'all' }) {
    if (!value) {
      this.clear();
      return;
    }

    let perms: string[] = [];
    let mode: 'any'|'all' = 'all';

    if (typeof value === 'string') perms = [value];
    else if (Array.isArray(value)) perms = value;
    else { perms = value.perms || []; mode = value.mode || 'all'; }

    const granted = mode === 'any'
      ? perms.some(p => this.auth.hasPermission(p))
      : perms.every(p => this.auth.hasPermission(p));

    if (granted) this.show();
    else this.clear();
  }

  private show() {
    if (!this.hasView) {
      this.vcr.createEmbeddedView(this.tpl);
      this.hasView = true;
    }
  }

  private clear() {
    if (this.hasView) {
      this.vcr.clear();
      this.hasView = false;
    }
  }
}
