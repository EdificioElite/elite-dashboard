export default function VersionFooter() {
  return (
    <footer className="absolute bottom-6 right-4 select-none opacity-25">
      <span className="text-[9px] font-mono text-cocoa">
        {typeof __COMMIT_HASH__ !== 'undefined' ? __COMMIT_HASH__ : 'dev'}
      </span>
    </footer>
  );
}
