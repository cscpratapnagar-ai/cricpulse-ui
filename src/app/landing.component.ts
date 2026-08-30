import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AUDIENCES, ECOSYSTEM_NODES, PRODUCT_PILLARS } from './features/landing/data/landing.data';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink],
  template: `
    <main class="landing" [class.light]="lightMode">
      <div class="ambient ambient-one"></div><div class="ambient ambient-two"></div>

      <nav class="nav container">
        <a routerLink="/" class="brand"><span class="mark"><i></i><i></i><i></i></span><span>Cric<span>Pulse</span></span></a>
        <div class="nav-links"><a href="#platform">Platform</a><a href="#vision">Vision</a><a href="#people">For everyone</a></div>
        <div class="nav-actions">
          <button class="theme" (click)="toggleTheme()" [attr.aria-label]="lightMode ? 'Dark mode' : 'Light mode'">{{ lightMode ? '☀' : '◐' }}</button>
          <a routerLink="/login">Sign in</a><a routerLink="/signup" class="nav-cta">Enter CricPulse <b>↗</b></a>
        </div>
      </nav>

      <section class="hero container">
        <div class="hero-copy">
          <div class="eyebrow"><span></span> CRICKET, CONNECTED</div>
          <h1>One platform.<br><em>Every side of cricket.</em></h1>
          <p>CricPulse is building a connected digital foundation for the people, communities and experiences that make cricket move.</p>
          <div class="hero-actions"><a routerLink="/signup" class="primary">Explore the platform <b>→</b></a><a href="#platform" class="secondary">Discover how it works <b>↓</b></a></div>
          <div class="hero-note"><i></i><span>Designed as an ecosystem — not another collection of tools.</span></div>
        </div>

        <div class="hero-visual" aria-label="CricPulse connected ecosystem visualization">
          <div class="halo halo-a"></div><div class="halo halo-b"></div>
          <div class="orbit orbit-a"></div><div class="orbit orbit-b"></div>
          <div class="signal-line"></div>
          <div class="core"><span class="core-ring"></span><div class="core-logo"><i></i><i></i><i></i></div><strong>CRICPULSE</strong><small>CONNECTED CRICKET</small></div>
          <div class="node node-top"><b>◌</b><span>LIVE</span></div>
          <div class="node node-right"><b>✦</b><span>INSIGHT</span></div>
          <div class="node node-bottom"><b>⌁</b><span>COMMUNITY</span></div>
          <div class="node node-left"><b>↗</b><span>GROWTH</span></div>
          <div class="data-card card-one"><small>SYSTEM STATUS</small><strong>Always connected</strong><div><i></i><i></i><i></i><i></i><i></i></div></div>
          <div class="data-card card-two"><small>ONE GAME</small><strong>Infinite possibilities</strong></div>
        </div>
      </section>

      <section class="manifesto">
        <div class="container">
          <p class="manifesto-kicker">NOT JUST ABOUT WHAT HAPPENS ON THE FIELD</p>
          <h2>Cricket creates moments.<br><em>We connect what comes next.</em></h2>
        </div>
      </section>

      <section id="platform" class="platform container">
        <div class="section-top"><div><span class="number">01</span><span class="label">THE CRICPULSE PLATFORM</span></div><p>A universal product foundation designed to connect the many layers of modern cricket without forcing them into separate worlds.</p></div>
        <div class="ecosystem">
          @for (node of ecosystemNodes; track node.title) {
            <article><span class="node-number">{{ node.eyebrow }}</span><div class="node-icon">{{ node.icon }}</div><h3>{{ node.title }}</h3><p>{{ node.description }}</p><span class="line"></span></article>
          }
        </div>
      </section>

      <section id="vision" class="vision container">
        <div class="vision-copy"><span class="number">02</span><span class="label">BEYOND SCORING</span><h2>A game happens once.<br><em>Its story should keep moving.</em></h2><p>Every action in cricket can become context. Context can become history. History can become intelligence. CricPulse is designed around that continuity.</p></div>
        <div class="journey">
          <div class="journey-line"></div>
          <article><span>01</span><div><b>A moment happens</b><small>Something worth recording begins.</small></div></article>
          <article><span>02</span><div><b>A digital record forms</b><small>Information becomes structured and connected.</small></div></article>
          <article><span>03</span><div><b>Identity and history grow</b><small>People and organizations build continuity.</small></div></article>
          <article><span>04</span><div><b>Intelligence emerges</b><small>Patterns become useful understanding.</small></div></article>
          <article><span>05</span><div><b>The ecosystem grows</b><small>More possibilities become possible.</small></div></article>
        </div>
      </section>

      <section class="pillars">
        <div class="container">
          <div class="section-head"><span class="number">03</span><span class="label">PRODUCT PRINCIPLES</span><h2>Built like infrastructure.<br><em>Felt like a product.</em></h2></div>
          <div class="pillar-grid">@for (pillar of pillars; track pillar.title) {<article><span>✦</span><h3>{{ pillar.title }}</h3><p>{{ pillar.copy }}</p></article>}</div>
        </div>
      </section>

      <section id="people" class="people container">
        <div class="people-copy"><span class="number">04</span><span class="label">ONE ECOSYSTEM, MANY PERSPECTIVES</span><h2>Built around the people<br><em>who make cricket happen.</em></h2><p>Different roles. Different needs. One connected environment that can grow without losing its center.</p></div>
        <div class="audience-cloud">@for (audience of audiences; track audience) {<span>{{ audience }}</span>}</div>
      </section>

      <section class="future container">
        <div class="future-grid"></div><div class="future-orbit"></div>
        <span class="label">THE NEXT ERA OF CRICKET</span>
        <h2>Built for every possibility<br><em>the game hasn't discovered yet.</em></h2>
        <p>CricPulse is a long-term platform vision: modular, connected and ready for the next chapter of cricket.</p>
        <a routerLink="/signup" class="primary">Step into CricPulse <b>→</b></a>
      </section>

      <footer class="footer container"><a routerLink="/" class="brand"><span class="mark"><i></i><i></i><i></i></span><span>Cric<span>Pulse</span></span></a><p>Cricket, with more connected possibilities.</p><small>© {{ year }} CricPulse</small></footer>
    </main>
  `,
  styles: [`
    :host{display:block}.landing{--bg:#07100d;--surface:#0c1914;--text:#eff6f1;--muted:#829188;--line:rgba(255,255,255,.1);--lime:#b8f56a;min-height:100vh;background:var(--bg);color:var(--text);font-family:Inter,system-ui,sans-serif;overflow:hidden;position:relative}.landing.light{--bg:#f5f7f3;--surface:#fff;--text:#102019;--muted:#68766e;--line:rgba(16,32,25,.1);--lime:#5da72d}.container{width:min(1180px,calc(100% - 48px));margin:auto}.ambient{position:absolute;border-radius:50%;filter:blur(110px);pointer-events:none}.ambient-one{width:500px;height:500px;background:rgba(120,220,70,.08);top:120px;left:-200px}.ambient-two{width:450px;height:450px;background:rgba(78,118,230,.07);top:800px;right:-200px}.nav{height:88px;display:flex;align-items:center;justify-content:space-between;position:relative;z-index:5}.brand{display:flex;align-items:center;gap:10px;color:var(--text);text-decoration:none;font-weight:850;font-size:21px;letter-spacing:-1px}.brand>span:last-child span{color:var(--lime)}.mark{width:29px;height:29px;border:2px solid var(--lime);border-radius:9px;display:flex;align-items:end;justify-content:center;gap:3px;padding:5px;box-sizing:border-box}.mark i{width:3px;background:var(--lime);border-radius:2px}.mark i:nth-child(1){height:7px}.mark i:nth-child(2){height:14px}.mark i:nth-child(3){height:10px}.nav-links{display:flex;gap:34px}.nav a{font-size:12px}.nav-links a,.nav-actions>a:not(.nav-cta){color:var(--muted);text-decoration:none}.nav-actions{display:flex;align-items:center;gap:19px}.theme{width:34px;height:34px;border-radius:50%;border:1px solid var(--line);background:transparent;color:var(--text);cursor:pointer}.nav-cta,.primary{background:var(--lime);color:#10200e!important;text-decoration:none;padding:12px 16px;border-radius:10px;font-weight:850}.nav-cta b,.primary b{margin-left:12px;font-size:16px}.hero{min-height:690px;display:grid;grid-template-columns:1fr 1fr;align-items:center;gap:40px}.eyebrow,.label{font-size:10px;letter-spacing:2px;color:var(--lime);font-weight:850}.eyebrow span{display:inline-block;width:7px;height:7px;background:var(--lime);border-radius:50%;margin-right:8px;box-shadow:0 0 0 7px rgba(184,245,106,.08)}.hero h1{font-size:clamp(56px,6.7vw,88px);line-height:.93;letter-spacing:-5px;margin:22px 0}.hero h1 em,h2 em{font-style:normal;color:var(--muted);font-weight:550}.hero-copy>p{font-size:16px;line-height:1.75;color:var(--muted);max-width:520px}.hero-actions{display:flex;gap:24px;align-items:center;margin-top:32px}.primary{display:inline-flex;align-items:center}.secondary{color:var(--text);font-size:12px;text-decoration:none;font-weight:750}.secondary b{color:var(--lime);margin-left:8px}.hero-note{display:flex;gap:9px;margin-top:45px;color:var(--muted);font-size:10px}.hero-note i{width:6px;height:6px;border-radius:50%;background:var(--lime);margin-top:4px}.hero-visual{height:540px;position:relative;display:grid;place-items:center}.halo{position:absolute;border-radius:50%;filter:blur(40px)}.halo-a{width:280px;height:280px;background:rgba(184,245,106,.16)}.halo-b{width:170px;height:170px;background:rgba(82,113,228,.13);transform:translate(110px,-90px)}.orbit{position:absolute;border:1px solid var(--line);border-radius:50%}.orbit-a{width:430px;height:430px}.orbit-b{width:340px;height:340px;border-style:dashed;animation:spin 35s linear infinite}.core{width:150px;height:150px;border-radius:50%;background:color-mix(in srgb,var(--surface) 85%,transparent);border:1px solid var(--line);box-shadow:0 25px 70px rgba(0,0,0,.3);display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:2;backdrop-filter:blur(18px)}.core-ring{position:absolute;width:180px;height:180px;border:1px solid rgba(184,245,106,.25);border-radius:50%;animation:pulse 3s infinite}.core-logo{display:flex;align-items:end;gap:3px;height:24px}.core-logo i{display:block;width:4px;background:var(--lime);border-radius:3px}.core-logo i:nth-child(1){height:10px}.core-logo i:nth-child(2){height:23px}.core-logo i:nth-child(3){height:15px}.core strong{font-size:10px;letter-spacing:1.5px;margin-top:9px}.core small{font-size:6px;color:var(--muted);letter-spacing:1px;margin-top:4px}.node{position:absolute;width:78px;height:78px;border-radius:20px;border:1px solid var(--line);background:color-mix(in srgb,var(--surface) 90%,transparent);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;z-index:3;box-shadow:0 14px 35px rgba(0,0,0,.16)}.node b{font-size:21px;color:var(--lime)}.node span{font-size:7px;letter-spacing:1px;color:var(--muted);font-weight:800}.node-top{top:28px}.node-right{right:34px}.node-bottom{bottom:28px}.node-left{left:34px}.data-card{position:absolute;padding:13px 15px;border:1px solid var(--line);border-radius:14px;background:color-mix(in srgb,var(--surface) 90%,transparent);backdrop-filter:blur(15px);z-index:4}.data-card small,.data-card strong{display:block}.data-card small{font-size:7px;color:var(--muted);letter-spacing:1px}.data-card strong{font-size:10px;margin-top:6px}.card-one{top:110px;left:8px}.card-one div{display:flex;gap:4px;margin-top:10px}.card-one i{width:14px;height:4px;background:var(--line);border-radius:3px}.card-one i:nth-child(2),.card-one i:nth-child(4){background:var(--lime)}.card-two{right:2px;bottom:95px}.manifesto{padding:130px 0;text-align:center;border-block:1px solid var(--line);background:linear-gradient(90deg,transparent,var(--surface),transparent)}.manifesto-kicker{font-size:9px;letter-spacing:2px;color:var(--lime)}.manifesto h2,.section-head h2,.vision h2,.people h2,.future h2{font-size:clamp(42px,5.2vw,70px);line-height:.98;letter-spacing:-4px;margin:22px 0 0}.platform{padding:140px 0}.section-top{display:flex;justify-content:space-between;align-items:end;margin-bottom:55px}.number{font-size:10px;color:var(--muted);margin-right:13px}.section-top p{max-width:390px;color:var(--muted);font-size:13px;line-height:1.75;margin:0}.ecosystem{display:grid;grid-template-columns:repeat(4,1fr);gap:13px}.ecosystem article,.pillar-grid article{position:relative;min-height:270px;padding:24px;border:1px solid var(--line);border-radius:20px;background:var(--surface);overflow:hidden}.node-number{font-size:9px;color:var(--muted);position:absolute;right:20px}.node-icon{font-size:42px;color:var(--lime);margin-top:28px}.ecosystem h3,.pillar-grid h3{font-size:21px;margin:22px 0 8px;letter-spacing:-1px}.ecosystem p,.pillar-grid p{font-size:11px;line-height:1.65;color:var(--muted)}.line{position:absolute;bottom:0;left:0;width:0;height:2px;background:var(--lime);transition:.35s}.ecosystem article:hover .line{width:100%}.vision{padding:120px 0;display:grid;grid-template-columns:1fr 1fr;gap:110px;border-top:1px solid var(--line)}.vision-copy h2,.people h2{margin-top:22px}.vision-copy p,.people-copy p{color:var(--muted);font-size:14px;line-height:1.8;max-width:500px}.journey{position:relative}.journey-line{position:absolute;left:9px;top:12px;bottom:12px;width:1px;background:var(--line)}.journey article{position:relative;display:grid;grid-template-columns:42px 1fr;gap:16px;padding:0 0 28px}.journey article>span{width:19px;height:19px;border-radius:50%;background:var(--surface);border:1px solid var(--lime);display:grid;place-items:center;color:var(--lime);font-size:6px;z-index:1}.journey b,.journey small{display:block}.journey b{font-size:13px}.journey small{font-size:10px;color:var(--muted);margin-top:5px}.pillars{padding:120px 0;background:var(--surface);border-block:1px solid var(--line)}.section-head{text-align:center}.pillar-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:60px}.pillar-grid article span{color:var(--lime);font-size:20px}.people{padding:140px 0;display:grid;grid-template-columns:1fr 1fr;gap:90px}.audience-cloud{display:flex;align-content:center;justify-content:center;gap:11px;flex-wrap:wrap}.audience-cloud span{padding:13px 17px;border:1px solid var(--line);border-radius:30px;font-size:11px;background:var(--surface);transition:.25s}.audience-cloud span:hover{border-color:var(--lime);transform:translateY(-3px);color:var(--lime)}.future{min-height:540px;padding:100px 25px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;position:relative;overflow:hidden;border:1px solid var(--line);border-radius:28px;background:radial-gradient(circle at center bottom,rgba(184,245,106,.13),transparent 45%),var(--surface)}.future-grid{position:absolute;inset:0;background:linear-gradient(var(--line) 1px,transparent 1px),linear-gradient(90deg,var(--line) 1px,transparent 1px);background-size:42px 42px;mask-image:radial-gradient(circle,black,transparent 70%);opacity:.4}.future-orbit{position:absolute;width:620px;height:620px;border:1px solid var(--line);border-radius:50%;box-shadow:inset 0 0 100px rgba(184,245,106,.05)}.future>*:not(.future-grid):not(.future-orbit){position:relative;z-index:1}.future p{max-width:560px;color:var(--muted);font-size:14px;line-height:1.75;margin:25px 0}.footer{padding:55px 0 38px;display:grid;grid-template-columns:1fr 1fr 1fr;align-items:center}.footer p{text-align:center;color:var(--muted);font-size:11px}.footer small{text-align:right;color:var(--muted);font-size:9px}@keyframes spin{to{transform:rotate(360deg)}}@keyframes pulse{50%{transform:scale(1.08);opacity:.25}}@media(max-width:900px){.nav-links{display:none}.hero,.vision,.people{grid-template-columns:1fr}.hero{text-align:center;padding:70px 0}.hero-actions,.hero-note{justify-content:center}.hero-visual{margin-top:20px}.section-top{display:grid;gap:25px}.ecosystem{grid-template-columns:1fr 1fr}.pillar-grid{grid-template-columns:1fr}.vision{gap:60px}.people{gap:50px}.people-copy{text-align:center}.people-copy p{margin-inline:auto}}@media(max-width:600px){.container{width:calc(100% - 32px)}.nav{height:72px}.nav-actions{gap:10px}.nav-actions>a:not(.nav-cta){display:none}.nav-cta{padding:10px 12px}.hero{padding-top:55px}.hero h1{font-size:56px;letter-spacing:-3.5px}.hero-copy>p{font-size:14px}.hero-actions{flex-direction:column}.hero-visual{height:400px}.orbit-a{width:310px;height:310px}.orbit-b{width:250px;height:250px}.node{width:60px;height:60px;border-radius:16px}.node-top{top:40px}.node-bottom{bottom:35px}.node-left{left:0}.node-right{right:0}.data-card{display:none}.manifesto{padding:90px 0}.manifesto h2,.section-head h2,.vision h2,.people h2,.future h2{letter-spacing:-3px}.platform,.people{padding:90px 0}.ecosystem{grid-template-columns:1fr}.vision{padding:90px 0}.pillars{padding:90px 0}.footer{grid-template-columns:1fr;gap:20px;text-align:center}.footer p,.footer small{text-align:center}}`]
})
export class LandingComponent implements OnInit {
  readonly ecosystemNodes = ECOSYSTEM_NODES;
  readonly audiences = AUDIENCES;
  readonly pillars = PRODUCT_PILLARS;
  lightMode = false;
  year = new Date().getFullYear();

  ngOnInit(): void {
    const savedTheme = localStorage.getItem('cricpulse-theme');
    this.lightMode = savedTheme ? savedTheme === 'light' : window.matchMedia('(prefers-color-scheme: light)').matches;
  }

  toggleTheme(): void {
    this.lightMode = !this.lightMode;
    localStorage.setItem('cricpulse-theme', this.lightMode ? 'light' : 'dark');
  }
}