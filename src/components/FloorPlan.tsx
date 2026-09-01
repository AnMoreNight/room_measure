type Props = {
  width: number;
  depth: number;
  height: number;
  className?: string;
};

export function FloorPlan({ width, depth, height, className }: Props) {
  const pad = 56;
  const maxW = 420;
  const maxD = 460;
  const scale = Math.min(maxW / width, maxD / depth);
  const w = width * scale;
  const d = depth * scale;
  const svgW = w + pad * 2;
  const svgH = d + pad * 2;

  const toiletW = w * 0.42;
  const toiletD = d * 0.28;

  return (
    <svg
      viewBox={`0 0 ${svgW} ${svgH}`}
      className={className}
      role="img"
      aria-label={`Simple floor plan, ${width} by ${depth} millimetres`}
    >
      <rect x="0" y="0" width={svgW} height={svgH} className="fill-card" />

      {/* room */}
      <rect
        x={pad}
        y={pad}
        width={w}
        height={d}
        className="fill-muted stroke-foreground"
        strokeWidth={3}
      />

      {/* toilet */}
      <g>
        <rect
          x={pad + (w - toiletW) / 2}
          y={pad + 10}
          width={toiletW}
          height={toiletD}
          rx={toiletW * 0.28}
          className="fill-accent stroke-accent-foreground"
          strokeWidth={1.5}
        />
        <text
          x={pad + w / 2}
          y={pad + 10 + toiletD / 2 + 4}
          textAnchor="middle"
          className="fill-accent-foreground text-[11px] font-medium"
        >
          便器
        </text>
      </g>

      {/* door */}
      <g>
        <rect
          x={pad + w * 0.18}
          y={pad + d - 4}
          width={w * 0.5}
          height={8}
          className="fill-primary"
        />
        <path
          d={`M ${pad + w * 0.18} ${pad + d} a ${w * 0.5} ${w * 0.5} 0 0 0 ${w * 0.5} ${-w * 0.5}`}
          className="fill-none stroke-primary"
          strokeDasharray="4 4"
          strokeWidth={1.5}
        />
        <text
          x={pad + w * 0.18}
          y={pad + d + 22}
          className="fill-muted-foreground text-[11px]"
        >
          ドア 750mm
        </text>
      </g>

      {/* pipe marker */}
      <g>
        <circle cx={pad + w - 18} cy={pad + d * 0.42} r={7} className="fill-primary" />
        <text
          x={pad + w - 30}
          y={pad + d * 0.42 + 4}
          textAnchor="end"
          className="fill-muted-foreground text-[11px]"
        >
          配管
        </text>
      </g>

      {/* width dimension */}
      <g className="stroke-muted-foreground" strokeWidth={1}>
        <line x1={pad} y1={pad - 22} x2={pad + w} y2={pad - 22} />
        <line x1={pad} y1={pad - 28} x2={pad} y2={pad - 16} />
        <line x1={pad + w} y1={pad - 28} x2={pad + w} y2={pad - 16} />
      </g>
      <text
        x={pad + w / 2}
        y={pad - 30}
        textAnchor="middle"
        className="fill-foreground text-[12px] font-semibold"
      >
        {width} mm
      </text>

      {/* depth dimension */}
      <g className="stroke-muted-foreground" strokeWidth={1}>
        <line x1={pad - 22} y1={pad} x2={pad - 22} y2={pad + d} />
        <line x1={pad - 28} y1={pad} x2={pad - 16} y2={pad} />
        <line x1={pad - 28} y1={pad + d} x2={pad - 16} y2={pad + d} />
      </g>
      <text
        x={pad - 30}
        y={pad + d / 2}
        textAnchor="middle"
        transform={`rotate(-90 ${pad - 30} ${pad + d / 2})`}
        className="fill-foreground text-[12px] font-semibold"
      >
        {depth} mm
      </text>

      <text x={pad} y={svgH - 14} className="fill-muted-foreground text-[12px]">
        CH: {height} mm
      </text>
    </svg>
  );
}
