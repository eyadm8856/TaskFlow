/**
 * TaskFlow Users Service
 * Uses localStore (localStorage) for team member lookups and profile sync.
 */

import { localStore } from '@/lib/storage';

export const usersService = {
  async createUserProfile(uid, { email, displayName, role }) {
    return localStore.addMember({ uid, email, displayName, role });
  },

  async getUserProfile(uid) {
    return localStore.getMemberById(uid);
  },

  async getAllMembers() {
    return localStore.getMembers();
  },

  async findUserByEmail(email) {
    return localStore.getMemberByEmail(email);
  },

  async getUsersByIds(uids) {
    if (!uids || uids.length === 0) return [];
    const members = localStore.getMembers();
    return members.filter((m) => uids.includes(m.uid) || uids.includes(m.id));
  },
};

export default usersService;
