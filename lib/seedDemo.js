import { auth, db } from './firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, collection, addDoc, serverTimestamp, getDocs, query, where } from 'firebase/firestore';

/**
 * Seeds Appendix A demo data directly from browser or node:
 * - owner@example.test (Password: password123)
 * - member@example.test (Password: password123)
 * - Project: "Website Redesign"
 * - 4 Tasks with different statuses, priorities, and an overdue task
 */
export async function seedDemoData() {
  const results = {
    usersCreated: [],
    projectCreated: null,
    tasksCreated: [],
    logs: [],
  };

  const log = (msg) => {
    console.log('[SeedDemo]', msg);
    results.logs.push(msg);
  };

  log('Starting demo data seeding...');

  // 1. Create or verify Demo Users
  const demoUsers = [
    { email: 'owner@example.test', password: 'password123', displayName: 'Project Owner (TAQAT)' },
    { email: 'member@example.test', password: 'password123', displayName: 'Team Member (CodeMap)' },
  ];

  const userIds = {};

  for (const userSpec of demoUsers) {
    try {
      // Try to create user
      const userCredential = await createUserWithEmailAndPassword(auth, userSpec.email, userSpec.password);
      const uid = userCredential.user.uid;
      userIds[userSpec.email] = uid;
      await setDoc(doc(db, 'users', uid), {
        displayName: userSpec.displayName,
        email: userSpec.email,
        createdAt: serverTimestamp(),
      });
      results.usersCreated.push(userSpec.email);
      log(`Created user ${userSpec.email}`);
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        log(`User ${userSpec.email} already exists in Auth, signing in to retrieve UID...`);
        try {
          const cred = await signInWithEmailAndPassword(auth, userSpec.email, userSpec.password);
          const uid = cred.user.uid;
          userIds[userSpec.email] = uid;
          await setDoc(doc(db, 'users', uid), {
            displayName: userSpec.displayName,
            email: userSpec.email,
            createdAt: serverTimestamp(),
          }, { merge: true });
        } catch (signInErr) {
          log(`Failed to sign in existing user ${userSpec.email}: ${signInErr.message}`);
          // Query users collection
          const userSnap = await getDocs(query(collection(db, 'users'), where('email', '==', userSpec.email)));
          if (!userSnap.empty) {
            userIds[userSpec.email] = userSnap.docs[0].id;
          }
        }
      } else {
        log(`Error creating user ${userSpec.email}: ${err.message}`);
      }
    }
  }

  const ownerUid = userIds['owner@example.test'];
  const memberUid = userIds['member@example.test'];

  if (!ownerUid) {
    throw new Error('Failed to obtain Owner UID for demo seeding.');
  }

  // 2. Check if "Website Redesign" already exists
  const existingProjSnap = await getDocs(
    query(collection(db, 'projects'), where('ownerId', '==', ownerUid), where('name', '==', 'Website Redesign'))
  );

  let projectId;
  if (!existingProjSnap.empty) {
    projectId = existingProjSnap.docs[0].id;
    log(`Project "Website Redesign" already exists (${projectId})`);
  } else {
    const memberIds = [ownerUid];
    if (memberUid) memberIds.push(memberUid);

    const projDoc = await addDoc(collection(db, 'projects'), {
      name: 'Website Redesign',
      description: 'Overhaul of the main corporate website, brand identity, and responsive client portal.',
      ownerId: ownerUid,
      memberIds: memberIds,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    projectId = projDoc.id;
    results.projectCreated = projectId;
    log(`Created project "Website Redesign" (${projectId})`);
  }

  // 3. Create Appendix A demo tasks
  const existingTasksSnap = await getDocs(collection(db, 'projects', projectId, 'tasks'));
  if (existingTasksSnap.empty) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);

    const demoTasks = [
      {
        title: 'Build navbar',
        description: 'Implement responsive accessible navigation header with mobile toggle and active route states.',
        status: 'in_progress',
        priority: 'high',
        createdBy: ownerUid,
        assigneeId: memberUid || ownerUid,
        dueDate: nextWeek,
      },
      {
        title: 'Create login page',
        description: 'Design accessible authentication forms for sign in and sign up with validation.',
        status: 'todo',
        priority: 'medium',
        createdBy: ownerUid,
        assigneeId: ownerUid,
        dueDate: nextWeek,
      },
      {
        title: 'Test responsive layout',
        description: 'Verify application views on mobile (375px), tablet (768px), and desktop (1280px).',
        status: 'done',
        priority: 'low',
        createdBy: ownerUid,
        assigneeId: memberUid || ownerUid,
        dueDate: null,
      },
      {
        title: 'Fix overdue bug',
        description: 'Critical bug in task calculation that was due yesterday and must be addressed immediately.',
        status: 'todo',
        priority: 'high',
        createdBy: ownerUid,
        assigneeId: ownerUid,
        dueDate: yesterday, // Overdue!
      },
    ];

    for (const task of demoTasks) {
      const taskDoc = await addDoc(collection(db, 'projects', projectId, 'tasks'), {
        ...task,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      results.tasksCreated.push(task.title);
      log(`Created task "${task.title}" (${taskDoc.id})`);
    }
  } else {
    log(`Tasks already exist for project ${projectId} (${existingTasksSnap.size} tasks)`);
  }

  log('Demo data seeding completed successfully!');
  return results;
}
