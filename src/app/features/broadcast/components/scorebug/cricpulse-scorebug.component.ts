import { Component, Input } from "@angular/core";
import {
  LiveRecentBall,
  LiveScore,
} from "../../../../core/services/live-score.service";

export type CricPulseScorebugVariant =
  | "standard"
  | "chase"
  | "powerplay"
  | "last-overs"
  | "super-over";

@Component({
  selector: "app-cricpulse-scorebug",
  standalone: true,
  templateUrl: "./cricpulse-scorebug.component.html",
  styleUrl: "./cricpulse-scorebug.component.scss",
})
export class CricPulseScorebugComponent {
  @Input({ required: true }) score!: LiveScore;
  @Input() battingTeam = "BATTING TEAM";
  @Input() bowlingTeam = "BOWLING TEAM";
  @Input() battingLogoUrl: string | null = null;
  @Input() bowlingLogoUrl: string | null = null;
  @Input() format = "T20";
  @Input() innings = "1ST INNINGS";
  @Input() variant: CricPulseScorebugVariant = "standard";

  get overs(): string {
    const balls = Math.max(0, this.score?.legalBalls ?? 0);
    return Math.floor(balls / 6) + "." + (balls % 6);
  }

  get currentRate(): string {
    const balls = this.score?.legalBalls ?? 0;
    return balls > 0 ? ((this.score.runs * 6) / balls).toFixed(2) : "0.00";
  }

  get remainingRuns(): number | null {
    return this.score?.targetRuns == null
      ? null
      : Math.max(0, this.score.targetRuns - this.score.runs);
  }

  get remainingBalls(): number | null {
    if (!this.score?.totalOvers) return null;
    return Math.max(
      0,
      this.score.totalOvers * 6 - (this.score.legalBalls ?? 0),
    );
  }

  get requÿÿÿ¶»§q«^ÿÿÿ