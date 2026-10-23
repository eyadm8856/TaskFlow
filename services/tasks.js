/**
 * TaskFlow Tasks Service
 * Uses localStore (localStorage) as the authoritative store with zero Firestore permission warnings.
 */

import { localStore } from '@/lib/storage';

/**
 * Universal helper for overdue check:
 * Overdue = dueDate < today (app timezone) AND status != 'done'.
 */
export function isOverdue(task) {
  if (!task || !task.dueDate || task.status === 'done') {
    return false;
  }

  let due;
  if (typeof task.dueDate === 'object' && task.dueDate !== null) {
    if (typeof task.dueDate.toDate === 'function') {
      due = task.dueDate.toDate();
    } else if (typeof task.dueDate.seconds === 'number') {
      due = new Date(task.dueDate.seconds * 1000);
    } else {
      return false;
    }
  } else {
    due = new Date(task.dueDate);
  }

  if (isNaN(due.getTime())) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due.getTime() < today.getTime();
}

export const tasksService = {
  async getTasksForProject(projectId) {
    return localStore.getTasks(projectId);
  },

  async createTask(projectId, taskData, userId) {
    return localStore.addTask(projectId, taskData, userId);
  },

  async updateTask(projectId, taskId, updateData) {
    return localStore.updateTask(projectId, taskId, updateData);
  },

  async deleteTask(projectId, taskId) {
    localStore.deleteTask(projectId, taskId);
  },
};

export default tasksService;
