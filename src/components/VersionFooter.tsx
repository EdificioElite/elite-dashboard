export default function VersionFooter() {
  return (
    <footer className="text-center py-4 opacity-30 select-none">
      <span className="text-[9px] font-mono text-cocoa">
        {typeof __COMMIT_HASH__ !== 'undefined' ? __COMMIT_HASH__ : 'dev'}
      </span>
    </footer>
  );
}
