export function AuthBanner() {
  return (
    <div className="hidden lg:flex relative h-full min-h-screen overflow-hidden bg-slate-900">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage:
            'url(https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1200&q=80)',
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />

      <div className="relative z-10 mt-auto p-10 pb-14">
        <h2 className="text-3xl md:text-4xl font-bold text-white leading-tight">
          Build smarter,
          <br />
          deliver on time
        </h2>
        <p className="mt-3 text-base text-white/80 max-w-sm">
          Manage your construction projects from WhatsApp to dashboard in one place.
        </p>
        <div className="flex gap-2 mt-6">
          <span className="w-8 h-1.5 rounded-full bg-white" />
          <span className="w-2 h-1.5 rounded-full bg-white/50" />
          <span className="w-2 h-1.5 rounded-full bg-white/50" />
        </div>
      </div>
    </div>
  );
}
