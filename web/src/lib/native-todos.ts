export type NativeTodoPhase = {
  name: string;
  tasks: { content: string; status: string }[];
};
const statuses = ["pending", "in_progress", "completed", "abandoned"];
export function validateTodoPhases(input: unknown): NativeTodoPhase[] {
  if (!Array.isArray(input) || input.length > 100)
    throw new Error("Import a task plan with at most 100 phases.");
  return input.map((phase) => {
    if (
      !phase ||
      typeof phase.name !== "string" ||
      !Array.isArray(phase.tasks) ||
      phase.tasks.length > 1000
    )
      throw new Error("Every phase needs a name and task list.");
    return {
      name: phase.name,
      tasks: phase.tasks.map((task: any) => {
        if (
          !task ||
          typeof task.content !== "string" ||
          !task.content.trim() ||
          !statuses.includes(task.status)
        )
          throw new Error("Every task needs text and a native task status.");
        return { content: task.content, status: task.status };
      }),
    };
  });
}
