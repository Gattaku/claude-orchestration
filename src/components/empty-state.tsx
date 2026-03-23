interface EmptyStateProps {
  title: string;
  description?: string;
}

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <p className="text-lg font-medium text-muted-foreground">{title}</p>
      {description && (
        <p
          data-testid="empty-state-description"
          className="mt-2 text-sm text-muted-foreground"
        >
          {description}
        </p>
      )}
    </div>
  );
}
