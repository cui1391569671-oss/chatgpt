// Browser bridges are declared from their implementations, not permissive index signatures.
export {};
declare global {
 interface Window {
  WorkspaceCalendarControls:typeof import("./workspace-calendar-controls").workspaceCalendarControls;
  WorkspaceSegments:typeof import("./workspace-segments").workspaceSegments;
  WorkspaceFeedback:typeof import("./workspace-feedback").workspaceFeedback;
  WorkspacePrimitives:typeof import("./workspace-primitives").workspacePrimitives;
  WorkspaceShell:typeof import("./workspace-shell").workspaceShell;
  WorkspaceTasks:typeof import("./main").workspaceTasks;
  WorkspaceProjectPlan:typeof import("./project-plan").workspaceProjectPlan;
  WorkspaceAnnualPlans:typeof import("./annual-plans").workspaceAnnualPlans;
  WorkspaceHelpPage:typeof import("./workspace-help").workspaceHelp;
  WorkspacePhotography:typeof import("./photography").workspacePhotography;
  WorkspaceFitness:typeof import("./fitness").workspaceFitness;
  WorkspacePersonalInfo:typeof import("./personal-info").workspacePersonalInfo;
  WorkspaceWordPractice:typeof import("./word-practice").workspaceWordPractice;
 }
}
