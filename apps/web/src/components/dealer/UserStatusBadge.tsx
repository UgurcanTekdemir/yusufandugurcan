interface UserStatusBadgeProps {
  status: "active" | "banned";
}

export function UserStatusBadge({ status }: UserStatusBadgeProps) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
        status === "active"
          ? "bg-green-500/20 text-green-400 border border-green-500/30"
          : "bg-red-500/20 text-red-400 border border-red-500/30"
      }`}
    >
      {status}
    </span>
  );
}

