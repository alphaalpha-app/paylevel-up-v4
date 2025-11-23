import { WorkLog, UserSettings } from "../types";

// AI features have been disabled.
export const generateWorkAnalysis = async (logs: WorkLog[], settings: UserSettings): Promise<string> => {
  return "AI 功能已停用。";
};