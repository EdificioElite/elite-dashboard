export default function VersionFooter() {
  const commit = typeof __COMMIT_HASH__ !== 'undefined' ? __COMMIT_HASH__ : '';
  const label = commit || 'dev';

  return (
    <footer className="select-none">
      <span className="text-[11px] font-mono text-cocoa/40">{label}</span>
    </footer>
  );
}
