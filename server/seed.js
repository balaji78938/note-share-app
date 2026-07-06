import 'dotenv/config';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import User from './models/User.js';
import Note from './models/Note.js';

const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/note_share_app';
const password = 'Note@12345';

const userSeeds = [
  { username: 'arun', email: 'arun@example.com' },
  { username: 'meera', email: 'meera@example.com' },
  { username: 'kavin', email: 'kavin@example.com' },
  { username: 'nisha', email: 'nisha@example.com' },
  { username: 'rohan', email: 'rohan@example.com' }
];

function history(user, summary, minutesAgo) {
  return {
    user: user._id,
    username: user.username,
    summary,
    editedAt: new Date(Date.now() - minutesAgo * 60 * 1000)
  };
}

await mongoose.connect(mongoUri);

const passwordHash = await bcrypt.hash(password, 12);
const users = {};
const existingUsers = await User.find({ username: { $in: userSeeds.map((user) => user.username) } });

for (const user of existingUsers) {
  users[user.username] = user;
}

for (const seed of userSeeds) {
  if (!users[seed.username]) {
    const user = await User.create({ ...seed, passwordHash });
    users[user.username] = user;
  }
}

const sampleNotes = [
  {
    title: 'Launch checklist',
    content:
      '1. Finalize landing copy\n2. Review dashboard spacing\n3. Confirm MongoDB seed data\n4. Test shared editing with Meera and Kavin',
    owner: users.arun._id,
    ownerUsername: users.arun.username,
    sharedWith: [
      { user: users.meera._id, username: users.meera.username, canEdit: true },
      { user: users.kavin._id, username: users.kavin.username, canEdit: false }
    ],
    editHistory: [
      history(users.arun, 'Created note', 90),
      history(users.meera, 'Edited note', 35)
    ]
  },
  {
    title: 'Research notes',
    content:
      'Collect user feedback about note sharing. Keep the UI calm, direct, and fast to scan. Add permission labels near every shared note.',
    image:
      'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1200&auto=format&fit=crop&q=80',
    owner: users.meera._id,
    ownerUsername: users.meera.username,
    sharedWith: [
      { user: users.arun._id, username: users.arun.username, canEdit: true },
      { user: users.nisha._id, username: users.nisha.username, canEdit: true },
      { user: users.rohan._id, username: users.rohan.username, canEdit: false }
    ],
    editHistory: [
      history(users.meera, 'Created note', 130),
      history(users.nisha, 'Edited note', 18)
    ]
  },
  {
    title: 'API cleanup ideas',
    content:
      'Add pagination later, keep note permissions simple for now, and show missing usernames after sharing.',
    owner: users.kavin._id,
    ownerUsername: users.kavin.username,
    sharedWith: [
      { user: users.arun._id, username: users.arun.username, canEdit: false },
      { user: users.rohan._id, username: users.rohan.username, canEdit: true }
    ],
    editHistory: [
      history(users.kavin, 'Created note', 70),
      history(users.rohan, 'Edited note', 12)
    ]
  },
  {
    title: 'Weekly planning',
    content:
      'Review Monday action items, assign follow-up tasks, and capture any blockers before the sprint review.',
    owner: users.arun._id,
    ownerUsername: users.arun.username,
    sharedWith: [
      { user: users.meera._id, username: users.meera.username, canEdit: false },
      { user: users.nisha._id, username: users.nisha.username, canEdit: false }
    ],
    editHistory: [
      history(users.arun, 'Created note', 55)
    ]
  },
  {
    title: 'Feature spec',
    content:
      'Define the fields, user flows, and share settings for the new note image upload system.',
    owner: users.kavin._id,
    ownerUsername: users.kavin.username,
    sharedWith: [
      { user: users.arun._id, username: users.arun.username, canEdit: true },
      { user: users.rohan._id, username: users.rohan.username, canEdit: false }
    ],
    editHistory: [
      history(users.kavin, 'Created note', 42),
      history(users.arun, 'Edited note', 10)
    ]
  },
  {
    title: 'Event reminders',
    content:
      'Book the conference room for Thursday, send the agenda to stakeholders, and confirm catering by Wednesday.',
    owner: users.rohan._id,
    ownerUsername: users.rohan.username,
    sharedWith: [
      { user: users.meera._id, username: users.meera.username, canEdit: true },
      { user: users.nisha._id, username: users.nisha.username, canEdit: false }
    ],
    editHistory: [
      history(users.rohan, 'Created note', 28)
    ]
  },
  {
    title: 'Design review',
    content:
      'Dashboard needs a steady two-column layout, warm background, clear note cards, and an editor that does not drift on empty states.',
    ownerUsername: users.nisha.username,
    sharedWith: [
      { user: users.meera._id, username: users.meera.username, canEdit: false },
      { user: users.kavin._id, username: users.kavin.username, canEdit: true }
    ],
    editHistory: [
      history(users.nisha, 'Created note', 50),
      history(users.kavin, 'Edited note', 8)
    ]
  }
];

for (const noteSeed of sampleNotes) {
  const owner = users[noteSeed.ownerUsername];
  if (!owner) continue;

  const existingNote = await Note.findOne({ title: noteSeed.title, owner: owner._id });
  if (!existingNote) {
    await Note.create({
      ...noteSeed,
      owner: owner._id,
      ownerUsername: owner.username
    });
  }
}

console.log('Seed complete.');
console.log('Users:');
userSeeds.forEach((user) => {
  console.log(`${user.username} / ${password}`);
});

await mongoose.disconnect();
