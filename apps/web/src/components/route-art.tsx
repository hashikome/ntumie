// The home hero's diagram: loose resources joining the four sections of the
// sample collection on one line, ending at the guide. Decorative structure with
// a text alternative; the wide version is replaced by a vertical one on phones.
const label =
  "Resources joining four steps on one line: choosing a spot, preparing beds, planting, and caring and harvesting, ending at the guide Starting a kitchen garden";

export function RouteArt() {
  return (
    <>
      <svg className="route-art route-art-wide" viewBox="0 0 640 470" role="img" aria-label={label}>
        <path
          className="route-feed"
          d="M40 60 C110 60 120 92 170 92 M40 104 C110 104 120 92 170 92 M40 148 C110 148 120 92 170 92 M40 214 C120 214 150 182 220 182 M40 256 C120 256 150 182 220 182 M40 318 C140 318 170 282 270 282 M40 362 C140 362 170 282 270 282 M40 420 C160 420 230 372 320 372 M200 450 C260 450 270 372 320 372"
        />
        <path
          className="route-line"
          d="M170 92 C260 92 160 182 220 182 C300 182 200 282 270 282 C350 282 240 372 320 372 C420 372 430 230 476 230"
        />
        {[60, 104, 148, 214, 256, 318, 362, 420].map((y) => (
          <circle key={y} className="route-resource" cx="34" cy={y} r="7" />
        ))}
        <circle className="route-resource" cx="194" cy="450" r="7" />
        <Stop
          x={170}
          y={92}
          labelX={192}
          labelY={78}
          title="Choosing a spot"
          hint="sunlight, water, soil"
          hintY={58}
        />
        <Stop
          x={220}
          y={182}
          labelX={242}
          labelY={170}
          title="Preparing beds"
          hint="compost, raised beds"
          hintY={150}
        />
        <Stop
          x={270}
          y={282}
          labelX={292}
          labelY={270}
          title="Planting"
          hint="sowing, hardening off"
          hintY={250}
        />
        <Stop
          x={320}
          y={372}
          labelX={342}
          labelY={406}
          title="Caring and harvesting"
          hint="watering, picking"
          hintY={426}
        />
        <rect className="route-end" x="476" y="192" width="156" height="76" rx="14" />
        <text className="route-end-label" x="494" y="224">
          Starting a
        </text>
        <text className="route-end-label" x="494" y="248">
          kitchen garden
        </text>
      </svg>
      <svg className="route-art route-art-tall" viewBox="0 0 343 300" role="img" aria-label={label}>
        <path
          className="route-feed"
          d="M22 18 C46 18 50 30 72 30 M22 42 C46 42 50 30 72 30 M22 80 C46 80 50 92 72 92 M22 104 C46 104 50 92 72 92 M22 142 C46 142 50 154 72 154 M22 166 C46 166 50 154 72 154 M22 204 C46 204 50 216 72 216 M22 228 C46 228 50 216 72 216"
        />
        <path className="route-line" d="M72 30 V216 C72 262 90 270 120 270" />
        {[18, 42, 80, 104, 142, 166, 204, 228].map((y) => (
          <circle key={y} className="route-resource" cx="16" cy={y} r="6" />
        ))}
        <Stop
          x={72}
          y={30}
          labelX={96}
          labelY={34}
          title="Choosing a spot"
          hint="sunlight, water, soil"
          hintY={54}
          small
        />
        <Stop
          x={72}
          y={92}
          labelX={96}
          labelY={96}
          title="Preparing beds"
          hint="compost, raised beds"
          hintY={116}
          small
        />
        <Stop
          x={72}
          y={154}
          labelX={96}
          labelY={158}
          title="Planting"
          hint="sowing, hardening off"
          hintY={178}
          small
        />
        <Stop
          x={72}
          y={216}
          labelX={96}
          labelY={220}
          title="Caring and harvesting"
          hint="watering, picking"
          hintY={240}
          small
        />
        <rect className="route-end" x="120" y="250" width="215" height="42" rx="12" />
        <text className="route-end-label" x="136" y="276">
          Starting a kitchen garden
        </text>
      </svg>
    </>
  );
}

function Stop({
  x,
  y,
  labelX,
  labelY,
  title,
  hint,
  hintY,
  small = false,
}: {
  x: number;
  y: number;
  labelX: number;
  labelY: number;
  title: string;
  hint: string;
  hintY: number;
  small?: boolean;
}) {
  return (
    <>
      <circle className="route-stop" cx={x} cy={y} r={small ? 9 : 10} />
      <text className="route-stop-label" x={labelX} y={labelY}>
        {title}
      </text>
      <text className="route-stop-hint" x={labelX} y={hintY}>
        {hint}
      </text>
    </>
  );
}
