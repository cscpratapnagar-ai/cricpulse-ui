import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
type Filter = 'all' | 'match' | 'team' | 'player' | 'system';
interface Notice {
  id: number;
  type: Exclude<Filter, 'all'>;
  title: string;
  message: string;
  time: string;
  read: boolean;
  icon: string;
  action?: string;
}
@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './notifications.component.html',
  styleUrl: './notifications.component.scss',
})
export class NotificationsComponent {
  readonly active = signal<Filter>('all');
  readonly unreadOnly = signal(false);
  readonly newest = signal(true);
  readonly filters: { key: Filter; label: string }[] = [
    { key: 'all', label: 'All activity' },
    { key: 'match', label: 'Matches' },
    { key: 'team', label: 'Teams' },
    { key: 'player', label: 'Players' },
    { key: 'system', label: 'System' },
  ];
  readonly notices = signal<Notice[]>([
    {
      id: 1,
      type: 'match',
      title: 'Match is ready to start',
      message: 'Playing XI and toss details are complete. You can begin live scoring.',
      time: '2 min ago',
      read: false,
      icon: '●',
      action: '/matches',
    },
    {
      id: 2,
      type: 'match',
      title: 'New innings milestone',
      message: 'The batting side has crossed 100 runs in the current innings.',
      time: '18 min ago',
      read: false,
      icon: '↗',
      action: '/live',
    },
    {
      id: 3,
      type: 'team',
      title: 'Team roster updated',
      message: 'A player was added to your active team roster.',
      time: '42 min ago',
      read: true,
      icon: '◇',
      action: '/teams',
    },
    {
      id: 4,
      type: 'player',
      title: 'Player performance updated',
      message: 'Latest match statistics are now reflected in the player profile.',
      time: 'Today, 09:24',
      read: false,
      icon: '♙',
      action: '/players',
    },
    {
      id: 5,
      type: 'system',
      title: 'Workspace preferences saved',
      message: 'Your appearance and workspace preferences were updated successfully.',
      time: 'Today, 08:10',
      read: true,
      icon: '⚙',
      action: '/settings',
    },
    {
      id: 6,
      type: 'match',
      title: 'Match result published',
      message: 'The scorecard and result are now available for review.',
      time: 'Yesterday',
      read: true,
      icon: '✓',
      action: '/matches',
    },
  ]);
  readonly unread = computed(() => this.notices().filter((n) => !n.read).length);
  readonly today = computed(
    () => this.notices().filter((n) => n.time.includes('ago') || n.time.startsWith('Today')).length,
  );
  readonly filtered = computed(() => {
    let a = this.notices().filter(
      (n) =>
        (this.active() === 'all' || n.type === this.active()) && (!this.unreadOnly() || !n.read),
    );
    return this.newest() ? a : [...a].reverse();
  });
  count(key: Filter) {
    return key === 'all'
      ? this.notices().length
      : this.notices().filter((n) => n.type === key).length;
  }
  typeLabel(t: Filter) {
    return t === 'all' ? 'Activity' : t.charAt(0).toUpperCase() + t.slice(1);
  }
  toggleRead(n: Notice) {
    this.notices.update((list) => list.map((x) => (x.id === n.id ? { ...x, read: !x.read } : x)));
  }
  markAllRead() {
    this.notices.update((list) => list.map((x) => ({ ...x, read: true })));
  }
  clearRead() {
    this.notices.update((list) => list.filter((x) => !x.read));
  }
  toggleOrder() {
    this.newest.update((x) => !x);
  }
  resetFilters() {
    this.active.set('all');
    this.unreadOnly.set(false);
  }
}
