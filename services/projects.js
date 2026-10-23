/**
 * TaskFlow Projects Service
 * Uses localStore (localStorage) as the authoritative store with zero Firestore permission warnings.
 */

import { localStore } from '@/lib/storage';

export const projectsService = {
  async getProjectsForUser(userId) {
    return localStore.getProjects(userId);
  },

  async getProjectById(projectId) {
    return localStore.getProjectById(projectId);
  },

  async createProject(projectData, ownerId) {
    return localStore.addProject(projectData, ownerId);
  },

  async updateProject(projectId, updateData) {
    return localStore.updateProject(projectId, updateData);
  },

  async deleteProject(projectId) {
    localStore.deleteProject(projectId);
  },

  async addMember(projectId, memberId) {
    const proj = localStore.getProjectById(projectId);
    if (proj) {
      const current = proj.memberIds || [];
      if (!current.includes(memberId)) {
        localStore.updateProject(projectId, { memberIds: [...current, memberId] });
      }
    }
  },

  async removeMember(projectId, memberId) {
    const proj = localStore.getProjectById(projectId);
    if (proj && proj.memberIds) {
      localStore.updateProject(projectId, {
        memberIds: proj.memberIds.filter((id) => id !== memberId),
      });
    }
  },
};

export default projectsService;
