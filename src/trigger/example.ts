import { task } from "@trigger.dev/sdk";

/** Tarefa de exemplo do Trigger.dev - sera substituida por tarefas reais */
export const exampleTask = task({
  id: "example-task",
  run: async () => {
    return { message: "Trigger.dev configurado com sucesso" };
  },
});
