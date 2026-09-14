import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-module-page',
  standalone: true,
  templateUrl: './module-page.component.html',
  styleUrl: './module-page.component.scss',
})
export class ModulePageComponent {
  private readonly route = inject(ActivatedRoute);
  title = this.route.snapshot.data['title'] as string;
  description = this.route.snapshot.data['description'] as string;
}
