import type { LucideIcon } from "lucide-react";

type StatCardProps = { title: string; description: string; icon: LucideIcon };

export default function StatCard({ title, description, icon: Icon }: StatCardProps) {
  return (
    <article className="card">
      <div className="card-icon">
        <Icon size={22} />
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
    </article>
  );
}
