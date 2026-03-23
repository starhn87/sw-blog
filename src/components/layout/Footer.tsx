export function Footer() {
  return (
    <footer className="border-t border-border py-8">
      <div className="mx-auto max-w-4xl px-6 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} SW Blog. All rights reserved.</p>
      </div>
    </footer>
  );
}
