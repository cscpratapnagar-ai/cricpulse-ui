import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AUDIENCES, ECOSYSTEM_NODES, PRODUCT_PILLARS } from '../../../landing/data/landing.data';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss',
})
export class LandingComponent implements OnInit {
  readonly ecosystemNodes = ECOSYSTEM_NODES;
  readonly audiences = AUDIENCES;
  readonly pillars = PRODUCT_PILLARS;
  lightMode = false;
  year = new Date().getFullYear();

  ngOnInit(): void {
    const savedTheme = localStorage.getItem('cricpulse-theme');
    this.lightMode = savedTheme
      ? savedTheme === 'light'
      : window.matchMedia('(prefers-color-scheme: light)').matches;
  }

  toggleTheme(): void {
    this.lightMode = !this.lightMode;
    localStorage.setItem('cricpulse-theme', this.lightMode ? 'light' : 'dark');
  }
}
