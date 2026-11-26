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

  get requiredRate(): string {
    if (
      this.remainingRuns == null ||
      this.remainingBalls == null ||
      this.remainingBalls === 0
    ) {
      return "—";
    }
    return ((this.remainingRuns * 6) / this.remainingBalls).toFixed(2);
  }

  get striker(): string {
    const batter = this.score?.batters?.find(
      (item) => item.playerId === this.score.strikerId,
    );
    return batter?.playerName || this.score?.strikerName || "Striker";
  }

  get strikerStats(): string {
    const batter = this.score?.batters?.find(
      (item) => item.playerId === this.score.strikerId,
    );
    return batter ? batter.runs + " (" + batter.ballsFaced + ")" : "—";
  }

  get nonStriker(): string {
    const batter = this.score?.batters?.find(
      (item) => item.playerId === this.score.nonStrikerId,
    );
    return batter?.playerName || this.score?.nonStrikerName || "Non-striker";
  }

  get nonStrikerStats(): string {
    const batter = this.score?.batters?.find(
      (item) => item.playerId === this.score.nonStrikerId,
    );
    return batter ? batter.runs + " (" + batter.ballsFaced + ")" : "—";
  }

  get bowler(): string {
    const bowler = this.score?.bowlers?.find(
      (item) => item.playerId === this.score.currentBowlerId,
    );
    return bowler?.playerName || this.score?.currentBowlerName || "Bowler";
  }

  get bowlerFigures(): string {
    const bowler = this.score?.bowlers?.find(
      (item) => item.playerId === this.score.currentBowlerId,
    );
    if (!bowler) return "—";
    return (
      bowler.wickets +
      "/" +
      bowler.runsConceded +
      " (" +
      Math.floor(bowler.legalBalls / 6) +
      "." +
      (bowler.legalBalls % 6) +
      ")"
    );
  }

  get recentBalls(): LiveRecentBall[] {
    return (this.score?.recentBalls || []).slice(-6);
  }

  get partnership(): string {
    const partnership = this.score?.partnership;
    return partnership
      ? partnership.runs + " (" + partnership.balls + ")"
      : "—";
  }

  initials(name: string): string {
    const words = (name || "").trim().split(/\s+/).filter(Boolean);
    return (
      words
        .slice(0, 2)
        .map((word) => word[0].toUpperCase())
        .join("") || "CP"
    );
  }

  ballToken(ball: LiveRecentBall): string | number {
    if (ball.wicketType) return "W";
    if (ball.extraType === "WIDE") return "Wd";
    if (ball.extraType === "NO_BALL") return "Nb";
    if (ball.extraType === "BYE") return "B" + ball.totalRuns;
    if (ball.extraType === "LEG_BYE") return "Lb" + ball.totalRuns;
    return ball.totalRuns;
  }

  ballClass(ball: LiveRecentBall): string {
    if (ball.wicketType) return "wicket";
    if (ball.totalRuns === 6) return "six";
    if (ball.totalRuns === 4) return "four";
    return "normal";
  }

  get contextText(): string {
    if (this.variant === "super-over") return "SUPER OVER";
    if (this.variant === "powerplay") return "POWERPLAY";
    if (this.remainingRuns != null && this.remainingBalls != null) {
      return (
        "NEED " +
        this.remainingRuns +
        " RUNS IN " +
        this.remainingBalls +
        " BALLS"
      );
    }
    return this.innings.toUpperCase();
  }
}
