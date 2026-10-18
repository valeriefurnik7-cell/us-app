'use client';

// iOS Settings-style rows: label on the left, value on the right, inset hairline between rows.

export function FieldGroup({ title, footer, children }) {
  return (
    <section className="mx-4 mt-6">
      {title && <h3 className="mb-1.5 px-4 text-caption font-semibold tracking-wide text-text-secondary uppercase">{title}</h3>}
      <ul className="overflow-hidden rounded-card bg-surface">{children}</ul>
      {footer && <p className="mt-1.5 px-4 text-caption text-text-secondary">{footer}</p>}
    </section>
  );
}

export function Field({ label, children }) {
  return (
    <li className="group flex min-h-12 items-center ps-4">
      <div className="flex min-h-12 flex-1 items-center gap-3 border-b border-text-secondary/20 pe-4 group-last:border-0">
        <span className="w-28 shrink-0 text-body">{label}</span>
        {children}
      </div>
    </li>
  );
}

export function TextInput(props) {
  return (
    <input
      {...props}
      className="h-12 w-0 min-w-0 flex-1 bg-transparent text-end text-body text-text-secondary outline-none placeholder:text-text-secondary/50 focus:text-text"
    />
  );
}
