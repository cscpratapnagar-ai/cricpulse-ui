# V9 – Tournament Player Performance

The existing `GET /api/tournaments/{id}/analytics` response includes a
`playerPerformances` collection for completed tournament matches.

Each row combines the player's recorded activity across batting, bowling and
attributed fielding:

- **Matches:** distinct completed tournament matches in which the player batted,
  bowled or received a recorded fielding attribution.
- **Batting:** innings, runs, highest score, dismissals, balls faced, average and
  strike rate, sourced from the completed-innings batting projection.
- **Bowling:** innings, legal balls, runs conceded, wickets, bowling average,
  economy and bowling strike rate, sourced from the completed-innings bowling
  projection.
- **Fielding:** catches, run-outs and stumpings with an explicit fielder
  attribution. Historical dismissals without attribution are not inferred.

Averages and rates are returned to two decimal places. A rate whose denominator
is zero is returned as zero. The tournament analytics page renders the
collection in a horizontally scrollable table so the same metrics remain
available on narrow screens and in both theme modes.

The response remains part of the existing tournament analytics endpoint; no additional player comparison endpoint is introduced.
