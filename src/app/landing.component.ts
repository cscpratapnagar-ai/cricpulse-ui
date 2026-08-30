import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink],
  template: `
    <main class="landing" [class.light]="lightMode">
      <div class="noise"></div>
      <nav class="nav container">
        <a routerLink="/" class="brand" aria-label="CricPulse home">
          <span class="brand-mark"><i></i><i></i><i></i></span>
          <span>Cric<span>Pulse</span></span>
        </a>
        <div class="nav-links">
          <a href="#platform">Platform</a><a href="#experience">Experience</a><a href="#features">Features</a>
        </div>
        <div class="nav-actions">
          <button class="theme-toggle" (click)="toggleTheme()" [attr.aria-label]="lightMode ? 'Enable dark mode' : 'Enable light mode'">
            <span>{{ lightMode ? '☀' : '☾' }}</span>
          </button>
          <a class="signin" routerLink="/login">Sign in</a>
          <a class="nav-cta" routerLink="/signup">Start free <b>↗</b></a>
        </div>
      </nav>

      <section class="hero container">
        <div class="hero-copy">
          <div class="eyebrow"><span class="pulse"></span> THE INTELLIGENT CRICKET PLATFORM</div>
          <h1>Cricket has<br>a new <em>pulse.</em></h1>
          <p class="hero-text">From the first ball to the final celebration, CricPulse brings scoring, teams, tournaments, analytics and live experiences into one connected command center.</p>
          <div class="hero-actions">
            <a routerLink="/signup" class="primary-btn">Build your cricket world <span>→</span></a>
            <a href="#platform" class="watch-link"><span class="play">▶</span> Explore CricPulse</a>
          </div>
          <div class="trust-row">
            <div class="avatars"><span>VP</span><span>AK</span><span>RS</span><span>+</span></div>
            <div><strong>One platform. Every level of cricket.</strong><small>Built for players, scorers, teams and organizers.</small></div>
          </div>
        </div>

        <div class="hero-stage" aria-label="Live match command center preview">
          <div class="grid-lines"></div><div class="glow glow-a"></div><div class="glow glow-b"></div>
          <div class="orbit orbit-1"></div><div class="orbit orbit-2"></div>
          <div class="live-pill"><span></span> LIVE COMMAND CENTER</div>
          <article class="score-card">
            <header><div><span class="live-dot"></span> LIVE MATCH</div><small>19.4 OVERS · CHASE</small></header>
            <div class="teams-row">
              <div class="team"><div class="crest blue">MU</div><b>Mumbai United</b><small>Home</small></div>
              <div class="score"><strong>178<span>/4</span></strong><small>Need 14 from 2 balls</small><div class="balls"><i></i><i></i><i class="four">4</i><i>1</i><i>•</i><i class="active">?</i></div></div>
              <div class="team"><div class="crest green">CT</div><b>Coastal Tigers</b><small>Away</small></div>
            </div>
            <div class="win-bar"><div><span>WIN PROBABILITY</span><b>64%</b></div><div class="bar"><i></i></div><small>MUMBAI UNITED</small></div>
            <footer><span><b>AR</b> A. RAHMAN <em>82*</em></span><span>● 12,481 watching</span></footer>
          </article>
          <div class="floating stat-card"><span>LIVE MOMENTUM</span><div class="chart"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div><b>+28%</b></div>
          <div class="floating boundary-card"><span>✦</span><strong>FOUR</strong><small>Boundary detected</small></div>
          <div class="floating ball-card"><span class="ball-icon">●</span><div><b>Every ball matters</b><small>Real-time. Everywhere.</small></div></div>
        </div>
      </section>

      <section class="signal container">
        <div><span class="signal-icon">◉</span><p><b>LIVE INTELLIGENCE</b> <small>Every delivery becomes insight.</small></p></div>
        <div><span class="signal-icon">⌁</span><p><b>ONE CONNECTED SYSTEM</b> <small>No fragmented cricket workflow.</small></p></div>
        <div><span class="signal-icon">✦</span><p><b>BUILT TO SCALE</b> <small>From street cricket to leagues.</small></p></div>
      </section>

      <section id="platform" class="platform container">
        <div class="section-label">01 — THE PLATFORM</div>
        <div class="section-heading"><h2>One game.<br><em>One ecosystem.</em></h2><p>Stop switching between spreadsheets, scorebooks, chats and disconnected tools. CricPulse gives every part of your cricket world a shared heartbeat.</p></div>
        <div class="bento">
          <article class="bento-main"><div class="card-top"><span>LIVE SCORING ENGINE</span><b>01</b></div><h3>Score the game.<br>Feel the moment.</h3><div class="mini-pitch"><div class="pitch"></div><span class="bat">↗</span><span class="ball">●</span></div><p>Ball-by-ball precision with a scoring experience designed for actual match pressure.</p></article>
          <article><span class="feature-number">02</span><div class="feature-symbol">◌</div><h3>Teams & players</h3><p>Profiles, squads, roles and performance — connected naturally.</p></article>
          <article><span class="feature-number">03</span><div class="feature-symbol">⌁</div><h3>Smart tournaments</h3><p>Fixtures, points, qualification and match operations in one flow.</p></article>
          <article class="analytics"><span class="feature-number">04</span><h3>Performance intelligence</h3><div class="line-chart"><svg viewBox="0 0 420 110" preserveAspectRatio="none"><path d="M0 92 C40 80 55 98 90 70 S135 50 165 72 S205 96 240 42 S290 80 325 28 S375 50 420 10"/></svg></div><p>Understand what happened. Discover what happens next.</p></article>
        </div>
      </section>

      <section id="experience" class="experience container">
        <div class="experience-copy"><div class="section-label">02 — THE EXPERIENCE</div><h2>Made for the people<br>who <em>live cricket.</em></h2><p>Not another generic sports dashboard. Every screen is designed around real cricket decisions, real match pressure and the communities behind the game.</p><a routerLink="/signup" class="text-link">Discover the experience <span>→</span></a></div>
        <div class="experience-stack"><article><span>01</span><div><b>For scorers</b><small>Fast, focused, error-resistant match control.</small></div><i>↗</i></article><article><span>02</span><div><b>For teams</b><small>Everything your squad needs to stay connected.</small></div><i>↗</i></article><article><span>03</span><div><b>For organizers</b><small>Run bigger competitions without bigger chaos.</small></div><i>↗</i></article><article><span>04</span><div><b>For fans</b><small>Follow every story as it unfolds live.</small></div><i>↗</i></article></div>
      </section>

      <section id="features" class="future container">
        <div class="future-orb"></div>
        <div class="section-label">03 — BUILT FOR WHAT'S NEXT</div>
        <h2>Your cricket world,<br><em>always in motion.</em></h2>
        <p>CricPulse is being built as infrastructure for the next generation of cricket — live, intelligent, connected and ready to grow with the game.</p>
        <a routerLink="/signup" class="primary-btn">Start building today <span>→</span></a>
      </section>

      <footer class="footer container">
        <a routerLink="/" class="brand"><span class="brand-mark"><i></i><i></i><i></i></span><span>Cric<span>Pulse</span></span></a>
        <p>Where every ball finds its story.</p>
        <small>© {{ year }} CricPulse. Built for the game.</small>
      </footer>
    </main>
  `,
  styles: [`
    :host{display:block}.landing{--bg:#06110d;--surface:#0a1813;--surface2:#0e2119;--text:#edf5f0;--muted:#82948b;--line:rgba(255,255,255,.09);--lime:#b9f66a;--lime2:#8de553;min-height:100vh;color:var(--text);background:var(--bg);font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;overflow:hidden;position:relative;transition:.35s background,.35s color}
    .landing.light{--bg:#f5f7f3;--surface:#fff;--surface2:#edf2ec;--text:#102019;--muted:#64736a;--line:rgba(16,32,25,.11);--lime:#67b52f;--lime2:#4b9b24}
    .noise{position:fixed;inset:0;pointer-events:none;opacity:.035;z-index:10;background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.8'/%3E%3C/svg%3E")}.container{width:min(1180px,calc(100% - 48px));margin-inline:auto}
    .nav{height:88px;display:flex;align-items:center;justify-content:space-between;position:relative;z-index:20}.brand{display:flex;align-items:center;gap:10px;color:var(--text);font-size:21px;font-weight:850;letter-spacing:-1px;text-decoration:none}.brand>span:last-child>span{color:var(--lime)}.brand-mark{width:28px;height:28px;border:2px solid var(--lime);border-radius:9px;display:flex;align-items:flex-end;justify-content:center;gap:3px;padding:5px}.brand-mark i{display:block;width:3px;background:var(--lime);border-radius:2px}.brand-mark i:nth-child(1){height:7px}.brand-mark i:nth-child(2){height:13px}.brand-mark i:nth-child(3){height:9px}.nav-links{display:flex;gap:34px;margin-left:90px}.nav-links a,.signin{color:var(--muted);font-size:13px;text-decoration:none;transition:.2s}.nav-links a:hover,.signin:hover{color:var(--text)}.nav-actions{display:flex;align-items:center;gap:20px}.theme-toggle{width:36px;height:36px;border:1px solid var(--line);border-radius:50%;background:transparent;color:var(--text);cursor:pointer;font-size:17px}.nav-cta{background:var(--lime);color:#10200f;text-decoration:none;padding:11px 16px;border-radius:9px;font-size:12px;font-weight:850}.nav-cta b{margin-left:8px;font-size:15px}
    .hero{min-height:690px;display:grid;grid-template-columns:1.02fr .98fr;align-items:center;gap:50px;padding:70px 0 90px}.eyebrow,.section-label{color:var(--lime);font-size:10px;font-weight:850;letter-spacing:2.1px}.pulse{display:inline-block;width:7px;height:7px;background:var(--lime);border-radius:50%;margin-right:9px;box-shadow:0 0 0 0 rgba(185,246,106,.6);animation:pulse 2s infinite}.hero h1{font-size:clamp(60px,7.1vw,94px);line-height:.91;letter-spacing:-6px;margin:20px 0 25px;font-weight:850}.hero h1 em,.section-heading em,.experience h2 em,.future h2 em{font-style:normal;color:var(--muted);font-weight:600}.hero-text{max-width:530px;color:var(--muted);font-size:16px;line-height:1.75;margin:0}.hero-actions{display:flex;align-items:center;gap:24px;margin-top:33px}.primary-btn{display:inline-flex;align-items:center;gap:30px;padding:16px 18px 16px 20px;border-radius:11px;background:var(--lime);color:#10200f;text-decoration:none;font-size:13px;font-weight:850;box-shadow:0 18px 40px rgba(130,210,70,.15);transition:.2s}.primary-btn:hover{transform:translateY(-2px);box-shadow:0 24px 50px rgba(130,210,70,.25)}.primary-btn span{font-size:20px}.watch-link{display:flex;align-items:center;gap:9px;color:var(--text);text-decoration:none;font-size:13px;font-weight:750}.play{width:25px;height:25px;display:grid;place-items:center;border:1px solid var(--line);border-radius:50%;font-size:8px;color:var(--lime)}.trust-row{display:flex;align-items:center;gap:15px;margin-top:50px}.avatars{display:flex}.avatars span{width:31px;height:31px;margin-left:-7px;border:2px solid var(--bg);border-radius:50%;display:grid;place-items:center;font-size:8px;font-weight:800;background:#9c6b52;color:white}.avatars span:nth-child(2){background:#566fba}.avatars span:nth-child(3){background:#7256a9}.avatars span:last-child{background:var(--lime);color:#173018}.avatars span:first-child{margin-left:0}.trust-row strong{display:block;font-size:11px}.trust-row small{display:block;color:var(--muted);font-size:10px;margin-top:4px}
    .hero-stage{height:540px;position:relative;display:grid;place-items:center;perspective:1000px}.grid-lines{position:absolute;width:530px;height:530px;background:linear-gradient(var(--line) 1px,transparent 1px),linear-gradient(90deg,var(--line) 1px,transparent 1px);background-size:42px 42px;mask-image:radial-gradient(circle,black 15%,transparent 70%);transform:rotateX(58deg) rotateZ(-18deg);opacity:.42}.glow{position:absolute;border-radius:50%;filter:blur(45px)}.glow-a{width:310px;height:310px;background:rgba(114,205,70,.18);right:40px;top:55px}.glow-b{width:190px;height:190px;background:rgba(61,116,225,.12);left:20px;bottom:70px}.orbit{position:absolute;border:1px solid var(--line);border-radius:50%;opacity:.6}.orbit-1{width:440px;height:440px}.orbit-2{width:350px;height:350px;border-style:dashed;animation:spin 32s linear infinite}.live-pill{position:absolute;z-index:5;top:31px;right:18px;border:1px solid var(--line);background:color-mix(in srgb,var(--surface) 88%,transparent);backdrop-filter:blur(15px);padding:9px 12px;border-radius:30px;color:var(--muted);font-size:9px;font-weight:800;letter-spacing:1.1px}.live-pill span{display:inline-block;width:6px;height:6px;background:#f36c63;border-radius:50%;margin-right:7px;box-shadow:0 0 10px #f36c63}
    .score-card{position:relative;z-index:3;width:min(390px,85%);padding:22px;border:1px solid var(--line);border-radius:22px;background:color-mix(in srgb,var(--surface) 87%,transparent);box-shadow:0 35px 80px rgba(0,0,0,.28);backdrop-filter:blur(25px);transform:rotate(-2deg);transition:.3s}.score-card:hover{transform:rotate(0) translateY(-6px)}.score-card header,.score-card footer{display:flex;justify-content:space-between;align-items:center}.score-card header{font-size:9px;font-weight:850;letter-spacing:1.2px;color:var(--lime)}.score-card header small{color:var(--muted);font-size:8px}.live-dot{display:inline-block;width:5px;height:5px;background:var(--lime);border-radius:50%;margin-right:6px}.teams-row{display:grid;grid-template-columns:1fr 1.4fr 1fr;align-items:center;text-align:center;margin:32px 0}.team{display:flex;flex-direction:column;align-items:center;gap:6px}.crest{width:48px;height:48px;border-radius:15px;display:grid;place-items:center;color:white;font-size:13px;font-weight:900;box-shadow:inset 0 1px 0 rgba(255,255,255,.2)}.blue{background:linear-gradient(135deg,#3969c6,#192c6a)}.green{background:linear-gradient(135deg,#5b9b55,#1e4e32)}.team b{font-size:9px;white-space:nowrap}.team small{color:var(--muted);font-size:8px}.score strong{font-size:37px;letter-spacing:-2px}.score strong span{font-size:20px;color:var(--muted)}.score>small{display:block;color:var(--lime);font-size:8px;margin-top:3px}.balls{display:flex;justify-content:center;gap:4px;margin-top:12px}.balls i{width:18px;height:18px;border-radius:50%;display:grid;place-items:center;background:var(--surface2);color:var(--muted);font-size:8px;font-style:normal}.balls .four{background:rgba(185,246,106,.15);color:var(--lime)}.balls .active{border:1px dashed var(--lime);color:var(--lime);background:transparent}.win-bar{border-top:1px solid var(--line);padding-top:14px}.win-bar>div:first-child{display:flex;justify-content:space-between}.win-bar span,.win-bar small{font-size:8px;color:var(--muted);letter-spacing:.8px}.win-bar b{font-size:10px;color:var(--lime)}.bar{height:5px;background:var(--surface2);border-radius:10px;margin:9px 0}.bar i{display:block;width:64%;height:100%;border-radius:10px;background:linear-gradient(90deg,var(--lime2),var(--lime))}.score-card footer{border-top:1px solid var(--line);padding-top:14px;margin-top:12px;color:var(--muted);font-size:8px}.score-card footer b{background:var(--lime);color:#173018;padding:4px;border-radius:5px;margin-right:5px}.score-card footer em{font-style:normal;color:var(--lime);margin-left:5px}
    .floating{position:absolute;z-index:6;border:1px solid var(--line);background:color-mix(in srgb,var(--surface) 92%,transparent);backdrop-filter:blur(15px);box-shadow:0 18px 40px rgba(0,0,0,.2)}.stat-card{left:-3px;top:110px;width:145px;padding:13px;border-radius:13px;transform:rotate(-6deg)}.stat-card span{font-size:7px;color:var(--muted);letter-spacing:1px}.stat-card b{color:var(--lime);font-size:16px}.chart{height:38px;display:flex;align-items:end;gap:4px;margin:8px 0}.chart i{display:block;width:12px;border-radius:3px 3px 0 0;background:var(--lime);opacity:.2}.chart i:nth-child(1){height:24%}.chart i:nth-child(2){height:47%}.chart i:nth-child(3){height:38%}.chart i:nth-child(4){height:72%}.chart i:nth-child(5){height:55%}.chart i:nth-child(6){height:90%}.chart i:nth-child(7){height:100%;opacity:1}.boundary-card{right:2px;bottom:65px;padding:12px 16px;border-radius:13px;transform:rotate(5deg)}.boundary-card span{color:var(--lime);font-size:15px}.boundary-card strong,.boundary-card small{display:block}.boundary-card strong{font-size:16px;margin-top:2px}.boundary-card small{font-size:8px;color:var(--muted);margin-top:4px}.ball-card{left:38px;bottom:25px;display:flex;align-items:center;gap:9px;padding:11px 13px;border-radius:12px}.ball-icon{width:23px;height:23px;border-radius:50%;background:#f2e9db;color:#c86a56;display:grid;place-items:center;font-size:8px}.ball-card b,.ball-card small{display:block}.ball-card b{font-size:9px}.ball-card small{font-size:8px;color:var(--muted);margin-top:3px}
    .signal{display:grid;grid-template-columns:repeat(3,1fr);border-top:1px solid var(--line);border-bottom:1px solid var(--line);padding:23px 0}.signal>div{display:flex;align-items:center;gap:12px;padding:0 28px;border-left:1px solid var(--line)}.signal>div:first-child{border:0;padding-left:0}.signal-icon{font-size:20px;color:var(--lime)}.signal p{margin:0}.signal b,.signal small{display:block}.signal b{font-size:9px;letter-spacing:1px}.signal small{font-size:9px;color:var(--muted);margin-top:5px}
    .platform{padding:150px 0 80px}.section-heading{display:flex;justify-content:space-between;align-items:end;margin:24px 0 55px}.section-heading h2,.experience h2,.future h2{font-size:clamp(42px,5.2vw,68px);line-height:.96;letter-spacing:-4px;margin:0}.section-heading p{max-width:390px;color:var(--muted);line-height:1.75;font-size:14px;margin:0}.bento{display:grid;grid-template-columns:1.2fr 1fr 1fr;gap:13px}.bento article{min-height:255px;border:1px solid var(--line);border-radius:20px;background:var(--surface);padding:23px;position:relative;overflow:hidden}.bento-main{grid-row:span 2;background:linear-gradient(150deg,var(--surface),color-mix(in srgb,var(--surface) 75%,#254c2b))!important}.card-top{display:flex;justify-content:space-between;color:var(--muted);font-size:9px;letter-spacing:1.2px}.card-top span{color:var(--lime)}.bento h3{font-size:22px;letter-spacing:-1px;margin:20px 0 10px}.bento p{color:var(--muted);font-size:11px;line-height:1.6;max-width:260px}.mini-pitch{height:180px;position:relative;margin-top:20px;background:radial-gradient(ellipse at center,rgba(185,246,106,.08),transparent 65%)}.pitch{position:absolute;width:70px;height:150px;border:1px solid rgba(185,246,106,.35);left:50%;top:12px;transform:translateX(-50%);border-radius:50%}.bat{position:absolute;left:55%;top:52px;color:var(--lime);font-size:45px;transform:rotate(-35deg)}.ball{position:absolute;left:34%;top:40px;color:#e66e5b;animation:ballmove 2.8s ease-in-out infinite}.feature-number{position:absolute;right:20px;top:20px;color:var(--muted);font-size:9px}.feature-symbol{font-size:45px;color:var(--lime);margin-top:30px}.analytics{grid-column:span 2;min-height:255px!important}.line-chart{height:90px;margin:22px 0 8px}.line-chart svg{width:100%;height:100%;overflow:visible}.line-chart path{fill:none;stroke:var(--lime);stroke-width:2}
    .experience{padding:120px 0;display:grid;grid-template-columns:.9fr 1.1fr;gap:110px;align-items:center}.experience h2{margin:20px 0 25px}.experience-copy>p{color:var(--muted);font-size:14px;line-height:1.8;max-width:430px}.text-link{display:inline-block;margin-top:22px;color:var(--lime);text-decoration:none;font-size:12px;font-weight:800}.text-link span{font-size:18px;margin-left:9px}.experience-stack{border-top:1px solid var(--line)}.experience-stack article{height:94px;border-bottom:1px solid var(--line);display:grid;grid-template-columns:45px 1fr 20px;align-items:center;gap:15px;transition:.2s}.experience-stack article:hover{padding-left:12px;background:color-mix(in srgb,var(--surface) 65%,transparent)}.experience-stack article>span{color:var(--muted);font-size:10px}.experience-stack b,.experience-stack small{display:block}.experience-stack b{font-size:16px}.experience-stack small{color:var(--muted);font-size:10px;margin-top:5px}.experience-stack i{color:var(--lime);font-style:normal}
    .future{margin-top:40px;padding:110px 20px;text-align:center;border:1px solid var(--line);border-radius:28px;background:radial-gradient(circle at 50% 110%,rgba(185,246,106,.15),transparent 45%),var(--surface);position:relative;overflow:hidden}.future-orb{position:absolute;width:620px;height:620px;border:1px solid var(--line);border-radius:50%;left:50%;top:35px;transform:translateX(-50%);box-shadow:0 0 100px rgba(185,246,106,.06),inset 0 0 90px rgba(185,246,106,.04)}.future>*:not(.future-orb){position:relative;z-index:1}.future h2{margin:22px 0}.future p{max-width:530px;margin:0 auto 28px;color:var(--muted);font-size:14px;line-height:1.75}.footer{padding:55px 0 38px;display:grid;grid-template-columns:1fr 1fr 1fr;align-items:center}.footer p{text-align:center;color:var(--muted);font-size:11px}.footer small{text-align:right;color:var(--muted);font-size:9px}
    @keyframes pulse{50%{box-shadow:0 0 0 7px rgba(185,246,106,0)}}@keyframes spin{to{transform:rotate(360deg)}}@keyframes ballmove{50%{transform:translate(35px,-25px) scale(.8)}}
    @media(max-width:900px){.nav-links{display:none}.hero{grid-template-columns:1fr;padding-top:60px}.hero-stage{height:490px}.hero-copy{text-align:center}.hero-text,.trust-row{margin-inline:auto}.hero-actions{justify-content:center}.section-heading,.experience{grid-template-columns:1fr;display:grid;gap:35px}.section-heading{align-items:start}.bento{grid-template-columns:1fr 1fr}.bento-main{grid-row:auto}.analytics{grid-column:span 2}.experience{padding:80px 0}.signal>div{padding:0 12px}.signal small{display:none}}
    @media(max-width:600px){.container{width:min(100% - 32px,1180px)}.nav{height:72px}.signin{display:none}.nav-actions{gap:10px}.nav-cta{padding:10px 12px}.hero{padding-top:48px;min-height:auto}.hero h1{font-size:60px;letter-spacing:-4px}.hero-text{font-size:14px}.hero-actions{flex-direction:column;gap:18px}.hero-stage{height:420px;margin-top:10px}.orbit-1{width:330px;height:330px}.orbit-2{width:270px;height:270px}.score-card{padding:17px;width:350px}.stat-card{left:-7px;transform:scale(.82) rotate(-6deg)}.boundary-card{right:-5px;transform:scale(.84) rotate(5deg)}.ball-card{display:none}.signal{grid-template-columns:1fr}.signal>div{padding:13px 0;border-left:0;border-bottom:1px solid var(--line)}.signal>div:last-child{border:0}.signal small{display:block}.platform{padding-top:90px}.section-heading h2,.experience h2,.future h2{letter-spacing:-3px}.section-heading{margin-bottom:35px}.bento{grid-template-columns:1fr}.analytics{grid-column:auto}.bento article{min-height:210px}.bento-main{min-height:400px!important}.experience{gap:45px}.future{padding:80px 16px;border-radius:20px}.footer{grid-template-columns:1fr;text-align:center;gap:20px}.footer p,.footer small{text-align:center}.live-pill{right:0;top:8px}.trust-row{justify-content:center;text-align:left}}
  `]
})
export class LandingComponent implements OnInit {
  lightMode = false;
  year = new Date().getFullYear();
  ngOnInit(): void {
    const saved = localStorage.getItem('cricpulse-theme');
    this.lightMode = saved ? saved === 'light' : window.matchMedia('(prefers-color-scheme: light)').matches;
  }
  toggleTheme(): void {
    this.lightMode = !this.lightMode;
    localStorage.setItem('cricpulse-theme', this.lightMode ? 'light' : 'dark');
  }
}
