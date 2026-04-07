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
  const url = `/api/majors/${majorId}/mql?specialization=${majorSpecification}`;
  console.log("Fetching MQL:", url);
  const res = await fetch(url, { credentials: "include" });
  const body = await res.json();
  if (!res.ok) {
    console.log("MQL error response:", body);
    throw new Error(`Failed to fetch major MQL: ${res.status}`);
  }
  return body;
}