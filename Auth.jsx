import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Check, DollarSign, Users, Heart, X, Calendar, Sparkles, Copy, LogOut, Check as CheckIcon } from 'lucide-react';
import { supabase } from './supabaseClient';
import { AuthScreen, FamilySetupScreen } from './Auth';

const fmtDate = (d) => {
  if (!d) return '';
  const date = new Date(d + 'T00:00:00');
  // undefined locale = use the viewer's own device/browser setting,
  // so a US user sees "Jun 22" and a UK/Nigerian user sees "22 Jun", etc.
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};
const fmtMoney = (n) => `$${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

// ---- Person dot ----
function PersonDot({ person, size = 28 }) {
  const initial = (person?.name || '?').trim().charAt(0).toUpperCase();
  return (
    <div className="person-dot" style={{ width: size, height: size, background: person?.color || '#999', fontSize: size * 0.42 }}>
      {initial}
    </div>
  );
}

function TabBar({ tab, setTab }) {
  const tabs = [
    { id: 'tasks', label: 'Tasks', icon: Check },
    { id: 'expenses', label: 'Expenses', icon: DollarSign },
    { id: 'fairness', label: 'The Picture', icon: Heart },
    { id: 'family', label: 'Family', icon: Users },
  ];
  return (
    <nav className="tabbar">
      {tabs.map((t) => {
        const Icon = t.icon;
        return (
          <button key={t.id} className={`tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            <Icon size={19} strokeWidth={tab === t.id ? 2.3 : 1.8} />
            <span>{t.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

function EmptyState({ icon, title, body, actionLabel, onAction }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{body}</p>
      {actionLabel && <button className="empty-action" onClick={onAction}>{actionLabel}</button>}
    </div>
  );
}

// ---- Add Task Modal ----
function AddTaskModal({ members, onAdd, onClose, currentMemberId }) {
  const [title, setTitle] = useState('');
  const [owner, setOwner] = useState(currentMemberId || members[0]?.id || '');
  const [due, setDue] = useState('');
  const [recurring, setRecurring] = useState(false);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!title.trim() || saving) return;
    setSaving(true);
    await onAdd({ title: title.trim(), owner_member_id: owner, due_date: due || null, recurring });
    setSaving(false);
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>New task</h3>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <input autoFocus className="modal-input" placeholder="What needs doing? e.g. Refill blood pressure meds" value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} />
        <div className="modal-row">
          <label className="modal-label">Owner</label>
          <div className="owner-pick">
            {members.map((m) => (
              <button key={m.id} className={`owner-chip ${owner === m.id ? 'active' : ''}`} style={owner === m.id ? { background: m.color, color: '#fff', borderColor: m.color } : {}} onClick={() => setOwner(m.id)}>
                {m.name}
              </button>
            ))}
          </div>
        </div>
        <div className="modal-row">
          <label className="modal-label">Due date <span className="modal-optional">(optional)</span></label>
          <input type="date" className="modal-input-sm" value={due} onChange={(e) => setDue(e.target.value)} />
        </div>
        <label className="modal-checkbox">
          <input type="checkbox" checked={recurring} onChange={(e) => setRecurring(e.target.checked)} />
          This repeats regularly
        </label>
        <button className="modal-submit" onClick={submit} disabled={!title.trim() || saving}>{saving ? 'Adding…' : 'Add task'}</button>
      </div>
    </div>
  );
}

// ---- Add Expense Modal ----
function AddExpenseModal({ members, onAdd, onClose, currentMemberId }) {
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState(currentMemberId || members[0]?.id || '');
  const [splitWith, setSplitWith] = useState(members.map((m) => m.id));
  const [saving, setSaving] = useState(false);

  const toggleSplit = (id) => setSplitWith((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const submit = async () => {
    const amt = parseFloat(amount);
    if (!desc.trim() || !amt || amt <= 0 || splitWith.length === 0 || saving) return;
    setSaving(true);
    await onAdd({ description: desc.trim(), amount: amt, paid_by_member_id: paidBy, split_with: splitWith });
    setSaving(false);
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>New expense</h3>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <input autoFocus className="modal-input" placeholder="What was it for? e.g. Pharmacy co-pay" value={desc} onChange={(e) => setDesc(e.target.value)} />
        <div className="modal-row">
          <label className="modal-label">Amount</label>
          <input type="number" className="modal-input-sm" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div className="modal-row">
          <label className="modal-label">Paid by</label>
          <div className="owner-pick">
            {members.map((m) => (
              <button key={m.id} className={`owner-chip ${paidBy === m.id ? 'active' : ''}`} style={paidBy === m.id ? { background: m.color, color: '#fff', borderColor: m.color } : {}} onClick={() => setPaidBy(m.id)}>
                {m.name}
              </button>
            ))}
          </div>
        </div>
        <div className="modal-row">
          <label className="modal-label">Split between</label>
          <div className="owner-pick">
            {members.map((m) => (
              <button key={m.id} className={`owner-chip ${splitWith.includes(m.id) ? 'active' : ''}`} style={splitWith.includes(m.id) ? { background: m.color, color: '#fff', borderColor: m.color } : {}} onClick={() => toggleSplit(m.id)}>
                {m.name}
              </button>
            ))}
          </div>
        </div>
        <button className="modal-submit" onClick={submit} disabled={!desc.trim() || !amount || saving}>{saving ? 'Adding…' : 'Add expense'}</button>
      </div>
    </div>
  );
}

// ---- Tasks View ----
function TasksView({ tasks, members, openAddTask, toggleDone, removeTask }) {
  const memberById = (id) => members.find((m) => m.id === id);
  const open = [...tasks].filter((t) => !t.done).sort((a, b) => (a.due_date || '9999').localeCompare(b.due_date || '9999'));
  const done = tasks.filter((t) => t.done);

  return (
    <div className="view">
      <div className="view-head">
        <h2>Tasks</h2>
        <button className="add-btn" onClick={openAddTask}><Plus size={18} /> Add</button>
      </div>
      {tasks.length === 0 ? (
        <EmptyState icon={<Calendar size={28} />} title="Nothing logged yet" body="Add the first thing that needs doing — an appointment, a prescription, a call to make. Small is fine." actionLabel="Add a task" onAction={openAddTask} />
      ) : (
        <>
          {open.length > 0 && (
            <div className="task-group">
              {open.map((t) => (
                <TaskRow key={t.id} task={t} person={memberById(t.owner_member_id)} onToggle={() => toggleDone(t)} onRemove={() => removeTask(t.id)} />
              ))}
            </div>
          )}
          {done.length > 0 && (
            <>
              <div className="group-label">Done</div>
              <div className="task-group">
                {done.map((t) => (
                  <TaskRow key={t.id} task={t} person={memberById(t.owner_member_id)} onToggle={() => toggleDone(t)} onRemove={() => removeTask(t.id)} />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

function TaskRow({ task, person, onToggle, onRemove }) {
  return (
    <div className={`task-row ${task.done ? 'done' : ''}`}>
      <button className="check-circle" onClick={onToggle} style={task.done ? { background: person?.color, borderColor: person?.color } : {}}>
        {task.done && <Check size={13} color="#fff" strokeWidth={3} />}
      </button>
      <div className="task-body">
        <div className="task-title">{task.title}</div>
        <div className="task-meta">
          <PersonDot person={person} size={18} />
          <span>{person?.name || 'Unassigned'}</span>
          {task.due_date && <span className="task-due">· due {fmtDate(task.due_date)}</span>}
          {task.recurring && <span className="task-recur">· repeats</span>}
        </div>
      </div>
      <button className="row-remove" onClick={onRemove}><X size={15} /></button>
    </div>
  );
}

// ---- Expenses View ----
function ExpensesView({ expenses, members, openAddExpense, removeExpense }) {
  const memberById = (id) => members.find((m) => m.id === id);
  const total = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const sorted = [...expenses].sort((a, b) => (b.expense_date || '').localeCompare(a.expense_date || ''));

  return (
    <div className="view">
      <div className="view-head">
        <h2>Expenses</h2>
        <button className="add-btn" onClick={openAddExpense}><Plus size={18} /> Add</button>
      </div>
      {expenses.length === 0 ? (
        <EmptyState icon={<DollarSign size={28} />} title="No costs logged yet" body="Prescriptions, gas for the drive over, a home aide's hours — log it here so nobody has to remember or guess later." actionLabel="Add an expense" onAction={openAddExpense} />
      ) : (
        <>
          <div className="total-strip"><span>Total logged</span><strong>{fmtMoney(total)}</strong></div>
          <div className="task-group">
            {sorted.map((e) => {
              const payer = memberById(e.paid_by_member_id);
              const share = Number(e.amount) / (e.split_with?.length || 1);
              return (
                <div key={e.id} className="expense-row">
                  <PersonDot person={payer} size={32} />
                  <div className="task-body">
                    <div className="task-title">{e.description}</div>
                    <div className="task-meta">
                      <span>{payer?.name} paid</span>
                      <span className="task-due">· split {e.split_with?.length || 0} ways ({fmtMoney(share)} each)</span>
                    </div>
                  </div>
                  <div className="expense-amount">{fmtMoney(e.amount)}</div>
                  <button className="row-remove" onClick={() => removeExpense(e.id)}><X size={15} /></button>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ---- Fairness View ----
function FairnessView({ members, tasks, expenses }) {
  const stats = members.map((m) => {
    const tasksDone = tasks.filter((t) => t.owner_member_id === m.id && t.done).length;
    const tasksOpen = tasks.filter((t) => t.owner_member_id === m.id && !t.done).length;
    const paid = expenses.filter((e) => e.paid_by_member_id === m.id).reduce((s, e) => s + Number(e.amount), 0);
    const owed = expenses.reduce((s, e) => {
      if (!e.split_with?.includes(m.id)) return s;
      return s + Number(e.amount) / e.split_with.length;
    }, 0);
    return { member: m, tasksDone, tasksOpen, paid, owed, net: paid - owed };
  });
  const maxTasks = Math.max(1, ...stats.map((s) => s.tasksDone));
  const hasAnyData = tasks.length > 0 || expenses.length > 0;

  return (
    <div className="view">
      <div className="view-head"><h2>The Picture</h2></div>
      <p className="picture-intro">Not a scoreboard — just what's actually happened, so nobody has to guess or assume.</p>
      {!hasAnyData ? (
        <EmptyState icon={<Heart size={28} />} title="There's nothing to show yet" body="Once tasks and expenses start getting logged, this page fills in on its own — a clear, honest view of who's been doing what." />
      ) : (
        <div className="fairness-list">
          {stats.map(({ member, tasksDone, tasksOpen, paid, owed, net }) => (
            <div key={member.id} className="fairness-card">
              <div className="fairness-head">
                <PersonDot person={member} size={36} />
                <div className="fairness-name">{member.name}</div>
              </div>
              <div className="tide-row">
                <div className="tide-track">
                  <div className="tide-fill" style={{ width: `${(tasksDone / maxTasks) * 100}%`, background: member.color }} />
                </div>
                <span className="tide-label">{tasksDone} task{tasksDone === 1 ? '' : 's'} done{tasksOpen > 0 ? `, ${tasksOpen} open` : ''}</span>
              </div>
              <div className="money-row">
                <span>Paid {fmtMoney(paid)}</span>
                <span className="money-dot">·</span>
                <span>Owes share of {fmtMoney(owed)}</span>
                <span className={`money-net ${net >= 0 ? 'pos' : 'neg'}`}>{net >= 0 ? `+${fmtMoney(net)} net` : `${fmtMoney(net)} net`}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---- Family View ----
function FamilyView({ members, parentName, inviteCode, onLogout }) {
  const [copied, setCopied] = useState(false);
  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) { /* clipboard may be unavailable */ }
  };

  return (
    <div className="view">
      <div className="view-head"><h2>Family</h2></div>
      <p className="picture-intro">Caring for {parentName}. Everyone here is treated as an equal contributor — no one is set as "the main caregiver."</p>

      <div className="family-list">
        {members.map((m) => (
          <div key={m.id} className="family-row">
            <PersonDot person={m} size={36} />
            <span className="family-name-display">{m.name}</span>
          </div>
        ))}
      </div>

      <div className="invite-box">
        <div className="invite-box-label">Invite a sibling</div>
        <p className="invite-box-body">Share this code. They'll sign up, choose "Join with an invite code," and land in this same space.</p>
        <div className="invite-code-row">
          <span className="invite-code">{inviteCode}</span>
          <button className="copy-btn" onClick={copyCode}>
            {copied ? <CheckIcon size={15} /> : <Copy size={15} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>

      <button className="logout-btn" onClick={onLogout}><LogOut size={15} /> Log out</button>
    </div>
  );
}

// ---- Main authenticated app ----
function MainApp({ user, familySpace }) {
  const [tab, setTab] = useState('tasks');
  const [modal, setModal] = useState(null);
  const [members, setMembers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  const currentMember = members.find((m) => m.user_id === user.id);

  const loadAll = useCallback(async () => {
    const spaceId = familySpace.id;
    const [membersRes, tasksRes, expensesRes] = await Promise.all([
      supabase.from('members').select('*').eq('family_space_id', spaceId).order('created_at'),
      supabase.from('tasks').select('*').eq('family_space_id', spaceId).order('created_at'),
      supabase.from('expenses').select('*').eq('family_space_id', spaceId).order('created_at', { ascending: false }),
    ]);
    if (membersRes.data) setMembers(membersRes.data);
    if (tasksRes.data) setTasks(tasksRes.data);
    if (expensesRes.data) setExpenses(expensesRes.data);
    setLoading(false);
  }, [familySpace.id]);

  useEffect(() => {
    loadAll();

    // Live sync: subscribe to changes from any family member
    const channel = supabase
      .channel(`space-${familySpace.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `family_space_id=eq.${familySpace.id}` }, loadAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses', filter: `family_space_id=eq.${familySpace.id}` }, loadAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'members', filter: `family_space_id=eq.${familySpace.id}` }, loadAll)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [familySpace.id, loadAll]);

  const addTask = async (taskData) => {
    await supabase.from('tasks').insert({ ...taskData, family_space_id: familySpace.id });
    loadAll();
  };
  const toggleDone = async (task) => {
    await supabase.from('tasks').update({ done: !task.done }).eq('id', task.id);
    loadAll();
  };
  const removeTask = async (id) => {
    await supabase.from('tasks').delete().eq('id', id);
    loadAll();
  };
  const addExpense = async (expenseData) => {
    await supabase.from('expenses').insert({ ...expenseData, family_space_id: familySpace.id });
    loadAll();
  };
  const removeExpense = async (id) => {
    await supabase.from('expenses').delete().eq('id', id);
    loadAll();
  };
  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return <div className="loading-screen">Loading your family's space…</div>;
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-mark">
          <svg width="22" height="22" viewBox="0 0 40 40" fill="none">
            <path d="M20 33C20 33 5 24.5 5 14.5C5 9.5 9 6 13.5 6C16.5 6 18.8 7.6 20 10C21.2 7.6 23.5 6 26.5 6C31 6 35 9.5 35 14.5C35 24.5 20 33 20 33Z" fill="#C97B5C"/>
          </svg>
        </div>
        <div className="app-header-text">
          <div className="app-title">Kinly</div>
          <div className="app-subtitle">Caring for {familySpace.parent_name}</div>
        </div>
      </header>

      <main className="app-main">
        {tab === 'tasks' && <TasksView tasks={tasks} members={members} openAddTask={() => setModal('task')} toggleDone={toggleDone} removeTask={removeTask} />}
        {tab === 'expenses' && <ExpensesView expenses={expenses} members={members} openAddExpense={() => setModal('expense')} removeExpense={removeExpense} />}
        {tab === 'fairness' && <FairnessView members={members} tasks={tasks} expenses={expenses} />}
        {tab === 'family' && <FamilyView members={members} parentName={familySpace.parent_name} inviteCode={familySpace.invite_code} onLogout={handleLogout} />}
      </main>

      <TabBar tab={tab} setTab={setTab} />

      {modal === 'task' && <AddTaskModal members={members} currentMemberId={currentMember?.id} onClose={() => setModal(null)} onAdd={addTask} />}
      {modal === 'expense' && <AddExpenseModal members={members} currentMemberId={currentMember?.id} onClose={() => setModal(null)} onAdd={addExpense} />}
    </div>
  );
}

// ---- Root App: handles auth state + family space resolution ----
export default function App() {
  const [session, setSession] = useState(undefined); // undefined = checking, null = logged out
  const [familySpace, setFamilySpace] = useState(undefined); // undefined = checking, null = none yet

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (!newSession) setFamilySpace(null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    (async () => {
      const { data: member } = await supabase
        .from('members')
        .select('family_space_id, family_spaces(*)')
        .eq('user_id', session.user.id)
        .limit(1)
        .maybeSingle();
      if (member && member.family_spaces) {
        setFamilySpace(member.family_spaces);
      } else {
        setFamilySpace(null);
      }
    })();
  }, [session]);

  if (session === undefined) {
    return <div className="app-shell"><style>{styles}</style><div className="loading-screen">Loading…</div></div>;
  }

  if (!session) {
    return <div className="app-shell"><style>{styles}</style><AuthScreen onAuthed={() => {}} /></div>;
  }

  if (familySpace === undefined) {
    return <div className="app-shell"><style>{styles}</style><div className="loading-screen">Loading…</div></div>;
  }

  if (!familySpace) {
    return (
      <div className="app-shell">
        <style>{styles}</style>
        <FamilySetupScreen user={session.user} onSpaceReady={async () => {
          const { data: member } = await supabase
            .from('members')
            .select('family_space_id, family_spaces(*)')
            .eq('user_id', session.user.id)
            .limit(1)
            .maybeSingle();
          if (member?.family_spaces) setFamilySpace(member.family_spaces);
        }} />
      </div>
    );
  }

  return (
    <div className="app-shell">
      <style>{styles}</style>
      <MainApp user={session.user} familySpace={familySpace} />
    </div>
  );
}

const styles = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Inter:wght@400;500;600;700&display=swap');
* { box-sizing: border-box; }
.app-shell { font-family: 'Inter', sans-serif; background: #FBF8F3; color: #2B2A28; min-height: 100vh; max-width: 480px; margin: 0 auto; display: flex; flex-direction: column; position: relative; }
.loading-screen { display: flex; align-items: center; justify-content: center; height: 100vh; color: #8B6F5C; font-size: 15px; }
.onboard { flex: 1; display: flex; align-items: center; justify-content: center; padding: 24px; min-height: 100vh; }
.onboard-card { width: 100%; max-width: 360px; text-align: left; }
.onboard-mark { margin-bottom: 20px; }
.onboard-card h1 { font-family: 'Fraunces', serif; font-size: 28px; font-weight: 500; margin: 0 0 6px; letter-spacing: -0.01em; }
.onboard-sub { color: #6B6862; font-size: 14.5px; margin: 0 0 14px; }
.onboard-input { width: 100%; padding: 14px 16px; font-size: 16px; border: 1.5px solid #E8DFD3; border-radius: 12px; background: #fff; font-family: 'Inter', sans-serif; margin-bottom: 16px; outline: none; transition: border-color 0.15s; }
.onboard-input.no-margin { margin-bottom: 0; padding-left: 38px; }
.onboard-input:focus { border-color: #C97B5C; }
.input-with-icon { position: relative; display: flex; align-items: center; }
.input-with-icon svg { position: absolute; left: 13px; color: #B5AFA2; pointer-events: none; }
.onboard-btn { width: 100%; padding: 14px; background: #2B2A28; color: #FBF8F3; border: none; border-radius: 12px; font-size: 15.5px; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 6px; cursor: pointer; transition: opacity 0.15s; }
.onboard-btn.secondary { background: #F2EBDD; color: #6B6862; }
.onboard-btn:disabled { opacity: 0.35; cursor: default; }
.onboard-btn:not(:disabled):hover { opacity: 0.88; }
.onboard-note { font-size: 12.5px; color: #9A968D; margin-top: 16px; text-align: center; }
.auth-error { color: #C97B5C; font-size: 13px; margin: -6px 0 14px; }
.auth-switch { display: block; width: 100%; text-align: center; background: none; border: none; color: #8B6F5C; font-size: 13.5px; margin-top: 14px; cursor: pointer; text-decoration: underline; }
.app-header { display: flex; align-items: center; gap: 10px; padding: 18px 20px 14px; border-bottom: 1px solid #EFE9DE; position: sticky; top: 0; background: #FBF8F3; z-index: 10; }
.app-header-mark { flex-shrink: 0; }
.app-title { font-family: 'Fraunces', serif; font-size: 19px; font-weight: 600; line-height: 1.1; }
.app-subtitle { font-size: 12.5px; color: #9A968D; margin-top: 1px; }
.app-main { flex: 1; padding: 20px 20px 100px; overflow-y: auto; }
.view-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; }
.view-head h2 { font-family: 'Fraunces', serif; font-size: 22px; font-weight: 500; margin: 0; }
.add-btn { display: flex; align-items: center; gap: 5px; background: #2B2A28; color: #FBF8F3; border: none; border-radius: 20px; padding: 8px 14px; font-size: 13.5px; font-weight: 600; cursor: pointer; font-family: 'Inter', sans-serif; }
.add-btn:hover { opacity: 0.88; }
.picture-intro { font-size: 13.5px; color: #9A968D; margin: 6px 0 18px; line-height: 1.5; }
.group-label { font-size: 12px; font-weight: 600; color: #9A968D; text-transform: uppercase; letter-spacing: 0.04em; margin: 22px 0 8px 2px; }
.task-group { display: flex; flex-direction: column; gap: 8px; margin-top: 16px; }
.task-row, .expense-row { display: flex; align-items: center; gap: 12px; background: #fff; border: 1px solid #EFE9DE; border-radius: 14px; padding: 13px 14px; }
.task-row.done { opacity: 0.55; }
.task-row.done .task-title { text-decoration: line-through; }
.check-circle { width: 24px; height: 24px; border-radius: 50%; border: 2px solid #D8CFC0; background: transparent; flex-shrink: 0; display: flex; align-items: center; justify-content: center; cursor: pointer; padding: 0; }
.task-body { flex: 1; min-width: 0; }
.task-title { font-size: 14.5px; font-weight: 500; margin-bottom: 3px; }
.task-meta { display: flex; align-items: center; gap: 5px; font-size: 12px; color: #9A968D; }
.task-due, .task-recur { color: #B5AFA2; }
.row-remove { background: none; border: none; color: #C4BDB0; cursor: pointer; padding: 4px; flex-shrink: 0; }
.row-remove:hover { color: #C97B5C; }
.person-dot { border-radius: 50%; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 600; flex-shrink: 0; font-family: 'Inter', sans-serif; }
.total-strip { display: flex; justify-content: space-between; align-items: baseline; background: #F2EBDD; border-radius: 12px; padding: 14px 16px; margin-bottom: 4px; font-size: 13.5px; color: #6B6862; }
.total-strip strong { font-family: 'Fraunces', serif; font-size: 20px; color: #2B2A28; font-weight: 600; }
.expense-amount { font-weight: 600; font-size: 14.5px; font-family: 'Fraunces', serif; flex-shrink: 0; }
.fairness-list { display: flex; flex-direction: column; gap: 14px; margin-top: 16px; }
.fairness-card { background: #fff; border: 1px solid #EFE9DE; border-radius: 16px; padding: 18px; }
.fairness-head { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
.fairness-name { font-family: 'Fraunces', serif; font-size: 17px; font-weight: 500; }
.tide-row { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
.tide-track { flex: 1; height: 6px; background: #F0EBE1; border-radius: 3px; overflow: hidden; }
.tide-fill { height: 100%; border-radius: 3px; transition: width 0.4s ease; }
.tide-label { font-size: 12px; color: #9A968D; white-space: nowrap; flex-shrink: 0; }
.money-row { display: flex; align-items: center; gap: 6px; font-size: 12.5px; color: #9A968D; flex-wrap: wrap; }
.money-dot { opacity: 0.5; }
.money-net { margin-left: auto; font-weight: 600; font-size: 13px; }
.money-net.pos { color: #5C7A6B; }
.money-net.neg { color: #C97B5C; }
.family-list { display: flex; flex-direction: column; gap: 8px; margin-top: 12px; }
.family-row { display: flex; align-items: center; gap: 12px; background: #fff; border: 1px solid #EFE9DE; border-radius: 14px; padding: 12px 14px; }
.family-name-display { font-size: 15px; font-weight: 500; }
.invite-box { margin-top: 22px; padding: 16px; background: #F2EBDD; border-radius: 14px; }
.invite-box-label { font-size: 13px; font-weight: 600; color: #2B2A28; margin-bottom: 4px; }
.invite-box-body { font-size: 12.5px; color: #7A7363; line-height: 1.5; margin: 0 0 12px; }
.invite-code-row { display: flex; align-items: center; gap: 10px; }
.invite-code { font-family: 'Fraunces', serif; font-size: 18px; font-weight: 600; letter-spacing: 0.04em; background: #fff; padding: 8px 14px; border-radius: 8px; flex: 1; }
.copy-btn { display: flex; align-items: center; gap: 5px; background: #2B2A28; color: #fff; border: none; border-radius: 8px; padding: 9px 14px; font-size: 13px; font-weight: 600; cursor: pointer; }
.logout-btn { display: flex; align-items: center; justify-content: center; gap: 6px; width: 100%; margin-top: 28px; padding: 12px; background: none; border: 1px solid #E8DFD3; border-radius: 12px; color: #9A968D; font-size: 13.5px; cursor: pointer; }
.empty-state { text-align: center; padding: 50px 20px 30px; }
.empty-icon { width: 56px; height: 56px; border-radius: 50%; background: #F2EBDD; color: #C97B5C; display: flex; align-items: center; justify-content: center; margin: 0 auto 18px; }
.empty-state h3 { font-family: 'Fraunces', serif; font-size: 18px; font-weight: 500; margin: 0 0 8px; }
.empty-state p { font-size: 13.5px; color: #9A968D; line-height: 1.55; max-width: 280px; margin: 0 auto 20px; }
.empty-action { background: #2B2A28; color: #FBF8F3; border: none; border-radius: 20px; padding: 10px 20px; font-size: 13.5px; font-weight: 600; cursor: pointer; font-family: 'Inter', sans-serif; }
.tabbar { position: fixed; bottom: 0; left: 0; right: 0; max-width: 480px; margin: 0 auto; display: flex; background: #fff; border-top: 1px solid #EFE9DE; padding: 8px 4px calc(8px + env(safe-area-inset-bottom, 0px)); }
.tab { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 3px; background: none; border: none; padding: 6px 0; color: #B5AFA2; cursor: pointer; font-family: 'Inter', sans-serif; }
.tab span { font-size: 11px; font-weight: 500; }
.tab.active { color: #8B6F5C; }
.modal-backdrop { position: fixed; inset: 0; background: rgba(43, 42, 40, 0.4); display: flex; align-items: flex-end; justify-content: center; z-index: 100; }
.modal { background: #FBF8F3; width: 100%; max-width: 480px; border-radius: 20px 20px 0 0; padding: 22px 20px calc(24px + env(safe-area-inset-bottom, 0px)); max-height: 85vh; overflow-y: auto; }
.modal-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.modal-head h3 { font-family: 'Fraunces', serif; font-size: 19px; font-weight: 500; margin: 0; }
.icon-btn { background: #F2EBDD; border: none; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #6B6862; }
.modal-input { width: 100%; padding: 13px 14px; font-size: 15px; border: 1.5px solid #E8DFD3; border-radius: 12px; background: #fff; font-family: 'Inter', sans-serif; margin-bottom: 16px; outline: none; }
.modal-input:focus { border-color: #C97B5C; }
.modal-input-sm { padding: 9px 12px; font-size: 14px; border: 1.5px solid #E8DFD3; border-radius: 10px; background: #fff; font-family: 'Inter', sans-serif; outline: none; width: 140px; }
.modal-row { margin-bottom: 16px; }
.modal-label { display: block; font-size: 12.5px; font-weight: 600; color: #6B6862; margin-bottom: 8px; }
.modal-optional { font-weight: 400; color: #B5AFA2; }
.owner-pick { display: flex; flex-wrap: wrap; gap: 8px; }
.owner-chip { padding: 8px 14px; border-radius: 20px; border: 1.5px solid #E8DFD3; background: #fff; font-size: 13.5px; font-weight: 500; cursor: pointer; font-family: 'Inter', sans-serif; color: #6B6862; }
.modal-checkbox { display: flex; align-items: center; gap: 8px; font-size: 14px; color: #6B6862; margin-bottom: 18px; cursor: pointer; }
.modal-submit { width: 100%; padding: 14px; background: #2B2A28; color: #FBF8F3; border: none; border-radius: 12px; font-size: 15.5px; font-weight: 600; cursor: pointer; font-family: 'Inter', sans-serif; }
.modal-submit:disabled { opacity: 0.35; }
@media (prefers-reduced-motion: reduce) { .tide-fill { transition: none; } }
`;
