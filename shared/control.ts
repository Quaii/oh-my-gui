export type ModelTarget = { id: string; provider: string; modelId: string; thinking?: string; position?: { x: number; y: number } };
export type RouteBranch = { id: string; label: string; target: string };
export type RoutingConfig = {
  enabled: boolean; name: string; classifier: { provider: string; modelId: string; prompt: string };
  branches: RouteBranch[]; targets: ModelTarget[];
  positions?: Record<string, { x: number; y: number }>;
};
export type Persona = { id: string; name: string; prompt: string; placement: "first" | "append"; stripIdentity: boolean };
export type Project = { id: string; name: string; path: string; createdAt: string };
export type WebControlConfig = { routing: RoutingConfig; personas: Persona[]; defaultPersona: string | null; projects: Project[] };
export const DEFAULT_CONTROL_CONFIG: WebControlConfig = {
  routing: { enabled: false, name: "Engineering router", classifier: { provider: "", modelId: "", prompt: "Classify the software engineering request by its difficulty. Simple means small edits or questions. Standard means a bounded feature or bug fix. Complex means architecture, broad refactors, or difficult debugging." }, branches: [ { id: "simple", label: "Simple", target: "target-1" }, { id: "standard", label: "Standard", target: "target-2" }, { id: "complex", label: "Complex", target: "target-3" } ], targets: [ { id: "target-1", provider: "", modelId: "" }, { id: "target-2", provider: "", modelId: "" }, { id: "target-3", provider: "", modelId: "" } ] },
  personas: [], defaultPersona: null, projects: [],
};
