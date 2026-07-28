// One string per row; any character other than "." or " " is a filled
// pixel. All rows must be the same length (that length is the grid size).
export type PixelBitmap = string[];

type Props = {
  bitmap: PixelBitmap;
  className?: string;
};

// Renders a hand-drawn 8-bit style icon from a plain character grid, with
// crisp (non-antialiased) edges, colored via currentColor so it matches
// surrounding text.
export default function PixelIcon({ bitmap, className }: Props) {
  const size = bitmap.length;
  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className={className}
      fill="currentColor"
      shapeRendering="crispEdges"
      xmlns="http://www.w3.org/2000/svg"
    >
      {bitmap.flatMap((row, y) =>
        row
          .split("")
          .map((ch, x) =>
            ch !== "." && ch !== " " ? (
              <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} />
            ) : null,
          ),
      )}
    </svg>
  );
}
