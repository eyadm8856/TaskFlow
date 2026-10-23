# TaskFlow

A responsive project and task management web application engineered for small software teams. Built with Next.js (App Router), React, Plain CSS / CSS Modules, Firebase Authentication, and Cloud Firestore.

---

## 1. Executive Summary
TaskFlow satisfies 100% of the **Software Requirements Specification (SRS) - Version 1.0 (15 October 2026)** prepared for the 7-Day Full-Stack Development Challenge (TAQAT / CodeMap trainees). It provides end-to-end multi-user project and task tracking, role-based authorization (RBAC) enforced through Firestore Security Rules, personal metrics, discovery filters, and responsive design.

---

## 2. Implemented Features & SRS Compliance

### Functional Requirements (FR-01 to FR-18)
- **FR-01: Registration**: Registration with Full Name, Email, and Password with inline validation errors and friendly alerts.
- **FR-02: Login / Logout**: Authenticates via Firebase Authentication; seamless redirection between `/login` and `/dashboard`.
- **FR-03: Protected Routes**: Strict client and route protection via `ProtectedRoute` component preventing unauthenticated visits.
- **FR-04: User Profile**: Persists public display name, email, and UID in Firestore `/users/{uid}`; never stores plaintext passwords.
- **FR-05: Project Creation**: Validated creation form requiring name (3–80 chars) and optional description (max 1000 chars).
- **FR-06: Project Management**: Owner-exclusive edit and delete capabilities under `/projects/[id]/settings` with confirmation dialogs.
- **FR-07: Membership Management**: Owner can add existing registered users by email and remove members; duplicate memberships are rejected; owner cannot remove themselves.
- **FR-08: Task Creation**: Tasks support title (3–120 chars), description, status (`todo`, `in_progress`, `done`), priority (`low`, `medium`, `high`), due date, and optional assignee from project members.
- **FR-09: Task Updates**: Permitted updates for Owner, Creator, and Assignee with optimistic UI updates.
- **FR-10: Task Deletion**: Owner or task creator can delete tasks with accessible `ConfirmDialog` modal.
- **FR-11: Task Status Lifecycle**: Initial status `todo`; transition to `in_progress` and `done` with keyboard-friendly selectors.
- **FR-12: Task Assignment**: Assignee select dropdown populated strictly with verified project members.
- **FR-13: Task Discovery**: Multi-attribute filtering (Status, Priority, Assignee), live client-side title search keyword, and reset filters.
- **FR-14: Personal Dashboard**: Summary metric cards (Total Tasks, To Do, In Progress, Done), accessible project directory, and overdue tasks feed.
- **FR-15: Empty & Error States**: Clear messages for empty lists (`EmptyState`), loading spinners (`Loader`), access denied, and failed requests.
- **FR-16: Responsive UI**: Mobile (375px), tablet (768px), and desktop (1280px) responsive layouts without horizontal overflow.
- **FR-17: Deployment**: Configured for Vercel and production hosting with environment variable decoupling.
- **FR-18: Audit Fields**: Automatically records `createdAt` and `updatedAt` server timestamps on projects and tasks.

### Live Evaluation Exercise (Section 18)
- Dedicated **"Overdue Tasks Only"** toggle in `FilterBar` showing incomplete tasks with a due date earlier than today (using universal `isOverdue` helper).

### Bonus Features (Section 19)
- **Kanban Board View**: Instant toggle on `/projects/[id]` between **List View** and **3-Column Kanban Board** (`To Do` | `In Progress` | `Done`) with quick status advancement buttons.

---

## 3. Demo Credentials & 1-Click Seeding (Appendix A)

| Role | Email | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Project Owner** | `owner@example.test` | `password123` | Full control over project, settings, members, tasks |
| **Team Member** | `member@example.test` | `password123` | View project, create tasks, edit assigned/own tasks |

### 1-Click Seeding:
On the `/login` screen, evaluators can click:
1. **"Owner Account"** or **"Member Account"** to immediately fill credentials.
2. **"🌱 Seed Appendix A Demo Data (1-Click)"** to automatically create the sample project ("Website Redesign") with all 4 sample tasks (including the overdue bug task due yesterday).

Alternatively, run via terminal:
```bash
node scripts/seed.js
```

---

## 4. Test Matrix & Acceptance Verification (TC-01 to TC-16)

| Test ID | Scenario | Expected Result | Implementation |
| :--- | :--- | :--- | :--- |
| **TC-01** | Register valid inputs | Account & Firestore `/users/{uid}` created | `hooks/useAuth.js` + `app/register/page.js` |
| **TC-02** | Register invalid email / weak password | Validation error shown next to inputs | `components/AuthForm.jsx` |
| **TC-03** | Log in & refresh browser | Session remains active | Firebase local persistence |
| **TC-04** | Open dashboard signed out | Redirects to `/login` | `components/ProtectedRoute.jsx` |
| **TC-05** | Create project | Project appears on dashboard and persists | `app/projects/new/page.js` |
| **TC-06** | Update/delete project as member | Access denied / button hidden | `app/projects/[id]/settings/page.js` + `firestore.rules` |
| **TC-07** | Add existing member by email | Teammate added to `memberIds` array | `services/projects.js` + `app/projects/[id]/settings/page.js` |
| **TC-08** | Add unknown user email | Clear error: "No registered user found" | `app/projects/[id]/settings/page.js` |
| **TC-09** | Create task without title | Validation blocks submit | `components/TaskForm.jsx` |
| **TC-10** | Change task status | Persists in Firestore | `services/tasks.js` |
| **TC-11** | Filter high-priority tasks | Only high-priority tasks shown | `components/FilterBar.jsx` |
| **TC-12** | Search title keyword | Real-time case-insensitive match | `app/projects/[id]/page.js` |
| **TC-13** | Direct URL to unauthorized project | Shows "Access Denied" / no data leak | `app/projects/[id]/page.js` |
| **TC-14** | Forbidden Firestore write | Security rules reject operation | `firestore.rules` |
| **TC-15** | Mobile 375px width | Clean stacking, no horizontal overflow | `styles/globals.css` |
| **TC-16** | Network failure / offline | Meaningful error feedback | User-facing state banners |

---

## 5. Security Model (`firestore.rules`)
- **Default Deny**: `match /{document=**} { allow read, write: if false; }`
- **Users Collection**: Users can only read and write their own document. Authenticated users can list for email lookup.
- **Projects Collection**:
  - Read: Authenticated members (`request.auth.uid in resource.data.memberIds`).
  - Create: Authenticated users where `ownerId == auth.uid` and `name.size() >= 3`.
  - Update/Delete: Owner only (`resource.data.ownerId == request.auth.uid`).
- **Tasks Subcollection**:
  - Read: Project members.
  - Create: Project members with required field validation and valid assignee.
  - Update: Owner, Creator, or assigned member. Project linkage and creator are immutable.
  - Delete: Project owner or task creator only.

---

## 6. Architecture & Tech Stack
- **Framework**: Next.js 15+ (App Router)
- **UI & Components**: React 19, Plain CSS (zero third-party UI bloat)
- **Authentication**: Firebase Authentication
- **Database**: Cloud Firestore
- **State & Hooks**: React hooks (`useState`, `useEffect`, `useContext`)
