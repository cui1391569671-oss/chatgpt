# Entertainment navigation regression

Local verification: 2026-10-21.

Reproduction: entertainment → fitness → notes removed the shared `#add` button when the fitness renderer replaced `#content`. The next legacy render threw `Cannot set properties of null (setting 'textContent')` and did not populate the destination.

Fix: the main render function returns the shared button to `.header-actions` before any early delegation to a React page, rather than doing so only in the legacy render branch. The original node and event bindings are retained.

Synthetic browser verification checks entertainment round trips with notes, tasks, annual plans, English practice, fitness, wardrobe, maintenance and home. Each destination renders content, exactly one shared button survives, and no page errors occur. All 205 Node tests also pass. No production records were changed during verification.
