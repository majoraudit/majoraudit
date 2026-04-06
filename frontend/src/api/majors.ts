export async function apiFetchMajorTemplatesList(): Promise<string[]> {
  const res = await fetch("/api/majors/", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch major list");
  return res.json();
}

export async function apiFetchMajorTemplate(majorId: string) {
  const res = await fetch(`/api/majors/${majorId}/`, { credentials: "include" });
  if (!res.ok) throw new Error(`Failed to fetch major template ${majorId}`);
  return res.json();
}

export async function apiFetchMajorMQL(majorId: string, majorSpecification: string) {
  const res = await fetch(`/api/majors/${majorId}/mql?specialization=${majorSpecification}`, { credentials: "include" });
  const body = await res.json();
  if (!res.ok) throw new Error(`Failed to fetch major MQL for ${majorId}/${majorSpecification}.mql: ${res.status}`);
  return body;
}