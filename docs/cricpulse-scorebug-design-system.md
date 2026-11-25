# CricPulse Scorebug Design System

The broadcast scorebug is a live Angular component, not a screenshot. Match values remain HTML text so they stay editable, accessible, and bound to the live score stream.

## Component
- `CricPulseScorebugComponent` is standalone and accepts a `LiveScore`, batting/bowling team names, optional team logo URLs, format, innings label, and a visual variant.
- Team logos are optional. Missing logos render initials automatically.
- The score, overs, current run rate, target, required run rate, batter figures, partnership, bowler figures, and recent deliveries are derived from the supplied score.
- Variants: `standard`, `chase`, `powerplay`, `last-overs`, `super-over`.

## Palette
- Graphite: `#111820`
- Ice white: `#F4F5F6`
- Signal teal: `#00B8A9`
- Broadcast blue: `#4B91D8`
- Muted gold (six): `#D7B56D`
- Wicket red: `#D94B4B`

## Transparent PNG frames
Five 1920x220 RGBA frame assets are supplied under `src/assets/broadcast/scorebug/`. They are decorative framing only; live text and score values must remain in Angular HTML.
