import React, { useState } from 'react';
import { ChevronRight, Mail, Lock } from 'lucide-react';
import { supabase } from './supabaseClient';

const PALETTE = ['#8B6F5C', '#5C7A6B', '#C97B5C', '#7B8BA3', '#A37B8B', '#7B9C8B'];

export function AuthScreen({ onAuthed }) {
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError('');
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    if (password.length < 6) {
      setError('Password needs to be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      if (mode === 'signup') {
        const { error: signUpError } = await supabase.auth.signUp({ email: email.trim(), password });
        if (signUpError) throw signUpError;
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (signInError) throw signInError;
      }
      onAuthed();
    } catch (e) {
      setError(e.message || 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="onboard">
      <div className="onboard-card">
        <div className="onboard-mark">
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <path d="M20 33C20 33 5 24.5 5 14.5C5 9.5 9 6 13.5 6C16.5 6 18.8 7.6 20 10C21.2 7.6 23.5 6 26.5 6C31 6 35 9.5 35 14.5C35 24.5 20 33 20 33Z" fill="#C97B5C" opacity="0.9"/>
          </svg>
        </div>
        <h1>{mode === 'login' ? 'Welcome back' : 'Create your account'}</h1>
        <p className="onboard-sub">
          {mode === 'login' ? "Log in to see your family's space." : 'Takes a minute. No spam, ever.'}
        </p>

        <div className="input-with-icon">
          <Mail size={16} />
          <input
            autoFocus
            type="email"
            className="onboard-input no-margin"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
        </div>
        <div className="input-with-icon" style={{ marginTop: 10 }}>
          <Lock size={16} />
          <input
            type="password"
            className="onboard-input no-margin"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
        </div>

        {error && <p className="auth-error">{error}</p>}

        <button className="onboard-btn" style={{ marginTop: 16 }} disabled={loading} onClick={submit}>
          {loading ? 'Just a moment…' : mode === 'login' ? 'Log in' : 'Sign up'}
          {!loading && <ChevronRight size={18} />}
        </button>

        <button className="auth-switch" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); }}>
          {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Log in'}
        </button>
      </div>
    </div>
  );
}

export function FamilySetupScreen({ user, onSpaceReady }) {
  const [mode, setMode] = useState('choose'); // 'choose' | 'create' | 'join'
  const [parentName, setParentName] = useState('');
  const [yourName, setYourName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const createSpace = async () => {
    if (!parentName.trim() || !yourName.trim()) {
      setError('Fill in both fields.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { data: space, error: spaceErr } = await supabase
        .from('family_spaces')
        .insert({ parent_name: parentName.trim() })
        .select()
        .single();
      if (spaceErr) throw spaceErr;

      const { error: memberErr } = await supabase
        .from('members')
        .insert({ family_space_id: space.id, user_id: user.id, name: yourName.trim(), color: PALETTE[0] });
      if (memberErr) throw memberErr;

      onSpaceReady(space.id);
    } catch (e) {
      setError(e.message || 'Could not create the space. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const joinSpace = async () => {
    if (!inviteCode.trim() || !yourName.trim()) {
      setError('Fill in both fields.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { data: space, error: findErr } = await supabase
        .from('family_spaces')
        .select('*')
        .eq('invite_code', inviteCode.trim().toLowerCase())
        .single();
      if (findErr || !space) {
        setError("Couldn't find a family space with that code. Double check it with whoever sent it.");
        setLoading(false);
        return;
      }

      const { data: existingMembers } = await supabase
        .from('members')
        .select('color')
        .eq('family_space_id', space.id);
      const usedColors = (existingMembers || []).map((m) => m.color);
      const nextColor = PALETTE.find((c) => !usedColors.includes(c)) || PALETTE[(existingMembers?.length || 0) % PALETTE.length];

      const { error: memberErr } = await supabase
        .from('members')
        .insert({ family_space_id: space.id, user_id: user.id, name: yourName.trim(), color: nextColor });
      if (memberErr) throw memberErr;

      onSpaceReady(space.id);
    } catch (e) {
      setError(e.message || 'Could not join the space. Try again.');
    } finally {
      setLoading(false);
    }
  };

  if (mode === 'choose') {
    return (
      <div className="onboard">
        <div className="onboard-card">
          <h1>One more step.</h1>
          <p className="onboard-sub">Are you starting a new family space, or joining one a sibling already made?</p>
          <button className="onboard-btn" onClick={() => setMode('create')}>
            Start a new family space <ChevronRight size={18} />
          </button>
          <button className="onboard-btn secondary" style={{ marginTop: 10 }} onClick={() => setMode('join')}>
            Join with an invite code
          </button>
        </div>
      </div>
    );
  }

  if (mode === 'create') {
    return (
      <div className="onboard">
        <div className="onboard-card">
          <h1>Let's set up Kinly.</h1>
          <p className="onboard-sub">Who are you helping care for?</p>
          <input className="onboard-input" placeholder="Their first name" value={parentName} onChange={(e) => setParentName(e.target.value)} />
          <p className="onboard-sub">And your name?</p>
          <input className="onboard-input" placeholder="Your first name" value={yourName} onChange={(e) => setYourName(e.target.value)} />
          {error && <p className="auth-error">{error}</p>}
          <button className="onboard-btn" disabled={loading} onClick={createSpace}>
            {loading ? 'Creating…' : 'Create the space'} {!loading && <ChevronRight size={18} />}
          </button>
          <button className="auth-switch" onClick={() => setMode('choose')}>Back</button>
        </div>
      </div>
    );
  }

  return (
    <div className="onboard">
      <div className="onboard-card">
        <h1>Join your family's space.</h1>
        <p className="onboard-sub">Enter the invite code someone sent you.</p>
        <input className="onboard-input" placeholder="Invite code" value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} />
        <p className="onboard-sub">And your name?</p>
        <input className="onboard-input" placeholder="Your first name" value={yourName} onChange={(e) => setYourName(e.target.value)} />
        {error && <p className="auth-error">{error}</p>}
        <button className="onboard-btn" disabled={loading} onClick={joinSpace}>
          {loading ? 'Joining…' : 'Join'} {!loading && <ChevronRight size={18} />}
        </button>
        <button className="auth-switch" onClick={() => setMode('choose')}>Back</button>
      </div>
    </div>
  );
}
