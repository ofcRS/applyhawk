/**
 * HH.ru Platform Handlers
 * Handles all HH.ru-specific message types
 */

import { registerPlatformHandlers } from "../../../core/background/message-router.js";
import {
  applyToVacancy,
  checkHHAuth,
  createCompleteResume,
  createResume,
  deleteResume,
  getUserResumes,
  updateResumeCommon,
  updateResumeEducation,
  updateResumeExperience,
  updateResumeSkills,
} from "../api/hh-internal-api.js";

/**
 * HH.ru specific message handlers
 */
const hhHandlers = {
  // Authentication
  CHECK_HH_AUTH: async () => await checkHHAuth(),

  // Resume management
  GET_USER_RESUMES: async () => await getUserResumes(),

  CREATE_RESUME: async (message) =>
    await createResume(message.title, message.professionalRoleId),

  DELETE_RESUME: async (message) => await deleteResume(message.resumeHash),

  UPDATE_RESUME_EXPERIENCE: async (message) =>
    await updateResumeExperience(message.resumeHash, message.experience),

  UPDATE_RESUME_SKILLS: async (message) =>
    await updateResumeSkills(message.resumeHash, message.keySkills),

  UPDATE_RESUME_COMMON: async (message) =>
    await updateResumeCommon(message.resumeHash, message.personalInfo),

  UPDATE_RESUME_EDUCATION: async (message) =>
    await updateResumeEducation(message.resumeHash, message.education),

  CREATE_COMPLETE_RESUME: async (message) =>
    await createCompleteResume(
      message.baseResume,
      message.personalizedData,
      message.title,
    ),

  // Application
  APPLY_INTERNAL: async (message) =>
    await applyToVacancy(
      message.vacancyId,
      message.resumeHash,
      message.coverLetter,
    ),
};

/**
 * Register HH.ru handlers with the message router
 */
export function registerHHHandlers() {
  registerPlatformHandlers("hh", hhHandlers);
  console.log("[HH Platform] Handlers registered");
}
