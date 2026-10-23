# TaskFlow - Manual Test Checklist

Use this checklist to verify core functionality after deployment or major changes.

## Authentication
- [ ] **Registration**: Sign up with a new email/password. Verify user profile created in Firestore.
- [ ] **Login**: Login with existing credentials. Verify session persistence after page refresh.
- [ ] **Redirects**: Logout and attempt to access `/dashboard`. Verify redirect to `/login`.

## Projects
- [ ] **Creation**: Create a new project. Verify owner is added to `memberIds` and listed on the dashboard.
- [ ] **Ownership**: Verify the owner can see the "Settings" button and add new members.
- [ ] **Security**: Log in as a non-member (or use a different account) and attempt to access `/projects/[projectId]`. Verify "Access Denied" or "Not Found" error.
- [ ] **Member Management**: Add a registered user email. Verify they appear as a member and can access project tasks.
- [ ] **Deletion**: Delete a project. Verify the project and all associated tasks in Firestore subcollection are removed.

## Tasks
- [ ] **CRUD**: Create, Edit, and Delete tasks.
- [ ] **Status Change**: Change task status. Verify persistence.
- [ ] **Permissions**: 
    - [ ] Non-owner member creates a task. Verify `createdBy` is set to their UID.
    - [ ] Non-owner member tries to edit a task created by someone else (not assigned). Verify failure.
- [ ] **Filtering**: Apply Status/Priority filters and Title search. Verify result list updates accordingly.
- [ ] **Overdue Logic**: Create a task with `dueDate` in the past. Verify it appears in the "Overdue Tasks" list on the Dashboard.

## UI/UX
- [ ] **Responsive**: Check layout at 375px (mobile), 768px (tablet), and 1280px (desktop).
- [ ] **Accessibility**: Use keyboard (Tab key) to navigate Navbar, Forms, and Task actions. Verify focus indicators are visible.
- [ ] **Feedback**: Verify loading states (loaders) and confirmation modals appear for destructive actions.
