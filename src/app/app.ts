import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MainLayout } from "./layout/main-layout/main-layout";

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('E_commerce_Admin_Frontend');
}
