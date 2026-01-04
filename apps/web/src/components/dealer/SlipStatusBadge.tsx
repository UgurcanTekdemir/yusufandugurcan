interface SlipStatusBadgeProps {
  status: string;
}

export function SlipStatusBadge({ status }: SlipStatusBadgeProps) {
  const getStatusStyles = (status: string) => {
    switch (status.toLowerCase()) {
      case "pending":
        return "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30";
      case "won":
        return "bg-green-500/20 text-green-400 border border-green-500/30";
      case "lost":
        return "bg-red-500/20 text-red-400 border border-red-500/30";
      case "cancelled":
        return "bg-gray-500/20 text-gray-400 border border-gray-500/30";
      default:
        return "bg-gray-500/20 text-gray-400 border border-gray-500/30";
    }
  };

  return (
    <span
      className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getStatusStyles(status)}`}
    >
      {status}
    </span>
  );
}

