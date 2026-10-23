import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, setDoc, collection, addDoc, serverTimestamp, getDocs, query, where } from 'firebase/firestore';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);
const auth = getAuth(app);

async function seed() {
  console.log('Seeding TaskFlow demo data (Appendix A)...');

  const users = [
    { email: 'owner@example.test', name: 'Project Owner (TAQAT)' },
    { email: 'member@example.test', name: 'Team Member (CodeMap)' },
  ];

  const userIds = {};
  for (const u of users) {
    try {
      const cred = await createUserWithEmailAndPassword(auth, u.email, 'password123');
      await setDoc(doc(db, 'users', cred.user.uid), {
        email: u.email,
        displayName: u.name,
        createdAt: serverTimestamp(),
      });
      userIds[u.email] = cred.user.uid;
      console.log(`Created user ${u.email}`);
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        const cred = await signInWithEmailAndPassword(auth, u.email, 'password123');
        userIds[u.email] = cred.user.uid;
        console.log(`User ${u.email} already exists (${cred.user.uid})`);
      } else {
        console.error(`Error with user ${u.email}:`, err.message);
      }
    }
  }

  const ownerUid = userIds['owner@example.test'];
  const memberUid = userIds['member@example.test'];

  if (!ownerUid) {
    throw new Error('Owner UID could not be established.');
  }

  // Switch back to owner auth before project operations
  await signInWithEmailAndPassword(auth, 'owner@example.test', 'password123');

  // Create or retrieve project "Website Redesign"
  let projectId;
  const projQuery = query(collection(db, 'projects'), where('memberIds', 'array-contains', ownerUid));
  const projSnap = await getDocs(projQuery);

  if (!projSnap.empty) {
    projectId = projSnap.docs[0].id;
    console.log(`Project "Website Redesign" already exists (${projectId})`);
  } else {
    const memberIds = [ownerUid];
    if (memberUid) memberIds.push(memberUid);

    const projectRef = await addDoc(collection(db, 'projects'), {
      name: 'Website Redesign',
      description: 'Overhaul of the main corporate website, brand identity, and responsive client portal.',
      ownerId: ownerUid,
      memberIds: memberIds,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    projectId = projectRef.id;
    console.log(`Created project "Website Redesign" (${projectId})`);
  }

  // Check tasks
  const tasksSnap = await getDocs(collection(db, 'projects', projectId, 'tasks'));
  if (tasksSnap.empty) {
    const yesterday = new Date(Date.now() - 86400000);
    const nextWeek = new Date(Date.now() + 7 * 86400000);

    const tasks = [
      {
        title: 'Build navbar',
        description: 'Responsive and accessible navigation bar with mobile menu and active state.',
        status: 'in_progress',
        priority: 'high',
        createdBy: ownerUid,
        assigneeId: memberUid || ownerUid,
        dueDate: nextWeek,
      },
      {
        title: 'Create login page',
        description: 'Authentication forms for sign in and sign up with validation.',
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
        description: 'Critical deadline bug that was due yesterday and must be addressed immediately.',
        status: 'todo',
        priority: 'high',
        createdBy: ownerUid,
        assigneeId: ownerUid,
        dueDate: yesterday, // Overdue!
      },
    ];

    for (const t of tasks) {
      await addDoc(collection(db, 'projects', projectId, 'tasks'), {
        ...t,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      console.log(`Created task "${t.title}"`);
    }
  } else {
    console.log(`Tasks already exist in project (${tasksSnap.size} tasks)`);
  }

  console.log('✅ Seeding complete!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
