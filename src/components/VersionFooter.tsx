export default function VersionFooter() {
  return (
    <footer className="fixed bottom-6 right-4 z-50 opacity-25 select-none pointer-events-none">
      <span className="text-[9px] font-mono text-cocoa">
        {typeof __COMMIT_HASH__ !== 'undefined' ? __COMMIT_HASH__ : 'dev'}
      </span>
    </footer>
  );
}
