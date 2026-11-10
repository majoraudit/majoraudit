import type { MQLRequirement } from "@/types/schema/mql/mql";

export type RequirementDisplayItem =
  | { kind: "choice"; id: string; description: string; branches: MQLRequirement[] }
  | { kind: "requirement"; id: string; requirement: MQLRequirement };

const title = (req: MQLRequirement) => req.meta?.description ?? req.description ?? req.meta?.id ?? "Requirement";

export function groupRequirements(requirements: MQLRequirement[], choices: any[] = []): RequirementDisplayItem[] {
  const solverChoices = new Map(choices.filter((choice) => choice?.owner === "SOLVER").map((choice) => [String(choice.meta?.id), choice]));
  const branches = new Map<string, MQLRequirement[]>();
  requirements.forEach((req) => {
    if (req.active_when?.kind !== "CHOICE_EQUALS" || !solverChoices.has(req.active_when.choice_id)) return;
    branches.set(req.active_when.choice_id, [...(branches.get(req.active_when.choice_id) ?? []), req]);
  });

  const emitted = new Set<string>();
  return requirements.flatMap((req): RequirementDisplayItem[] => {
    const choiceId = req.active_when?.kind === "CHOICE_EQUALS" ? req.active_when.choice_id : null;
    const grouped = choiceId ? branches.get(choiceId) : undefined;
    if (!choiceId || !grouped || grouped.length < 2) return [{ kind: "requirement", id: req.requirement_id ?? req.meta?.id ?? title(req), requirement: req }];
    if (emitted.has(choiceId)) return [];
    emitted.add(choiceId);
    const prefixes = grouped.map((branch) => title(branch).replace(/\s*\([^)]*\)\s*$/, "").trim());
    const sharedTitle = prefixes.every((prefix) => prefix === prefixes[0]) ? prefixes[0] : null;
    return [{ kind: "choice", id: `choice:${choiceId}`, description: sharedTitle ?? solverChoices.get(choiceId)?.meta?.description ?? choiceId, branches: grouped }];
  });
}
