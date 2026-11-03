# LAS-76 — hardware-style EQ / Dynamics / Limiter panels (PROPOSAL, nothing implemented)

Status: **draft for Gennady's review. No visual selection has been made and no reskin is implemented.** Design acceptance: **Not Run / pending**. Coordinates with LAS-65 (research/proposals), LAS-44 (tokens) and LAS-45 (shell); no new processing engine.

## What is not done yet
- **Manufacturer research is not done.** This job did not browse the web, so I list no model names or links, to avoid invented citations. A research pass has to cite official manufacturer sources, and the Fostex Model 820 reference must be consulted for styling, before the options below are final.
- **No mockup images exist.** Below are layout descriptions only. SVG/HTML mockups are the next step, covering empty, stopped, playing, bypassed, edited and narrow states.

## Hard constraints for any option
- Every knob, fader and meter maps to a parameter that exists today: Compressor threshold, ratio, attack, release, knee, makeup, detector; Limiter ceiling, input gain, release; EQ band frequency, gain, Q and type, plus module on/off. Nothing decorative that implies a missing feature (for example no sidechain filter, no look-ahead selector).
- Meters show real signal. Configured-state graphics (curve, gain-reduction scale) come from actual settings.
- No manufacturer logos, copied artwork or product photos in the app. Original artwork only.
- Keyboard precision (number boxes and arrow keys) and the movable windows stay. Help is on the controls (LAS-74).

## Option A — "Rack module"
Wide 2U-style faceplate: dark satin panel, engraved scale rings around rotary knobs, a vertical LED gain-reduction ladder on the right, a bypass switch with a lamp at top-left. EQ: graph window in the upper half with knob groups per selected band beneath. Dynamics: knob row (threshold, ratio, attack, release, knee, makeup) plus a GR ladder. Limiter: input and ceiling knobs, a GR ladder and a peak-hold LED.
Narrow layout: knobs reflow to 2 columns and the graph stacks above them.

## Option B — "Console channel strip section"
Tall, narrow strip (Fostex-style channel look): vertical faders for gain-like parameters, small knobs for time constants, and coloured switch caps. The EQ strip is the graphic equaliser from LAS-75, with faders side by side. Dynamics and Limiter are stacked strips that share a meter bridge at the top.
Narrow layout: strips scroll horizontally, the meter bridge stays pinned.

## Compact cards
Both options: a small faceplate thumbnail with a bypass lamp, the current key value (for example "−18 dB thr"), and a mini GR or curve glyph drawn from real settings.

## Decision needed
Choose A, B or a hybrid; approve the band count in LAS-75; then I will research the manufacturer sources, produce SVG/HTML mockups for review, and implement only the chosen direction.
