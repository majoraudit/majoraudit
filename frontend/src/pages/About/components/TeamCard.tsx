import { GithubIcon, LinkedinIcon, Globe } from "lucide-react";

export interface TeamMember {
  name: string;
  role: string;
  imageUrl: string;
  github?: string;
  linkedin?: string;
  portfolio?: string;
}

export interface TeamCardProps {
  member: TeamMember;
}

function TeamCard({ member }: TeamCardProps) {
  return (
    <div className="flex flex-col bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
      {/* PHOTO */}
      <div className="w-full h-64 bg-slate-100">
        <img
          src={member.imageUrl}
          alt={member.name}
          className="w-full h-full object-cover"
        />
      </div>

      {/* INFO */}
      <div className="p-5 flex flex-col items-center text-center gap-1">
        <p className="text-lg font-semibold text-slate-900">{member.name}</p>
        <p className="text-sm text-brand-blue font-medium">{member.role}</p>

        {/* SOCIAL LINKS */}
        <div className="flex items-center gap-4 pt-2 text-slate-500">
          {member.github && (
            <a
              href={member.github}
              target="_blank"
              className="hover:text-purple-700 transition"
            >
              <GithubIcon size={20} />
            </a>
          )}

          {member.linkedin && (
            <a
              href={member.linkedin}
              target="_blank"
              className="hover:text-sky-700 transition"
            >
              <LinkedinIcon size={20} />
            </a>
          )}

          {member.portfolio && (
            <a
              href={member.portfolio}
              target="_blank"
              className="hover:text-slate-700 transition"
            >
              <Globe size={20} />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export default TeamCard;
