const DAY = 24 * 60 * 60 * 1000;

export function formatDate(value: number, withYear = false): string {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    ...(withYear ? { year: "numeric" } : {}),
  });
}

export function formatLongDate(value: number): string {
  return new Date(value).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function daysUntil(value: number): number {
  return Math.ceil((value - Date.now()) / DAY);
}

export function formatDeadline(value: number): string {
  const days = daysUntil(value);
  if (days < 0) return `Closed ${formatDate(value)}`;
  if (days === 0) return "Closes today";
  if (days === 1) return "Closes tomorrow";
  if (days <= 21) return `Closes in ${days} days`;
  return `Closes ${formatDate(value)}`;
}

export function formatTimeAgo(value: number): string {
  const diff = Date.now() - value;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(value);
}

export function firstName(name: string | undefined | null): string {
  return (name ?? "").trim().split(/\s+/)[0] || "there";
}

export function initials(name: string | undefined | null): string {
  return (name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "U";
}

export function difficultyLabel(value: string): string {
  if (value === "starter") return "Starter";
  if (value === "intermediate") return "Intermediate";
  return "Advanced";
}

export function pluralize(count: number, singular: string, plural?: string): string {
  return `${count} ${count === 1 ? singular : (plural ?? `${singular}s`)}`;
}

export function splitCommaList(value: string): string[] {
  return Array.from(
    new Set(
      value
        .split(",")
        .map((item) => item.trim())
        .filter((item) => item.length > 0),
    ),
  );
}
