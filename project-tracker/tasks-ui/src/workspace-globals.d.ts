// Browser bridges are declared from their implementations, not permissive index signatures.
export {};
declare global {
 interface Window {
  WorkspaceFeedback:typeof import("./workspace-feedback").workspaceFeedback;
  WorkspacePrimitives:typeof import("./workspace-primitives").workspacePrimitives;
  WorkspaceShell:typeof import("./workspace-shell").workspaceShell;
  WorkspaceTasks:typeof import("./main").workspaceTasks;
  WorkspaceAnnualPlans:typeof import("./annual-plans").workspaceAnnualPlans;
  WorkspaceFitness:typeof import("./fitness").workspaceFitness;
  WorkspacePersonalInfo:typeof import("./personal-info").workspacePersonalInfo;
  WorkspaceWordPractice:typeof import("./word-practice").workspaceWordPractice;
 }
}
