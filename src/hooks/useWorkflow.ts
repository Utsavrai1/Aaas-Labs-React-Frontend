import { BACKEND_URL } from "@/lib/constant";
import { Workflow } from "@/types/workflow";

const API_URL = `${BACKEND_URL}/api/workflows`;

export const workflowApi = {
  getAllWorkflows: async (): Promise<Workflow[]> => {
    try {
      const response = await fetch(API_URL);
      if (!response.ok) throw new Error("Failed to fetch workflows");
      return await response.json();
    } catch (error) {
      console.error("Error fetching workflows:", error);
      throw error;
    }
  },

  getWorkflowById: async (id: string): Promise<Workflow> => {
    try {
      const response = await fetch(`${API_URL}/${id}`);
      if (!response.ok) throw new Error("Failed to fetch workflow");
      return await response.json();
    } catch (error) {
      console.error(`Error fetching workflow ${id}:`, error);
      throw error;
    }
  },

  createWorkflow: async (workflow: Workflow): Promise<Workflow> => {
    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(workflow),
      });
      if (!response.ok) throw new Error("Failed to create workflow");
      return await response.json();
    } catch (error) {
      console.error("Error creating workflow:", error);
      throw error;
    }
  },

  updateWorkflow: async (workflow: Workflow): Promise<Workflow> => {
    try {
      const response = await fetch(`${API_URL}/${workflow.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(workflow),
      });
      if (!response.ok) throw new Error("Failed to update workflow");
      return await response.json();
    } catch (error) {
      console.error(`Error updating workflow ${workflow.id}:`, error);
      throw error;
    }
  },

  deleteWorkflow: async (id: string): Promise<void> => {
    try {
      const response = await fetch(`${API_URL}/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete workflow");
    } catch (error) {
      console.error(`Error deleting workflow ${id}:`, error);
      throw error;
    }
  },
};
