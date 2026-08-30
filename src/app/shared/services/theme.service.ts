import { DOCUMENT } from '@angular/common';
import { Injectable, computed, inject, signal } from '@angular/core';
export type AppTheme = 'light' | 'dark';
@Injectable({ providedIn: 'root' })
export class ThemeService {
 private readonly document=inject(DOCUMENT); private readonly storageKey='cricpulse-theme';
 readonly theme=signal<AppTheme>(this.readInitialTheme()); readonly isDark=computed(()=>this.theme()==='dark');
 constructor(){this.apply(this.theme())}
 toggle():void{this.setTheme(this.isDark()?'light':'dark')}
 setTheme(theme:AppTheme):void{this.theme.set(theme);localStorage.setItem(this.storageKey,theme);this.apply(theme)}
 private readInitialTheme():AppTheme{const saved=localStorage.getItem(this.storageKey) as AppTheme|null;if(saved==='light'||saved==='dark')return saved;return window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'}
 private apply(theme:AppTheme):void{this.document.documentElement.dataset['theme']=theme;this.document.documentElement.style.colorScheme=theme}
}