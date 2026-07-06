import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  BookOpen,
  Check,
  Clock3,
  Edit3,
  Eye,
  LogOut,
  Mail,
  Plus,
  Save,
  Search,
  Send,
  Shield,
  Trash2,
  Upload,
  User,
  Users
} from 'lucide-react';
import './styles.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const SERVER_URL = API_URL.replace(/\/api$/, '');

function request(path, options = {}, token = '') {
  const headers = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers
  };

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  return fetch(`${API_URL}${path}`, {
    ...options,
    headers
  }).then(async (response) => {
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.message || 'Request failed');
    }
    return data;
  });
}

function App() {
  const [authMode, setAuthMode] = useState('landing');
  const [session, setSession] = useState(() => {
    const saved = localStorage.getItem('noteshare-session');
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    if (session) {
      localStorage.setItem('noteshare-session', JSON.stringify(session));
    } else {
      localStorage.removeItem('noteshare-session');
    }
  }, [session]);

  if (session) {
    return <Dashboard session={session} onLogout={() => setSession(null)} />;
  }

  if (authMode === 'login' || authMode === 'signup') {
    return (
      <AuthView
        mode={authMode}
        onModeChange={setAuthMode}
        onSuccess={setSession}
      />
    );
  }

  return <Landing onLogin={() => setAuthMode('login')} onSignup={() => setAuthMode('signup')} />;
}

function Landing({ onLogin, onSignup }) {
  return (
    <main className="landing">
      <nav className="topbar">
        <div className="brand">
          <BookOpen size={24} />
          <span>NoteShare</span>
        </div>
        <div className="nav-actions">
          <button className="ghost" onClick={onLogin}>Login</button>
          <button onClick={onSignup}>Sign up</button>
        </div>
      </nav>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Private notes. Shared workspaces.</p>
          <h1>NoteShare</h1>
          <p>
            Create clean notes, share them by username, and let teammates view or edit based on
            the permission you choose.
          </p>
          <div className="hero-actions">
            <button onClick={onSignup}><User size={18} /> Create account</button>
            <button className="secondary" onClick={onLogin}><Shield size={18} /> Login</button>
          </div>
        </div>
        <div className="hero-panel" aria-label="Note preview">
          <div className="preview-header">
            <span>Project plan</span>
            <span className="pill">Editable</span>
          </div>
          <div className="preview-lines">
            <span />
            <span />
            <span />
            <span />
          </div>
          <div className="activity">
            <Check size={16} />
            Previously edited by arun
          </div>
        </div>
      </section>
    </main>
  );
}

function AuthView({ mode, onModeChange, onSuccess }) {
  const [form, setForm] = useState({ username: '', email: '', password: '', login: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const isSignup = mode === 'signup';

  async function submit(event) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const path = isSignup ? '/auth/signup' : '/auth/login';
      const body = isSignup
        ? { username: form.username, email: form.email, password: form.password }
        : { login: form.login, password: form.password };
      const data = await request(path, { method: 'POST', body: JSON.stringify(body) });
      onSuccess(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <button className="back-link" onClick={() => onModeChange('landing')}>Back</button>
        <div className="brand auth-brand">
          <BookOpen size={24} />
          <span>NoteShare</span>
        </div>
        <h1>{isSignup ? 'Create your account' : 'Welcome back'}</h1>
        <form onSubmit={submit}>
          {isSignup ? (
            <>
              <label>
                Username
                <input
                  value={form.username}
                  onChange={(event) => setForm({ ...form, username: event.target.value })}
                  minLength={3}
                  required
                />
              </label>
              <label>
                Email
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm({ ...form, email: event.target.value })}
                  required
                />
              </label>
            </>
          ) : (
            <label>
              Username or email
              <input
                value={form.login}
                onChange={(event) => setForm({ ...form, login: event.target.value })}
                required
              />
            </label>
          )}
          <label>
            Password
            <input
              type="password"
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              minLength={6}
              required
            />
          </label>
          {error ? <p className="error">{error}</p> : null}
          <button className="full" disabled={loading}>
            {loading ? 'Please wait...' : isSignup ? 'Sign up' : 'Login'}
          </button>
        </form>
        <p className="switch">
          {isSignup ? 'Already have an account?' : 'New here?'}
          <button onClick={() => onModeChange(isSignup ? 'login' : 'signup')}>
            {isSignup ? 'Login' : 'Sign up'}
          </button>
        </p>
      </section>
    </main>
  );
}

function Dashboard({ session, onLogout }) {
  const [notes, setNotes] = useState([]);
  const [activeTab, setActiveTab] = useState('my');
  const [selectedId, setSelectedId] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const token = session.token;

  const myNotes = notes.filter((note) => note.isOwner);
  const sharedNotes = notes.filter((note) => !note.isOwner);
  const visibleNotes = activeTab === 'my' ? myNotes : sharedNotes;
  const selected = visibleNotes.find((note) => note._id === selectedId) || visibleNotes[0];

  async function loadNotes() {
    try {
      const data = await request('/notes', {}, token);
      setNotes(data.notes);
      setSelectedId((current) => current || data.notes[0]?._id || '');
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    loadNotes();
  }, []);

  async function createNote() {
    setError('');
    const data = await request(
      '/notes',
      {
        method: 'POST',
        body: JSON.stringify({ title: 'Untitled note', content: '' })
      },
      token
    );
    setNotes([data.note, ...notes]);
    setSelectedId(data.note._id);
    setActiveTab('my');
  }

  async function saveNote(note) {
    setMessage('');
    setError('');
    try {
      const data = await request(
        `/notes/${note._id}`,
        { method: 'PUT', body: JSON.stringify({ title: note.title, content: note.content }) },
        token
      );
      setNotes(notes.map((item) => (item._id === data.note._id ? data.note : item)));
      setMessage(`Saved. Previously edited by ${session.user.username}.`);
    } catch (err) {
      setError(err.message);
    }
  }

  async function uploadNoteImage(note, file) {
    if (!file) {
      return;
    }

    setMessage('');
    setError('');
    const formData = new FormData();
    formData.append('image', file);

    try {
      const data = await request(
        `/notes/${note._id}/image`,
        { method: 'POST', body: formData },
        token
      );
      setNotes(notes.map((item) => (item._id === data.note._id ? data.note : item)));
      setMessage('Image uploaded successfully.');
    } catch (err) {
      setError(err.message);
    }
  }

  async function shareNote(note, usernames, canEdit) {
    setMessage('');
    setError('');
    try {
      const data = await request(
        `/notes/${note._id}/share`,
        { method: 'POST', body: JSON.stringify({ usernames, canEdit }) },
        token
      );
      setNotes(notes.map((item) => (item._id === data.note._id ? data.note : item)));
      setMessage(
        data.missing?.length
          ? `Shared with found users. Missing: ${data.missing.join(', ')}`
          : 'Note sharing updated.'
      );
    } catch (err) {
      setError(err.message);
    }
  }

  async function deleteNote(note) {
    await request(`/notes/${note._id}`, { method: 'DELETE' }, token);
    const remaining = notes.filter((item) => item._id !== note._id);
    setNotes(remaining);
    setSelectedId(remaining[0]?._id || '');
  }

  return (
    <main className="dashboard">
      <aside className="sidebar">
        <div className="brand">
          <BookOpen size={24} />
          <span>NoteShare</span>
        </div>
        <div className="profile-mini">
          <User size={20} />
          <div>
            <strong>{session.user.username}</strong>
            <span>{session.user.email}</span>
          </div>
        </div>
        <button className={activeTab === 'my' ? 'active menu-button' : 'menu-button'} onClick={() => setActiveTab('my')}>
          <Edit3 size={18} /> My notes
        </button>
        <button className={activeTab === 'shared' ? 'active menu-button' : 'menu-button'} onClick={() => setActiveTab('shared')}>
          <Users size={18} /> Shared notes
        </button>
        <button className="menu-button" onClick={onLogout}>
          <LogOut size={18} /> Logout
        </button>
      </aside>
      <section className="workspace">
        <header className="workspace-header">
          <div>
            <p className="eyebrow">Dashboard</p>
            <h1>{activeTab === 'my' ? 'My notes' : 'Shared with me'}</h1>
          </div>
          <button onClick={createNote}><Plus size={18} /> New note</button>
        </header>
        <div className="content-grid">
          {visibleNotes.length ? (
            <>
              <NoteList notes={visibleNotes} selected={selected?._id} onSelect={setSelectedId} />
              <NoteEditor
                key={selected._id}
                note={selected}
                onSave={saveNote}
                onShare={shareNote}
                onUploadImage={uploadNoteImage}
                onDelete={deleteNote}
                message={message}
                error={error}
              />
            </>
          ) : (
            <div className="empty-state">
              <Search size={40} />
              <h2>No notes yet</h2>
              <p>Create your first note or wait for someone to share one with you.</p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function NoteList({ notes, selected, onSelect }) {
  return (
    <div className="note-list">
      {notes.map((note) => {
        const lastEdit = note.editHistory?.at(-1);
        return (
          <button
            key={note._id}
            className={selected === note._id ? 'note-item selected' : 'note-item'}
            onClick={() => onSelect(note._id)}
          >
            <strong>{note.title}</strong>
            <span className={note.canEdit ? 'mini-badge edit' : 'mini-badge'}>
              {note.isOwner ? 'Owner' : note.canEdit ? 'Can edit' : 'View only'}
            </span>
            {lastEdit ? <small>Previously edited by {lastEdit.username}</small> : null}
          </button>
        );
      })}
    </div>
  );
}

function NoteEditor({ note, onSave, onShare, onUploadImage, onDelete, message, error }) {
  const [draft, setDraft] = useState({ title: note.title, content: note.content });
  const [shareNames, setShareNames] = useState('');
  const [canEdit, setCanEdit] = useState(true);
  const [selectedFile, setSelectedFile] = useState(null);
  const lastEdit = useMemo(() => note.editHistory?.at(-1), [note]);

  useEffect(() => {
    setDraft({ title: note.title, content: note.content });
    setShareNames('');
    setCanEdit(true);
    setSelectedFile(null);
  }, [note]);

  return (
    <article className="editor">
      <div className="editor-top">
        <div>
          <span className={note.canEdit ? 'permission edit' : 'permission view'}>
            {note.canEdit ? <Edit3 size={14} /> : <Eye size={14} />}
            {note.canEdit ? 'Can edit' : 'View only'}
          </span>
          {lastEdit ? (
            <p className="last-edit">Previously edited by {lastEdit.username}</p>
          ) : null}
        </div>
        {note.isOwner ? (
          <button className="danger" onClick={() => onDelete(note)}>
            <Trash2 size={16} /> Delete
          </button>
        ) : null}
      </div>
      <input
        className="title-input"
        value={draft.title}
        disabled={!note.canEdit}
        onChange={(event) => setDraft({ ...draft, title: event.target.value })}
      />
      {note.image ? (
        <div className="note-image-wrap">
          <img
            className="note-image"
            src={note.image.startsWith('http') ? note.image : `${SERVER_URL}${note.image}`}
            alt="Note attachment"
          />
        </div>
      ) : null}
      <textarea
        value={draft.content}
        disabled={!note.canEdit}
        onChange={(event) => setDraft({ ...draft, content: event.target.value })}
        placeholder="Write your note here..."
      />
      <div className="editor-actions">
        <button disabled={!note.canEdit} onClick={() => onSave({ ...note, ...draft })}>
          <Save size={18} /> Save note
        </button>
        {message ? <span className="success">{message}</span> : null}
        {error ? <span className="error inline">{error}</span> : null}
      </div>
      {note.canEdit ? (
        <div className="upload-panel">
          <label className="upload-label">
            <input
              type="file"
              accept="image/*"
              onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
            />
          </label>
          <button
            type="button"
            className="upload-button"
            disabled={!selectedFile}
            onClick={() => selectedFile && onUploadImage(note, selectedFile)}
          >
            <Upload size={16} /> Upload image
          </button>
          {selectedFile ? <p className="upload-hint">Selected: {selectedFile.name}</p> : null}
        </div>
      ) : null}
      {note.isOwner ? (
        <section className="share-panel">
          <h2>Share note</h2>
          <div className="share-row">
            <input
              value={shareNames}
              onChange={(event) => setShareNames(event.target.value)}
              placeholder="username1, username2"
            />
            <label className="checkbox">
              <input
                type="checkbox"
                checked={canEdit}
                onChange={(event) => setCanEdit(event.target.checked)}
              />
              Can edit
            </label>
            <button onClick={() => onShare(note, shareNames, canEdit)}>
              <Send size={16} /> Share
            </button>
          </div>
          <div className="shared-users">
            {note.sharedWith?.length ? (
              note.sharedWith.map((share) => (
                <span key={share.user}>
                  <Mail size={14} /> {share.username} - {share.canEdit ? 'edit' : 'view'}
                </span>
              ))
            ) : (
              <span>No users shared yet</span>
            )}
          </div>
        </section>
      ) : null}
      <section className="history">
        <h2>Edit history</h2>
        {note.editHistory?.slice().reverse().map((entry, index) => (
          <p key={`${entry.editedAt}-${index}`}>
            <Clock3 size={14} />
            <strong>{entry.username}</strong> {entry.summary.toLowerCase()} -{' '}
            {new Date(entry.editedAt).toLocaleString()}
          </p>
        ))}
      </section>
    </article>
  );
}

createRoot(document.getElementById('root')).render(<App />);
