import Link from "next/link";

const dashboards = [
  { href: '/admin/dashboard', title: 'School Admin', description: 'Manage buses, routes, and fleet operations from one control center.', icon: '01', accent: 'bg-[#d7ff62] text-slate-950' },
  { href: '/driver/tracker', title: 'Driver', description: 'Start routes and share your location securely while driving.', icon: '02', accent: 'bg-[#ff9d7a] text-slate-950' },
  { href: '/parent/map', title: 'Parent', description: 'Follow the school bus live and see when it reaches each stop.', icon: '03', accent: 'bg-[#8ab4ff] text-slate-950' },
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#f4f3ee] text-[#18201d]">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-6 md:px-10">
        <Link href="/" className="flex items-center gap-3 text-lg font-bold tracking-tight">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-[#18201d] text-white">SB</span>
          SchoolBus
        </Link>
        <div className="hidden items-center gap-7 text-sm font-semibold md:flex">
          <a href="#dashboards">Dashboards</a>
          <span className="rounded-full border border-[#18201d]/20 px-4 py-2">Live tracking</span>
        </div>
      </nav>

      <section className="mx-auto grid max-w-7xl items-center gap-10 px-5 pb-16 pt-12 md:min-h-[610px] md:grid-cols-[1.15fr_.85fr] md:px-10">
        <div>
          <div className="mb-7 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] shadow-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> Real-time fleet visibility
          </div>
          <h1 className="max-w-4xl text-6xl font-black leading-[0.88] tracking-[-0.055em] md:text-8xl">
            Every bus.<br />Every stop.<br /><span className="text-[#ff7051]">Right on time.</span>
          </h1>
          <p className="mt-8 max-w-xl text-lg leading-8 text-slate-600">A safer, simpler way for schools, drivers, parents, and students to stay connected throughout every journey.</p>
          <a href="#dashboards" className="mt-8 inline-flex items-center gap-3 rounded-full bg-[#18201d] px-7 py-4 font-bold text-white transition hover:-translate-y-1">Explore dashboards <span>↓</span></a>
        </div>

        <div className="relative mx-auto w-full max-w-md rounded-[2rem] bg-[#d7ff62] p-6 shadow-[18px_18px_0_#18201d] md:p-8">
          <div className="flex items-center justify-between"><span className="text-sm font-bold uppercase tracking-[0.16em]">Bus status</span><span className="rounded-full bg-white px-3 py-1 text-xs font-bold">LIVE</span></div>
          <div className="mt-12 rounded-[1.5rem] bg-[#18201d] p-6 text-white">
            <p className="text-sm text-white/60">Route 14 · 7:42 AM</p>
            <div className="mt-2 flex items-end justify-between"><div><strong className="text-5xl">8</strong><span className="ml-2 text-white/60">min away</span></div><div className="text-right"><p className="text-xs text-white/60">NEXT STOP</p><p className="font-bold">Oak Street</p></div></div>
          </div>
          <div className="mt-5 flex gap-2">{[0,1,2,3,4].map((item) => <span key={item} className={`h-2 flex-1 rounded-full ${item < 3 ? 'bg-[#18201d]' : 'bg-white/70'}`} />)}</div>
        </div>
      </section>

      <section id="dashboards" className="bg-white px-5 py-20 md:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><p className="text-sm font-bold uppercase tracking-[0.2em] text-[#ff7051]">Choose your role</p><h2 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">Built for everyone on the route.</h2></div><p className="max-w-md text-slate-500">Purpose-built tools keep daily school transportation organized and visible.</p></div>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {dashboards.map((dashboard) => (
              <Link key={dashboard.href} href={dashboard.href} className="group rounded-[1.75rem] border border-slate-200 bg-[#fafafa] p-6 transition duration-300 hover:-translate-y-2 hover:border-transparent hover:shadow-xl">
                <div className="flex items-center justify-between"><span className={`grid h-14 w-14 place-items-center rounded-full text-sm font-black ${dashboard.accent}`}>{dashboard.icon}</span><span className="text-2xl transition group-hover:translate-x-1">↗</span></div>
                <h3 className="mt-12 text-3xl font-black">{dashboard.title}</h3><p className="mt-3 leading-7 text-slate-500">{dashboard.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
