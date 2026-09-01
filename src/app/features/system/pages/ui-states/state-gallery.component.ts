import { Component } from '@angular/core';
import { StateViewComponent } from '../../../../shared/components/state-view/state-view.component';
@Component({
  selector: 'app-state-gallery',
  standalone: true,
  imports: [StateViewComponent],
  templateUrl: './state-gallery.component.html',
  styleUrl: './state-gallery.component.scss',
})
export class StateGalleryComponent {
  notice = '';
}
