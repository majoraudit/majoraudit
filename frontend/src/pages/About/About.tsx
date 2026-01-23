import TeamCard from "./components/TeamCard";

const CURRENT_TEAM_MEMBERS = [
  {
    name: "Andy Cheng",
    role: "Product Lead & Software Engineer",
    imageUrl: "/about/Andy_Cheng.jpg",
    github: "https://github.com/andycheng233",
    linkedin: "https://www.linkedin.com/in/andycheng233",
    portfolio: "https://andycheng.vercel.app",
  },
  {
    name: "Ben Wu",
    role: "Product Lead & Software Engineer",
    imageUrl: "/about/Ben_Wu.jpeg",
    github: "https://github.com/winbow13",
    linkedin: "www.linkedin.com/in/benjaminwu13",
    portfolio: "",
  },
  {
    name: "Darren Kao",
    role: "Software Engineer",
    imageUrl: "/about/Darren_Kao.jpeg",
    github: "https://github.com/darren-kao",
    linkedin: "https://www.linkedin.com/in/darren-kao/",
    portfolio: "",
  },
  {
    name: "Mateo Rodriguez",
    role: "Software Engineer",
    imageUrl: "/about/Mateo_Rodriguez.jpeg",
    github: "https://github.com/mrodz",
    linkedin: "https://www.linkedin.com/in/mateo-rodriguez-dev",
    portfolio: "",
  },
  {
    name: "Rishi Sankhe",
    role: "Software Engineer",
    imageUrl: "/about/Rishi_Sankhe.jpeg",
    github: "https://github.com/RishiSankhe",
    linkedin: "https://www.linkedin.com/in/rishi-sankhe/",
    portfolio: "",
  },
  {
    name: "Stephanie Wan",
    role: "Software Engineer",
    imageUrl: "/about/Stephanie_Wan.jpg",
    github: "https://github.com/swan-07",
    linkedin: "https://www.linkedin.com/in/stephaniewan07/",
    portfolio: " https://swan-07.github.io/",
  },
];

const PAST_TEAM_MEMBERS = [
  {
    name: "Ryan Gumlia",
    role: "Former Lead & Software Engineer",
    imageUrl: "/about/Ryan_Gumlia.jpeg",
    github: "https://github.com/ryanggum",
    linkedin: "https://www.linkedin.com/in/ryangumlia/",
    portfolio: "https://www.ryangumlia.com/",
  },
];

function About() {
  return (
    <div className="w-full flex justify-center">
      <div className="w-full max-w-5xl px-6 py-16 space-y-12">
        {/* Intro */}
        <section className="space-y-4">
          <p className="text-2xl font-bold uppercase tracking-[0.25em] text-brand-blue">
            About Us
          </p>

          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Built by Yale students, for Yale students.
          </h1>

          <p className="text-slate-600 text-lg">
            MajorAudit started as a simple idea: academic planning should be
            easy. We wanted a single, user friendly place where your courses,
            major requirements, and long–term plans actually make sense
            together.
          </p>
        </section>

        {/* Mission */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-slate-900">Our mission</h2>
          <p className="text-slate-600">
            We&apos;re here to make degree planning effortless and genuinely
            helpful. MajorAudit turns complex requirements into structured
            rules, then maps them to real Yale courses so you can see exactly
            where you stand and what&apos;s possible next.
          </p>
        </section>

        {/* Team */}
        <section className="space-y-6">
          <h2 className="text-xl font-semibold text-slate-900">
            Who&apos;s behind MajorAudit?
          </h2>

          <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-4">
            {CURRENT_TEAM_MEMBERS.map((member) => (
              <TeamCard key={member.name} member={member} />
            ))}
          </div>
        </section>

        <section className="space-y-6">
          <h2 className="text-xl font-semibold text-slate-900">
            Past Contributors
          </h2>

          <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-4">
            {PAST_TEAM_MEMBERS.map((member) => (
              <TeamCard key={member.name} member={member} />
            ))}
          </div>
        </section>

        {/* Footer Note */}
        <section className="border-t border-slate-200 pt-6 text-sm text-slate-500">
          <p>
            MajorAudit is an independent student-built tool and is not an
            official Yale University system. Always confirm final graduation
            status with your DUS or academic advisor.
          </p>
        </section>
      </div>
    </div>
  );
}

export default About;
