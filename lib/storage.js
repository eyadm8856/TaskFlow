/**
 * TaskFlow Local Storage Helper
 * Provides 100% reliable client-side persistence for projects, tasks, team accounts, and preferences.
 */

const STORAGE_KEYS = {
  VERSION: 'taskflow_storage_version',
  PROJECTS: 'taskflow_projects',
  TASKS_PREFIX: 'taskflow_tasks_',
  USER: 'taskflow_current_user',
  THEME: 'taskflow_theme',
  MEMBERS: 'taskflow_team_members',
  ACTIVITIES: 'taskflow_activities',
};

const CURRENT_STORAGE_VERSION = 'v7_owner_account_enabled';

// 7 accounts: Project Owner + Team Leader (Maya Kassem) + 5 Team Members
export const DEFAULT_MEMBERS = [
  {
    id: 'user-owner',
    uid: 'user-owner',
    email: 'owner@example.test',
    displayName: 'Project Owner (TAQAT)',
    role: 'Project Owner',
    isLeader: true,
    initials: 'PO',
    color: '#0EA5E9',
    password: 'password123',
  },
  {
    id: 'user-maya-kassem',
    uid: 'user-maya-kassem',
    email: 'maya.kassem@example.test',
    displayName: 'Maya Kassem',
    role: 'Team Leader',
    isLeader: true,
    initials: 'MK',
    color: '#3B82F6',
    password: 'password123',
  },
  {
    id: 'user-lina-haddad',
    uid: 'user-lina-haddad',
    email: 'lina.haddad@example.test',
    displayName: 'Lina Haddad',
    role: 'Compliance Specialist',
    isLeader: false,
    initials: 'LH',
    color: '#10B981',
    password: 'password123',
  },
  {
    id: 'user-alex-johnson',
    uid: 'user-alex-johnson',
    email: 'alex.johnson@example.test',
    displayName: 'Alex Johnson',
    role: 'Senior Fullstack Engineer',
    isLeader: false,
    initials: 'AJ',
    color: '#8B5CF6',
    password: 'password123',
  },
  {
    id: 'user-sara-smith',
    uid: 'user-sara-smith',
    email: 'sara.smith@example.test',
    displayName: 'Sara Smith',
    role: 'UI/UX Product Designer',
    isLeader: false,
    initials: 'SS',
    color: '#EC4899',
    password: 'password123',
  },
  {
    id: 'user-youssef-karim',
    uid: 'user-youssef-karim',
    email: 'youssef.karim@example.test',
    displayName: 'Youssef Karim',
    role: 'Security & QA Engineer',
    isLeader: false,
    initials: 'YK',
    color: '#F59E0B',
    password: 'password123',
  },
  {
    id: 'user-tariq-nabil',
    uid: 'user-tariq-nabil',
    email: 'tariq.nabil@example.test',
    displayName: 'Tariq Nabil',
    role: 'DevOps & Cloud Architect',
    isLeader: false,
    initials: 'TN',
    color: '#6366F1',
    password: 'password123',
  },
];

const ALL_MEMBER_IDS = DEFAULT_MEMBERS.map((m) => m.uid);

/**
 * Helper to check if a user is the Project Owner or Team Leader (Maya Kassem).
 * Project Owner and Team Leader can view all team tasks; other members only see their own assigned tasks.
 */
export function isTeamLeader(user) {
  if (!user) return false;
  if (user.isLeader === true) return true;
  if (
    user.uid === 'user-owner' ||
    user.id === 'user-owner' ||
    user.uid === 'user-maya-kassem' ||
    user.id === 'user-maya-kassem'
  ) {
    return true;
  }
  const email = (user.email || '').toLowerCase();
  if (
    email === 'owner@example.test' ||
    email === 'maya.kassem@example.test' ||
    email === 'mohadwan937@gmail.com'
  ) {
    return true;
  }
  return false;
}

/**
 * Filters a list of tasks based on the logged-in user's role:
 * - Team Leader (Maya Kassem) sees ALL tasks across all members.
 * - Regular Team Members ONLY see tasks assigned specifically to them.
 */
export function filterTasksForUser(tasks, user) {
  if (!user || !Array.isArray(tasks)) return [];
  if (isTeamLeader(user)) {
    return tasks;
  }
  const userUid = user.uid || user.id;
  const userEmail = (user.email || '').toLowerCase();
  const userName = (user.displayName || '').toLowerCase();

  return tasks.filter((t) => {
    if (userUid && t.assigneeId === userUid) return true;
    if (userEmail && t.assigneeEmail && t.assigneeEmail.toLowerCase() === userEmail) return true;
    if (userName && t.assigneeName && t.assigneeName.toLowerCase() === userName) return true;
    return false;
  });
}

// Default seed projects
const DEFAULT_PROJECTS = [
  {
    id: 'proj-executive-board',
    name: 'Executive Board Audit',
    description: 'Enterprise security compliance, regulatory governance, and quarterly executive sign-off.',
    ownerId: 'user-maya-kassem',
    leadName: 'Maya Kassem',
    memberIds: ALL_MEMBER_IDS,
    createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'proj-website-redesign',
    name: 'Website Redesign',
    description: 'Corporate brand overhaul, responsive client dashboard, and modern design system.',
    ownerId: 'user-maya-kassem',
    leadName: 'Maya Kassem',
    memberIds: ALL_MEMBER_IDS,
    createdAt: new Date(Date.now() - 14 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'proj-mobile-app',
    name: 'Mobile App Launch',
    description: 'Cross-platform mobile application build, authentication, push notifications, and release.',
    ownerId: 'user-maya-kassem',
    leadName: 'Maya Kassem',
    memberIds: ALL_MEMBER_IDS,
    createdAt: new Date(Date.now() - 21 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const yesterdayStr = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

// 18 distinct tasks: 3 dedicated tasks per team member (1 in_progress, 1 todo, 1 done)
const DEFAULT_TASKS = {
  'proj-executive-board': [
    // Maya Kassem (Team Leader)
    {
      id: 'task-tf-01',
      code: 'TF-01',
      title: 'Quarterly Executive Roadmap & OKR Alignment',
      description: 'Coordinate Q4 deliverables across engineering, design, compliance, and security teams.',
      status: 'in_progress',
      priority: 'high',
      dueDate: '2026-10-26',
      assigneeName: 'Maya Kassem',
      assigneeEmail: 'maya.kassem@example.test',
      assigneeId: 'user-maya-kassem',
      createdBy: 'user-maya-kassem',
    },
    {
      id: 'task-tf-03',
      code: 'TF-03',
      title: 'Board Resolution & Stakeholder Sign-off',
      description: 'Assemble executive summaries and legal sign-off package for the board.',
      status: 'done',
      priority: 'high',
      dueDate: '2026-10-20',
      assigneeName: 'Maya Kassem',
      assigneeEmail: 'maya.kassem@example.test',
      assigneeId: 'user-maya-kassem',
      createdBy: 'user-maya-kassem',
    },
    // Lina Haddad (Compliance Specialist)
    {
      id: 'task-tf-04',
      code: 'TF-04',
      title: 'Data Privacy Impact Analysis (GDPR & ISO 27001)',
      description: 'Assess customer data storage, encryption at rest, and compliance audit logs.',
      status: 'in_progress',
      priority: 'high',
      dueDate: '2026-10-27',
      assigneeName: 'Lina Haddad',
      assigneeEmail: 'lina.haddad@example.test',
      assigneeId: 'user-lina-haddad',
      createdBy: 'user-maya-kassem',
    },
    {
      id: 'task-tf-05',
      code: 'TF-05',
      title: 'Audit Third-Party Vendor Compliance Contracts',
      description: 'Verify SLA agreements and data processing addendums for external cloud vendors.',
      status: 'todo',
      priority: 'medium',
      dueDate: '2026-10-30',
      assigneeName: 'Lina Haddad',
      assigneeEmail: 'lina.haddad@example.test',
      assigneeId: 'user-lina-haddad',
      createdBy: 'user-maya-kassem',
    },
    // Youssef Karim (Security & QA Engineer)
    {
      id: 'task-tf-13',
      code: 'TF-13',
      title: 'External API Penetration & OWASP Security Audit',
      description: 'Audit API endpoints, cloud configurations, and role-based permissions.',
      status: 'in_progress',
      priority: 'high',
      dueDate: '2026-10-28',
      assigneeName: 'Youssef Karim',
      assigneeEmail: 'youssef.karim@example.test',
      assigneeId: 'user-youssef-karim',
      createdBy: 'user-maya-kassem',
    },
  ],
  'proj-website-redesign': [
    // Maya Kassem (Team Leader)
    {
      id: 'task-tf-02',
      code: 'TF-02',
      title: 'Approve Q4 Architecture & Resource Budget',
      description: 'Review frontend redesign milestones and allocate sprint capacity.',
      status: 'todo',
      priority: 'high',
      dueDate: '2026-10-29',
      assigneeName: 'Maya Kassem',
      assigneeEmail: 'maya.kassem@example.test',
      assigneeId: 'user-maya-kassem',
      createdBy: 'user-maya-kassem',
    },
    // Lina Haddad (Compliance Specialist)
    {
      id: 'task-tf-06',
      code: 'TF-06',
      title: 'Finalize Accessibility (WCAG 2.1 AA) Policy',
      description: 'Ensure all redesigned web pages meet contrast and keyboard navigation standards.',
      status: 'done',
      priority: 'medium',
      dueDate: '2026-10-21',
      assigneeName: 'Lina Haddad',
      assigneeEmail: 'lina.haddad@example.test',
      assigneeId: 'user-lina-haddad',
      createdBy: 'user-maya-kassem',
    },
    // Alex Johnson (Senior Fullstack Engineer)
    {
      id: 'task-tf-07',
      code: 'TF-07',
      title: 'Implement Role-Based Access & Auth Middleware',
      description: 'Enforce strict role separation so team members only view their assigned tasks.',
      status: 'in_progress',
      priority: 'high',
      dueDate: '2026-10-26',
      assigneeName: 'Alex Johnson',
      assigneeEmail: 'alex.johnson@example.test',
      assigneeId: 'user-alex-johnson',
      createdBy: 'user-maya-kassem',
    },
    {
      id: 'task-tf-08',
      code: 'TF-08',
      title: 'Build Interactive Monthly Calendar & Date Grid',
      description: 'Verify 7-column monthly grid, day selection, task chips, and status filters.',
      status: 'todo',
      priority: 'medium',
      dueDate: '2026-10-29',
      assigneeName: 'Alex Johnson',
      assigneeEmail: 'alex.johnson@example.test',
      assigneeId: 'user-alex-johnson',
      createdBy: 'user-maya-kassem',
    },
    {
      id: 'task-tf-09',
      code: 'TF-09',
      title: 'Develop Responsive Navigation Drawer Component',
      description: 'Implement header with hamburger drawer, accessible keyboard navigation, and theme toggle.',
      status: 'done',
      priority: 'high',
      dueDate: '2026-10-21',
      assigneeName: 'Alex Johnson',
      assigneeEmail: 'alex.johnson@example.test',
      assigneeId: 'user-alex-johnson',
      createdBy: 'user-maya-kassem',
    },
    // Sara Smith (UI/UX Product Designer)
    {
      id: 'task-tf-12',
      code: 'TF-12',
      title: 'Create Navy & Baby Blue Dark Mode Token System',
      description: 'Refined scheme with Off-White typography, Navy Blue canvas, and Baby Blue accents.',
      status: 'done',
      priority: 'high',
      dueDate: '2026-10-20',
      assigneeName: 'Sara Smith',
      assigneeEmail: 'sara.smith@example.test',
      assigneeId: 'user-sara-smith',
      createdBy: 'user-maya-kassem',
    },
    // Youssef Karim (Security & QA Engineer)
    {
      id: 'task-tf-15',
      code: 'TF-15',
      title: 'Fix Session Token Expiration Security Bug',
      description: 'Verify token sanitization and local session storage consistency across reloads.',
      status: 'done',
      priority: 'high',
      dueDate: '2026-10-21',
      assigneeName: 'Youssef Karim',
      assigneeEmail: 'youssef.karim@example.test',
      assigneeId: 'user-youssef-karim',
      createdBy: 'user-maya-kassem',
    },
    // Tariq Nabil (DevOps & Cloud Architect)
    {
      id: 'task-tf-18',
      code: 'TF-18',
      title: 'Optimize CDN Caching & Edge API Latency',
      description: 'Minimize bundle payload size and configure HTTP/2 edge caching rules.',
      status: 'done',
      priority: 'low',
      dueDate: '2026-10-20',
      assigneeName: 'Tariq Nabil',
      assigneeEmail: 'tariq.nabil@example.test',
      assigneeId: 'user-tariq-nabil',
      createdBy: 'user-maya-kassem',
    },
  ],
  'proj-mobile-app': [
    // Sara Smith (UI/UX Product Designer)
    {
      id: 'task-tf-10',
      code: 'TF-10',
      title: 'Design App Store Screenshots & Promo Assets',
      description: 'Produce high-res assets adhering to Off-White, Baby Blue, and Navy Blue palette.',
      status: 'in_progress',
      priority: 'medium',
      dueDate: '2026-10-28',
      assigneeName: 'Sara Smith',
      assigneeEmail: 'sara.smith@example.test',
      assigneeId: 'user-sara-smith',
      createdBy: 'user-maya-kassem',
    },
    {
      id: 'task-tf-11',
      code: 'TF-11',
      title: 'Conduct User Usability Testing on Mobile Prototype',
      description: 'Run interactive Figma prototype sessions with 8 beta testers and synthesize feedback.',
      status: 'todo',
      priority: 'high',
      dueDate: '2026-10-31',
      assigneeName: 'Sara Smith',
      assigneeEmail: 'sara.smith@example.test',
      assigneeId: 'user-sara-smith',
      createdBy: 'user-maya-kassem',
    },
    // Youssef Karim (Security & QA Engineer)
    {
      id: 'task-tf-14',
      code: 'TF-14',
      title: 'End-to-End Regression Testing on iOS & Android',
      description: 'High-priority QA verification of biometric login and offline task sync.',
      status: 'todo',
      priority: 'high',
      dueDate: yesterdayStr,
      assigneeName: 'Youssef Karim',
      assigneeEmail: 'youssef.karim@example.test',
      assigneeId: 'user-youssef-karim',
      createdBy: 'user-maya-kassem',
    },
    // Tariq Nabil (DevOps & Cloud Architect)
    {
      id: 'task-tf-16',
      code: 'TF-16',
      title: 'Configure Cloud Push Notification Workers',
      description: 'Set up background notification queues for instant task assignment alerts.',
      status: 'in_progress',
      priority: 'high',
      dueDate: '2026-10-27',
      assigneeName: 'Tariq Nabil',
      assigneeEmail: 'tariq.nabil@example.test',
      assigneeId: 'user-tariq-nabil',
      createdBy: 'user-maya-kassem',
    },
    {
      id: 'task-tf-17',
      code: 'TF-17',
      title: 'Automate Zero-Downtime CI/CD Deployment Pipeline',
      description: 'Create automated build, lint, and release workflows for mobile staging.',
      status: 'todo',
      priority: 'medium',
      dueDate: '2026-11-02',
      assigneeName: 'Tariq Nabil',
      assigneeEmail: 'tariq.nabil@example.test',
      assigneeId: 'user-tariq-nabil',
      createdBy: 'user-maya-kassem',
    },
  ],
};

const DEFAULT_ACTIVITIES = [
  {
    id: 'act-1',
    type: 'task_created',
    badgeText: 'Task Assigned',
    userName: 'Maya Kassem',
    userInitials: 'MK',
    projectName: 'Executive Board Audit',
    timeAgo: '1h ago',
    detail: 'Assigned "Data Privacy Impact Analysis" to Lina Haddad',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'act-2',
    type: 'status_updated',
    badgeText: 'Status Updated',
    userName: 'Alex Johnson',
    userInitials: 'AJ',
    projectName: 'Website Redesign',
    timeAgo: '2h ago',
    detail: 'Started working on "Implement Role-Based Access & Auth Middleware"',
    timestamp: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: 'act-3',
    type: 'task_completed',
    badgeText: 'Task Completed',
    userName: 'Sara Smith',
    userInitials: 'SS',
    projectName: 'Website Redesign',
    timeAgo: '4h ago',
    detail: 'Completed task "Create Navy & Baby Blue Dark Mode Token System"',
    timestamp: new Date(Date.now() - 14400000).toISOString(),
  },
  {
    id: 'act-4',
    type: 'member_joined',
    badgeText: 'Security Audit',
    userName: 'Youssef Karim',
    userInitials: 'YK',
    projectName: 'Executive Board Audit',
    timeAgo: '6h ago',
    detail: 'Initiated "External API Penetration & OWASP Security Audit"',
    timestamp: new Date(Date.now() - 21600000).toISOString(),
  },
];

function safeGet(key, fallback = null) {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}

function safeSet(key, value) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {}
}

/**
 * Normalizes any legacy or cached user object so 'Lina Mansour' and 'Omar Al-Sayed'
 * are permanently replaced with 'Maya Kassem' and 'Youssef Karim'.
 */
export function normalizeUserObject(rawUser) {
  if (!rawUser) return null;
  const uid = rawUser.uid || rawUser.id || '';
  const email = (rawUser.email || '').toLowerCase().trim();
  const name = (rawUser.displayName || '').toLowerCase().trim();

  // Map Project Owner references -> user-owner (owner@example.test)
  if (
    uid === 'owner' ||
    uid === 'user-owner' ||
    email === 'owner@example.test' ||
    email === 'mohadwan937@gmail.com'
  ) {
    const ownerAccount = DEFAULT_MEMBERS.find((m) => m.uid === 'user-owner') || DEFAULT_MEMBERS[0];
    return { ...ownerAccount };
  }

  // Map legacy Lina Mansour references -> Maya Kassem
  if (
    uid === 'user-lina-mansour' ||
    email.includes('lina.mansour') ||
    name.includes('lina mansour')
  ) {
    const maya = DEFAULT_MEMBERS.find((m) => m.uid === 'user-maya-kassem') || DEFAULT_MEMBERS[1];
    return { ...maya };
  }

  // Map legacy Omar Al-Sayed references -> Youssef Karim
  if (
    uid === 'user-omar-sayed' ||
    email.includes('omar.sayed') ||
    name.includes('omar al-sayed') ||
    name.includes('omar sayed')
  ) {
    const youssef = DEFAULT_MEMBERS.find((m) => m.uid === 'user-youssef-karim') || DEFAULT_MEMBERS[5];
    return { ...youssef };
  }

  // Match against any of our 7 canonical team members by uid, email, or displayName
  const matched = DEFAULT_MEMBERS.find(
    (m) =>
      m.uid === uid ||
      m.email.toLowerCase() === email ||
      m.displayName.toLowerCase() === name
  );
  if (matched) {
    return { ...matched };
  }

  return {
    ...rawUser,
    id: rawUser.uid || rawUser.id || 'user-custom',
    uid: rawUser.uid || rawUser.id || 'user-custom',
    isLeader: Boolean(rawUser.isLeader),
  };
}

export const localStore = {
  checkVersion() {
    if (typeof window === 'undefined') return;
    try {
      const currentVer = localStorage.getItem(STORAGE_KEYS.VERSION);
      if (currentVer !== CURRENT_STORAGE_VERSION) {
        // Preserve any custom-registered accounts before updating default members
        const prevMembers = safeGet(STORAGE_KEYS.MEMBERS, []);
        const customMembers = Array.isArray(prevMembers)
          ? prevMembers.filter(
              (pm) =>
                pm &&
                pm.email &&
                !DEFAULT_MEMBERS.some((dm) => dm.email.toLowerCase() === pm.email.toLowerCase()) &&
                !pm.email.toLowerCase().includes('lina.mansour') &&
                !pm.email.toLowerCase().includes('omar.sayed')
            )
          : [];

        localStorage.setItem(STORAGE_KEYS.VERSION, CURRENT_STORAGE_VERSION);
        safeSet(STORAGE_KEYS.MEMBERS, [...DEFAULT_MEMBERS, ...customMembers]);
        safeSet(STORAGE_KEYS.PROJECTS, DEFAULT_PROJECTS);
        safeSet(STORAGE_KEYS.ACTIVITIES, DEFAULT_ACTIVITIES);

        // Remove all old task keys (including any stale Firestore project task keys)
        Object.keys(localStorage).forEach((k) => {
          if (k.startsWith(STORAGE_KEYS.TASKS_PREFIX)) {
            localStorage.removeItem(k);
          }
        });

        // Seed fresh tasks for each default project
        Object.entries(DEFAULT_TASKS).forEach(([projId, taskList]) => {
          safeSet(`${STORAGE_KEYS.TASKS_PREFIX}${projId}`, taskList);
        });

        // Normalize cached current user if present
        const cachedUser = safeGet(STORAGE_KEYS.USER);
        if (cachedUser) {
          const normalized = normalizeUserObject(cachedUser);
          safeSet(STORAGE_KEYS.USER, normalized);
        }
      }
    } catch (e) {}
  },

  // Current User Session
  getCurrentUser() {
    this.checkVersion();
    const raw = safeGet(STORAGE_KEYS.USER);
    if (!raw) return null;
    const normalized = normalizeUserObject(raw);
    if (
      normalized &&
      (normalized.uid !== raw.uid ||
        normalized.email !== raw.email ||
        normalized.displayName !== raw.displayName)
    ) {
      safeSet(STORAGE_KEYS.USER, normalized);
    }
    return normalized;
  },

  setCurrentUser(userObj) {
    this.checkVersion();
    if (!userObj) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(STORAGE_KEYS.USER);
      }
      return null;
    }
    const normalized = normalizeUserObject(userObj);
    safeSet(STORAGE_KEYS.USER, normalized);
    return normalized;
  },

  // Members
  getMembers() {
    this.checkVersion();
    let members = safeGet(STORAGE_KEYS.MEMBERS);
    if (!members || !Array.isArray(members) || members.length === 0) {
      members = DEFAULT_MEMBERS;
      safeSet(STORAGE_KEYS.MEMBERS, members);
    }
    // Ensure all DEFAULT_MEMBERS are present (including user-owner)
    const normalizedList = members.map((m) => normalizeUserObject(m));
    DEFAULT_MEMBERS.forEach((dm) => {
      if (!normalizedList.some((m) => m.uid === dm.uid || m.email.toLowerCase() === dm.email.toLowerCase())) {
        normalizedList.unshift(dm);
      }
    });
    return normalizedList;
  },

  addMember(memberData) {
    const list = this.getMembers();
    const uid = memberData.uid || memberData.id || `user-${Date.now()}`;
    const newMember = {
      id: uid,
      uid,
      email: (memberData.email || '').trim().toLowerCase(),
      displayName: (memberData.displayName || 'Team Member').trim(),
      role: memberData.role || 'Team Member',
      isLeader: Boolean(memberData.isLeader),
      initials: (memberData.displayName || 'TM')
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase(),
      color: memberData.color || '#3B82F6',
      password: memberData.password || 'password123',
    };
    const existingIdx = list.findIndex(
      (m) => m.uid === uid || m.email.toLowerCase() === newMember.email
    );
    if (existingIdx >= 0) {
      list[existingIdx] = { ...list[existingIdx], ...newMember };
    } else {
      list.push(newMember);
    }
    safeSet(STORAGE_KEYS.MEMBERS, list);
    return newMember;
  },

  getMemberByEmail(email) {
    if (!email) return null;
    const normalizedEmail = email.trim().toLowerCase();
    if (normalizedEmail === 'owner@example.test' || normalizedEmail === 'mohadwan937@gmail.com') {
      return DEFAULT_MEMBERS.find((m) => m.uid === 'user-owner') || DEFAULT_MEMBERS[0];
    }
    if (normalizedEmail === 'lina.mansour@example.test') {
      return DEFAULT_MEMBERS.find((m) => m.uid === 'user-maya-kassem') || DEFAULT_MEMBERS[1];
    }
    if (normalizedEmail === 'omar.sayed@example.test') {
      return DEFAULT_MEMBERS.find((m) => m.uid === 'user-youssef-karim') || DEFAULT_MEMBERS[5];
    }
    const members = this.getMembers();
    return members.find((m) => m.email.toLowerCase() === normalizedEmail) || null;
  },

  getMemberById(uid) {
    if (!uid) return null;
    if (uid === 'owner' || uid === 'user-owner') {
      return DEFAULT_MEMBERS.find((m) => m.uid === 'user-owner') || DEFAULT_MEMBERS[0];
    }
    if (uid === 'user-lina-mansour') {
      return DEFAULT_MEMBERS.find((m) => m.uid === 'user-maya-kassem') || DEFAULT_MEMBERS[1];
    }
    if (uid === 'user-omar-sayed') {
      return DEFAULT_MEMBERS.find((m) => m.uid === 'user-youssef-karim') || DEFAULT_MEMBERS[5];
    }
    const members = this.getMembers();
    return members.find((m) => m.uid === uid || m.id === uid) || null;
  },

  // Projects
  getProjects() {
    this.checkVersion();
    let list = safeGet(STORAGE_KEYS.PROJECTS);
    if (!list || !Array.isArray(list) || list.length === 0) {
      list = DEFAULT_PROJECTS;
      safeSet(STORAGE_KEYS.PROJECTS, list);
    }
    return list;
  },

  saveProjects(projects) {
    safeSet(STORAGE_KEYS.PROJECTS, projects);
  },

  addProject(projectData, ownerId) {
    const list = this.getProjects();
    const members = this.getMembers();
    const ownerMember = members.find((m) => m.uid === ownerId) || DEFAULT_MEMBERS[0];
    const allIds = members.map((m) => m.uid);

    const newProject = {
      id: projectData.id || `proj-${Date.now()}`,
      name: projectData.name,
      description: projectData.description || '',
      ownerId: ownerMember.uid,
      leadName: projectData.leadName || ownerMember.displayName || 'Maya Kassem',
      memberIds: allIds,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    list.unshift(newProject);
    this.saveProjects(list);
    return newProject;
  },

  updateProject(projectId, updateData) {
    const list = this.getProjects();
    const updated = list.map((p) =>
      p.id === projectId ? { ...p, ...updateData, updatedAt: new Date().toISOString() } : p
    );
    this.saveProjects(updated);
    return updated.find((p) => p.id === projectId);
  },

  deleteProject(projectId) {
    const list = this.getProjects();
    const filtered = list.filter((p) => p.id !== projectId);
    this.saveProjects(filtered);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(`${STORAGE_KEYS.TASKS_PREFIX}${projectId}`);
    }
  },

  getProjectById(projectId) {
    const list = this.getProjects();
    return list.find((p) => p.id === projectId) || null;
  },

  // Tasks
  getTasks(projectId) {
    this.checkVersion();
    const key = `${STORAGE_KEYS.TASKS_PREFIX}${projectId}`;
    let tasks = safeGet(key);
    if (!tasks || !Array.isArray(tasks)) {
      tasks = DEFAULT_TASKS[projectId] || [];
      safeSet(key, tasks);
    }
    return tasks;
  },

  getAllTasks() {
    this.checkVersion();
    const projects = this.getProjects();
    const all = [];
    projects.forEach((p) => {
      const pTasks = this.getTasks(p.id);
      pTasks.forEach((t) => {
        all.push({
          ...t,
          projectId: p.id,
          projectName: p.name,
        });
      });
    });
    return all;
  },

  saveTasks(projectId, tasks) {
    safeSet(`${STORAGE_KEYS.TASKS_PREFIX}${projectId}`, tasks);
  },

  addTask(projectId, taskData, userId) {
    const tasks = this.getTasks(projectId);
    const all = this.getAllTasks();
    const nextNum = all.length + 1;
    const targetAssigneeId = taskData.assigneeId || userId || 'user-maya-kassem';
    const memberObj = this.getMemberById(targetAssigneeId) || DEFAULT_MEMBERS[0];

    let formattedDue = null;
    if (taskData.dueDate) {
      if (typeof taskData.dueDate === 'string') {
        formattedDue = taskData.dueDate.slice(0, 10);
      } else if (taskData.dueDate instanceof Date && !isNaN(taskData.dueDate.getTime())) {
        formattedDue = taskData.dueDate.toISOString().slice(0, 10);
      }
    }

    const newTask = {
      id: taskData.id || `task-${Date.now()}`,
      code: taskData.code || `TF-${String(nextNum).padStart(2, '0')}`,
      title: taskData.title,
      description: taskData.description || '',
      status: taskData.status || 'todo',
      priority: taskData.priority || 'medium',
      dueDate: formattedDue,
      assigneeName: taskData.assigneeName || memberObj.displayName,
      assigneeEmail: taskData.assigneeEmail || memberObj.email,
      assigneeId: memberObj.uid,
      createdBy: userId || 'user-maya-kassem',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    tasks.unshift(newTask);
    this.saveTasks(projectId, tasks);
    return newTask;
  },

  updateTask(projectId, taskId, updateData) {
    const tasks = this.getTasks(projectId);
    const extra = { ...updateData };
    if (extra.assigneeId) {
      const memberObj = this.getMemberById(extra.assigneeId);
      if (memberObj) {
        extra.assigneeName = memberObj.displayName;
        extra.assigneeEmail = memberObj.email;
      }
    }
    if (extra.dueDate && extra.dueDate instanceof Date && !isNaN(extra.dueDate.getTime())) {
      extra.dueDate = extra.dueDate.toISOString().slice(0, 10);
    }
    const updated = tasks.map((t) =>
      t.id === taskId ? { ...t, ...extra, updatedAt: new Date().toISOString() } : t
    );
    this.saveTasks(projectId, updated);
    return updated.find((t) => t.id === taskId);
  },

  deleteTask(projectId, taskId) {
    const tasks = this.getTasks(projectId);
    const filtered = tasks.filter((t) => t.id !== taskId);
    this.saveTasks(projectId, filtered);
  },

  // Activities tracking
  getActivities() {
    this.checkVersion();
    let list = safeGet(STORAGE_KEYS.ACTIVITIES);
    if (!list || !Array.isArray(list) || list.length === 0) {
      list = DEFAULT_ACTIVITIES;
      safeSet(STORAGE_KEYS.ACTIVITIES, list);
    }
    return list;
  },

  addActivity(activity) {
    const list = this.getActivities();
    list.unshift({
      id: `act-${Date.now()}`,
      timestamp: new Date().toISOString(),
      timeAgo: 'Just now',
      ...activity,
    });
    safeSet(STORAGE_KEYS.ACTIVITIES, list.slice(0, 25));
  },
};

export default localStore;
