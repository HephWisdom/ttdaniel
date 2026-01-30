function cn(...c) {
  return c.filter(Boolean).join(" ");
}

export default function Button({
  as = "button",
  href,
  children,
  variant = "primary",
  className = "",
  onClick,
}) {
  const Comp = as;

const styles = {
  primary:
    "bg-zinc-950 text-white hover:bg-zinc-900 focus:ring-zinc-950/20 dark:bg-white dark:text-zinc-950 dark:hover:bg-white/90 dark:focus:ring-white/20",
  ghost:
    "border border-black/10 bg-white hover:bg-black/5 focus:ring-black/10 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10 dark:focus:ring-white/10",
  subtle:
    "bg-black/[0.03] hover:bg-black/[0.06] border border-black/10 focus:ring-black/10 dark:bg-white/5 dark:hover:bg-white/10 dark:border-white/10 dark:focus:ring-white/10",
};


  return (
    <Comp
      href={href}
      onClick={onClick}
      className={cn(
        "inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-medium transition",
        "focus:outline-none focus:ring-4",
        styles[variant],
        className
      )}
    >
      {children}
    </Comp>
  );
}
