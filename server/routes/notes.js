import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Note from '../models/Note.js';
import User from '../models/User.js';
import { requireAuth } from '../middleware/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.join(__dirname, '../uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadDir,
  filename(req, file, callback) {
    const safeName = file.originalname.replace(/\s+/g, '-');
    callback(null, `${Date.now()}-${safeName}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter(_req, file, callback) {
    const allowed = /jpeg|jpg|png|gif/;
    const valid = allowed.test(file.mimetype);
    callback(valid ? null : new Error('Only image uploads are allowed'), valid);
  }
});

const router = express.Router();

router.use(requireAuth);

function serializeNote(note, currentUserId) {
  const noteObject = note.toObject();
  const isOwner = String(note.owner) === String(currentUserId);
  const share = note.sharedWith.find((item) => String(item.user) === String(currentUserId));

  return {
    ...noteObject,
    canEdit: isOwner || Boolean(share?.canEdit),
    isOwner
  };
}

router.get('/', async (req, res, next) => {
  try {
    const notes = await Note.find({
      $or: [{ owner: req.user._id }, { 'sharedWith.user': req.user._id }]
    }).sort({ updatedAt: -1 });

    res.json({ notes: notes.map((note) => serializeNote(note, req.user._id)) });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const title = String(req.body.title || '').trim();
    const content = String(req.body.content || '');
    const image = req.body.image ? String(req.body.image).trim() : '';

    if (!title) {
      return res.status(400).json({ message: 'Title is required' });
    }

    const note = await Note.create({
      title,
      content,
      image,
      owner: req.user._id,
      ownerUsername: req.user.username,
      editHistory: [
        {
          user: req.user._id,
          username: req.user.username,
          summary: 'Created note'
        }
      ]
    });

    res.status(201).json({ note: serializeNote(note, req.user._id) });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/image', upload.single('image'), async (req, res, next) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }

    const isOwner = String(note.owner) === String(req.user._id);
    const share = note.sharedWith.find((item) => String(item.user) === String(req.user._id));
    if (!isOwner && !share?.canEdit) {
      return res.status(403).json({ message: 'You only have view permission for this note' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No image uploaded' });
    }

    note.image = `/uploads/${req.file.filename}`;
    note.editHistory.push({
      user: req.user._id,
      username: req.user.username,
      summary: 'Added/updated note image'
    });

    await note.save();
    res.json({ note: serializeNote(note, req.user._id) });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }

    const isOwner = String(note.owner) === String(req.user._id);
    const share = note.sharedWith.find((item) => String(item.user) === String(req.user._id));
    if (!isOwner && !share?.canEdit) {
      return res.status(403).json({ message: 'You only have view permission for this note' });
    }

    const nextTitle = String(req.body.title || '').trim();
    if (!nextTitle) {
      return res.status(400).json({ message: 'Title is required' });
    }

    note.title = nextTitle;
    note.content = String(req.body.content || '');
    if ('image' in req.body) {
      note.image = String(req.body.image || '');
    }
    note.editHistory.push({
      user: req.user._id,
      username: req.user.username,
      summary: 'Edited note'
    });

    await note.save();
    res.json({ note: serializeNote(note, req.user._id) });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/share', async (req, res, next) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }

    if (String(note.owner) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Only the owner can share this note' });
    }

    const usernames = Array.isArray(req.body.usernames)
      ? req.body.usernames
      : String(req.body.usernames || '').split(',');
    const cleanUsernames = usernames
      .map((username) => String(username).trim().toLowerCase())
      .filter(Boolean);
    const canEdit = Boolean(req.body.canEdit);

    const users = await User.find({ username: { $in: cleanUsernames } });
    const foundIds = new Set(users.map((user) => String(user._id)));

    note.sharedWith = note.sharedWith.filter((share) => !foundIds.has(String(share.user)));
    users
      .filter((user) => String(user._id) !== String(req.user._id))
      .forEach((user) => {
        note.sharedWith.push({ user: user._id, username: user.username, canEdit });
      });

    if (users.length) {
      note.editHistory.push({
        user: req.user._id,
        username: req.user.username,
        summary: `Shared with ${users.map((user) => user.username).join(', ')}`
      });
    }

    await note.save();

    const missing = cleanUsernames.filter(
      (username) => !users.some((user) => user.username === username)
    );

    res.json({ note: serializeNote(note, req.user._id), missing });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }

    if (String(note.owner) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Only the owner can delete this note' });
    }

    await note.deleteOne();
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

export default router;
