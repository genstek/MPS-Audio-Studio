# Presets, plugin roadmap and intellectual property

## Factory presets
Flat, Rock, Pop, Jazz, Acoustic, Vocal Clarity, Cinematic. These are **original heuristic starting points**. No fixed preset can professionally master every song. Do not claim they come from a named mastering engineer.

## Parameter schema
Use `schemas/preset.example.json`: metadata, schema version, ordered modules, parameters and ranges; unit tests for roundtrip and invalid values. Allow importing/exporting JSON. Factory presets read-only; user presets mutable and migratable.

## Third-party presets
Only import profiles with compatible parameter mapping and permission/license. Never scrape or redistribute paid preset packs. Maintain source/license/attribution metadata.

## AU/VST3 support
Native plugin hosting is a P2 feature: separate scan process, sandbox/crash containment where feasible, plugin state serialization, latency compensation, GUI embedding, architecture compatibility, code-signing review. Do not advertise support before it is implemented and tested.

## Reference preset
`Lia v6` is an approved **audio target**; not a fully reconstructable settings preset. Offer it in UI as 'Sonic Reference' until actual DSP chain and coefficients are derived, saved and independently validated.
