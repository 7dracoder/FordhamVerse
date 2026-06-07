export interface HintResponse {
  hint: string;
  conceptTags: string[];
  nextPortalId: string | null;
  usedSnippets?: string[];
}

const BASE_URL = import.meta.env.VITE_AGENT_BASE_URL || "/api";

export async function askCampusTa(input: {
  playerId: string;
  portalId: string;
  question: string;
  codeSnapshot?: string;
  testOutput?: string;
}): Promise<HintResponse> {
  try {
    const response = await fetch(`${BASE_URL}/ta/hint`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!response.ok) throw new Error(`TA request failed: ${response.status}`);
    return (await response.json()) as HintResponse;
  } catch {
    const text = `${input.question} ${input.testOutput ?? ""}`.toLowerCase();
    if (text.includes("binary") || text.includes("test")) {
      return {
        hint: "Check the loop boundary and the `mid` update. Trace the missing-target and last-element cases by hand.",
        conceptTags: ["off_by_one", "binary_search", "testing"],
        nextPortalId: "portal-systems-debugging",
      };
    }
    return {
      hint: "Reduce this to the smallest failing example, compare expected and actual state, then patch one path at a time.",
      conceptTags: ["debugging", "testing"],
      nextPortalId: null,
    };
  }
}
