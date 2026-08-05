type BadgeVariant = "completed" | "inprogress" | "pending" | "recurring" | "paid" | "unpaid" | "low" | "ok";

const styles: Record<BadgeVariant, { bg: string; color: string; label: string }> = {
  completed:  { bg: "#EAF3DE", color: "#27500A", label: "Completed" },
  inprogress: { bg: "#E6F1FB", color: "#0C447C", label: "In progress" },
  pending:    { bg: "#FAEEDA", color: "#633806", label: "Pending" },
  recurring:  { bg: "#FBEAF0", color: "#72243E", label: "Recurring" },
  paid:       { bg: "#EAF3DE", color: "#27500A", label: "Paid" },
  unpaid:     { bg: "#FCEBEB", color: "#791F1F", label: "Unpaid" },
  low:        { bg: "#FCEBEB", color: "#791F1F", label: "Low stock" },
  ok:         { bg: "#EAF3DE", color: "#27500A", label: "In stock" },
};

export default function Badge({ variant, label }: { variant: string; label?: string }) {
  const normalised = (variant ?? "").toLowerCase() as BadgeVariant;
  const s = styles[normalised] ?? { bg: "#F0F0EC", color: "#888", label: variant };
  return (
    <span style={{ display: "inline-block", background: s.bg, color: s.color, fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20 }}>
      {label ?? s.label}
    </span>
  );
}
