export default function VersionFooter() {
  const version = typeof __VERSION__ !== 'undefined' && __VERSION__ ? `v${__VERSION__}` : '';
  const commit = typeof __COMMIT_HASH__ !== 'undefined' ? __COMMIT_HASH__ : '';
  const label = [version, commit].filter(Boolean).join(' · ') || 'dev';

  return (
    <footer className="select-none">
      <span className="text-[11px] font-mono text-cocoa/40">{label}</span>
    </footer>
  );
}
