import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-module-page', standalone: true, imports: [RouterLink],
  template: `<section class="module-page"><div class="eyebrow">CRICKETPULSE MODULE</div><h1>{{title}}</h1><p>{{description}}</p><div class="coming"><span>✦</span><div><b>{{title}} workspace</b><small>This module is next in the product flow.</small></div></div></section>`,
  styles: [`:host{display:block}.module-page{max-width:900px;padding:70px 4vw}.eyebrow{color:#b8f45c;font-size:10px;font-weight:850;letter-spacing:2px}h1{margin:18px 0 8px;font-size:clamp(40px,6vw,72px);letter-spacing:-4px}p{color:#91aa9d;max-width:500px}.coming{display:flex;gap:16px;align-items:center;margin-top:40px;padding:22px;border:1px solid #ffffff18;border-radius:18px;background:#0c2119d9}.coming span{color:#b8f45c;font-size:28px}.coming b,.coming small{display:block}.coming small{color:#789386;margin-top:5px}`]
})
export class ModulePageComponent {
  private readonly route = inject(ActivatedRoute);
  title = this.route.snapshot.data['title'] as string;
  description = this.route.snapshot.data['description'] as string;
}
