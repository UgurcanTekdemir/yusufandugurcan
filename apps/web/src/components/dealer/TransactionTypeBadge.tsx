interface TransactionTypeBadgeProps {
  type: "credit" | "debit" | "adjustment";
}

export function TransactionTypeBadge({ type }: TransactionTypeBadgeProps) {
  const styles = {
    credit: "bg-green-500/20 text-green-400 border border-green-500/30",
    debit: "bg-red-500/20 text-red-400 border border-red-500/30",
    adjustment: "bg-gray-500/20 text-gray-400 border border-gray-500/30",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${styles[type]}`}
    >
      {type}
    </span>
  );
}

