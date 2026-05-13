export default function VersionFooter() {
  return (
    <footer className="text-right pr-4 py-3 opacity-25 select-none">
      <span className="text-[9px] font-mono text-cocoa">
        {typeof __COMMIT_HASH__ !== 'undefined' ? __COMMIT_HASH__ : 'dev'}
      </span>
    </footer>
  );
}
