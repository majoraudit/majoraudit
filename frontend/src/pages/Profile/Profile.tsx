import { useState, useEffect } from "react";
import { useUser } from "@/contexts/UserContext";
import {
  CLASS_YEARS,
  UNDERGRAD_MAJORS,
  LANGUAGE_SUBJECTS,
  LANGUAGE_LEVELS,
} from "@/constants/onboarding";

function Profile() {
  const { userData, setUserData } = useUser();
  const [first_name, setFirst_name] = useState(userData?.first_name ?? "");
  const [last_name, setLast_name] = useState(userData?.last_name ?? "");
  const [classYear, setClassYear] = useState(userData?.classYear ?? "");
  const [intendedMajorId, setIntendedMajorId] = useState(
    userData?.intendedMajorId ?? ""
  );
  const [intendedLanguageCode, setIntendedLanguageCode] = useState(
    userData?.intendedLanguageCode ?? ""
  );
  const [languageLevel, setLanguageLevel] = useState(
    userData?.FYP?.languageRequirement ?? "L1"
  );

  useEffect(() => {
    if (!userData) return;
    setFirst_name(userData.first_name ?? "");
    setLast_name(userData.last_name ?? "");
    setClassYear(userData.classYear ?? "");
    setIntendedMajorId(userData.intendedMajorId ?? "");
    setIntendedLanguageCode(userData.intendedLanguageCode ?? "");
    setLanguageLevel(userData.FYP?.languageRequirement ?? "L1");
  }, [userData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData) return;
    setUserData({
      ...userData,
      first_name: first_name.trim() || userData.first_name,
      last_name: last_name.trim() || userData.last_name,
      classYear: classYear || undefined,
      intendedMajorId: intendedMajorId || undefined,
      intendedLanguageCode: intendedLanguageCode || undefined,
      FYP: {
        ...userData.FYP,
        languageRequirement: languageLevel,
      },
    });
  };

  if (!userData) return null;

  return (
    <div className="mx-auto max-w-md px-6 py-12">
      <h1 className="text-2xl font-bold text-slate-900 mb-1">Your profile</h1>
      <p className="text-slate-600 mb-6 text-sm">
        Change your details below. Updates are saved locally.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">
            Name
          </label>
          <div className="flex w-full gap-2 min-w-0">
            <input
              type="text"
              value={first_name}
              onChange={(e) => setFirst_name(e.target.value)}
              placeholder="First"
              className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
            />
            <input
              type="text"
              value={last_name}
              onChange={(e) => setLast_name(e.target.value)}
              placeholder="Last"
              className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">
            Graduation year
          </label>
          <select
            value={classYear}
            onChange={(e) => setClassYear(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
          >
            <option value="">Select year</option>
            {CLASS_YEARS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">
            Major
          </label>
          <select
            value={intendedMajorId}
            onChange={(e) => setIntendedMajorId(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
          >
            <option value="">Select major</option>
            {UNDERGRAD_MAJORS.map((major) => (
              <option key={major} value={major}>
                {major}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">
            Foreign language
          </label>
          <select
            value={intendedLanguageCode}
            onChange={(e) => setIntendedLanguageCode(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
          >
            <option value="">Select language</option>
            {LANGUAGE_SUBJECTS.map((opt) => (
              <option key={opt.code} value={opt.code}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">
            Language level
          </label>
          <select
            value={languageLevel}
            onChange={(e) => setLanguageLevel(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
          >
            {LANGUAGE_LEVELS.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="w-full cursor-pointer inline-flex items-center justify-center rounded-lg bg-brand-blue px-5 py-3 text-sm font-semibold text-white shadow-sm hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
        >
          Save changes
        </button>
      </form>
    </div>
  );
}

export default Profile;
