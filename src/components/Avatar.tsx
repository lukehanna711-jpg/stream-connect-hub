interface Props {
  name: string;
  color?: string | null;
  size?: number;
  online?: boolean;
  ring?: "host" | "synced" | "none";
}

export function getInitials(name: string) {
  const parts = name.trim().split(/[\s_-]+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function Avatar({ name, color, size = 36, online, ring = "none" }: Props) {
  const bg = color || "#ff5500";
  const ringColor = ring === "host" ? "#ff5500" : ring === "synced" ? "#00cc66" : "transparent";
  return (
    <div className="relative inline-block shrink-0">
      <div
        className="flex items-center justify-center font-semibold text-white"
        style={{
          width: size,
          height: size,
          background: bg,
          borderRadius: "50%",
          fontSize: size * 0.4,
          boxShadow: ring !== "none" ? `0 0 0 2px ${ringColor}` : undefined,
          border: ring === "none" ? "none" : undefined,
        }}
      >
        {getInitials(name)}
      </div>
      {online && (
        <span
          className="absolute bottom-0 right-0 block rounded-full border-2"
          style={{ width: size * 0.28, height: size * 0.28, background: "#00cc66", borderColor: "#141414" }}
        />
      )}
    </div>
  );
}
