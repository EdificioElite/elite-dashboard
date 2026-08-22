import type { NavItem } from '../lib/nav';

export default function NavSection({ label, tone = 'edificio', items, isActive, onSelect, itemClassName = 'px-3 py-2 text-[13px]' }: {
  label: string;
  tone?: 'edificio' | 'admin';
  items: NavItem[];
  isActive: (path: string) => boolean;
  onSelect: (path: string) => void;
  itemClassName?: string;
}) {
  const titleColor = tone === 'admin' ? 'text-accent-2' : 'text-accent-dark';
  return (
    <section className="rounded-md border border-cocoa/8 bg-cocoa/4 p-3" aria-label={label}>
      <div className={`eyebrow px-1 pb-2 mb-2 border-b border-cocoa/10 ${titleColor}`}>{label}</div>
      <ul className="flex flex-col gap-0.5" role="list">
        {items.map((item) => {
          const active = isActive(item.path);
          return (
            <li key={item.path}>
              <button
                onClick={() => onSelect(item.path)}
                className={`w-full text-left rounded-lg font-medium transition-colors ${itemClassName} ${
                  active
                    ? 'text-cocoa bg-accent/12 font-semibold'
                    : 'text-cocoa/55 hover:text-cocoa hover:bg-cocoa/4'
                }`}
                style={active ? { boxShadow: 'inset 2px 0 0 var(--accent)' } : undefined}
                aria-current={active ? 'page' : undefined}
              >
                {item.label}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
