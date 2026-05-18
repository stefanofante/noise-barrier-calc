# Example scenarios

> ⚠️ **Pre-development**: this folder will host example barrier-design
> scenarios as JSON files. The format below is the **planned** schema;
> the tool that consumes it is not yet implemented.

## Planned scenario format

Each scenario is a JSON file describing source, barrier, receivers,
and atmospheric conditions:

```json
{
  "name": "Highway noise barrier — A27 sample",
  "description": "Generic highway scenario near Treviso: 4-lane road, residential receivers 50m back",
  "source": {
    "lat": 45.66,
    "lon": 12.24,
    "lw_dba": 110,
    "height_m": 0.5,
    "spectrum": "traffic"
  },
  "barrier": {
    "vertices": [
      [45.6602, 12.2398],
      [45.6602, 12.2402]
    ],
    "height_m": 3.0
  },
  "receivers": {
    "type": "grid",
    "center": [45.6605, 12.2400],
    "extent_m": 200,
    "step_m": 10,
    "height_m": 4.0
  },
  "atmosphere": {
    "temperature_c": 15,
    "humidity_pct": 70,
    "pressure_kpa": 101.325
  },
  "ground": {
    "g_factor": 0.5
  }
}
```

## Planned example scenarios

Will be added once the tool is implemented:

- `highway-scenario.json` — Generic 4-lane motorway with single
  barrier
- `industrial-yard.json` — Industrial source with barrier along
  property line
- `railway-cut.json` — Railway in cutting with barrier on top edge
- `urban-courtyard.json` — Inner courtyard receivers shielded from
  street traffic by perimeter buildings (edge case: building +
  barrier combination)

## Where to get real data

For real barrier design, you would typically have:

- A road traffic model providing $L_W$ per source segment (from
  vehicle count, speed, road surface)
- CAD survey of the proposed barrier geometry
- Receivers from building facades to assess legal compliance
  (DPCM 14/11/1997 for Italy, or equivalent national directive)

This tool is **not** intended for that workflow. For real barrier
design, use software with proper source-line modeling and certified
output (CadnaA, SoundPLAN, NoiseModelling).
