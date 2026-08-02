import type { ReactNode } from 'react';

interface PagePlaceholderProps {
  eyebrow?: string;
  title: string;
  description: string;
  children?: ReactNode;
}

export function PagePlaceholder({
  eyebrow = 'Phase 1 · 工程骨架',
  title,
  description,
  children,
}: PagePlaceholderProps) {
  return (
    <section className="page-placeholder">
      <div className="page-placeholder__content">
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="page-placeholder__description">{description}</p>
        {children}
      </div>
    </section>
  );
}
