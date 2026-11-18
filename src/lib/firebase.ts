import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer,
  collection,
  query,
  where,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import type {
  LifecycleHistoryEntry,
  LifecyclePhase,
  ResearchBrief,
  SignalStrength,
  WatchlistSignal,
} from '../types/research';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null,
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
void testConnection();

export function subscribeAuth(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}

export async function signInWithGoogle(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function signOutUser(): Promise<void> {
  await signOut(auth);
}

export function sanitizeId(raw: string, prefix: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120);
  if (cleaned.length >= 2) return cleaned;
  return `${prefix}_${Date.now()}`;
}

function toIsoString(val: unknown): string {
  if (val instanceof Timestamp) {
    return val.toDate().toISOString();
  }
  if (typeof val === 'string') return val;
  return new Date().toISOString();
}

function sanitizeBriefPayload(brief: ResearchBrief, userId: string) {
  const validBriefTypes = ['trend-brief', 'market-map', 'opportunity-assessment', 'tech-scouting'];
  const validStrength = ['Weak', 'Moderate', 'Strong'];
  const validPhases = ['Emergence', 'Growth', 'Maturity', 'Decline'];

  return {
    ownerId: userId,
    topic: brief.topic.trim().slice(0, 240) || 'Untitled Trend',
    industry: brief.industry.trim().slice(0, 120) || 'General Technology',
    briefType: validBriefTypes.includes(brief.briefType) ? brief.briefType : 'trend-brief',
    signalStrength: validStrength.includes(brief.signalStrength) ? brief.signalStrength : 'Moderate',
    lifecyclePhase: validPhases.includes(brief.lifecyclePhase) ? brief.lifecyclePhase : 'Emergence',
    leadTimeMonths: (brief.leadTimeMonths || '6–12 months').slice(0, 60),
    confidencePct: Math.min(100, Math.max(0, Number(brief.confidencePct) || 75)),
    executiveSummary: (brief.executiveSummary || 'Summary pending.').slice(0, 4950),
    drivers: (brief.drivers || []).slice(0, 12).map((d) => String(d).slice(0, 580)),
    barriers: (brief.barriers || []).slice(0, 12).map((b) => String(b).slice(0, 580)),
    metrics: {
      tamUsdBillions: Number(brief.metrics?.tamUsdBillions) || 0,
      samUsdBillions: Number(brief.metrics?.samUsdBillions) || 0,
      somUsdMillions: Number(brief.metrics?.somUsdMillions) || 0,
      cagrPct: Number(brief.metrics?.cagrPct) || 0,
      sizingTimeframe: String(brief.metrics?.sizingTimeframe || '2026–2030').slice(0, 60),
      sizingConfidencePct: Math.min(100, Math.max(0, Number(brief.metrics?.sizingConfidencePct) || 75)),
      currentAdoptionPct: Math.min(100, Math.max(0, Number(brief.metrics?.currentAdoptionPct) || 5)),
      projected6mAdoptionPct: Math.min(100, Math.max(0, Number(brief.metrics?.projected6mAdoptionPct) || 10)),
      avgAcvUsd: Math.max(0, Number(brief.metrics?.avgAcvUsd) || 15000),
    },
    sections: {
      axisXLabel: String(brief.sections?.axisXLabel || 'Commercial Maturity').slice(0, 100),
      axisYLabel: String(brief.sections?.axisYLabel || 'Technical Differentiation').slice(0, 100),
      adoptionCurve: (brief.sections?.adoptionCurve || []).slice(0, 6),
      competitors: (brief.sections?.competitors || []).slice(0, 10),
      segments: (brief.sections?.segments || []).slice(0, 6),
      recommendations: (brief.sections?.recommendations || []).slice(0, 6),
      techScouting: brief.sections?.techScouting || {
        trlLevel: 6,
        patentMomentum: '',
        vcFundingSignal: '',
        openSourceActivity: '',
        regulatoryCatalyst: '',
        complianceRisk: '',
      },
    },
    sources: (brief.sources || []).slice(0, 25).map((s) => ({
      title: String(s.title || '').slice(0, 200),
      uri: String(s.uri || '').slice(0, 500),
      domain: String(s.domain || '').slice(0, 100),
    })),
    history: sanitizeHistoryEntries(brief.history, brief),
    isArchived: Boolean(brief.isArchived),
  };
}

function sanitizeHistoryEntries(
  rawHistory: LifecycleHistoryEntry[] | undefined,
  fallbackBrief: Pick<ResearchBrief, 'lifecyclePhase' | 'signalStrength' | 'metrics' | 'confidencePct' | 'updatedAt' | 'createdAt'>,
): LifecycleHistoryEntry[] {
  const validStrength: SignalStrength[] = ['Weak', 'Moderate', 'Strong'];
  const validPhases: LifecyclePhase[] = ['Emergence', 'Growth', 'Maturity', 'Decline'];

  const list = Array.isArray(rawHistory) ? rawHistory : [];
  const cleaned = list.slice(-24).map((entry) => ({
    timestamp: String(entry.timestamp || new Date().toISOString()).slice(0, 60),
    ...(entry.label ? { label: String(entry.label).slice(0, 24) } : {}),
    lifecyclePhase: validPhases.includes(entry.lifecyclePhase)
      ? entry.lifecyclePhase
      : fallbackBrief.lifecyclePhase,
    signalStrength: validStrength.includes(entry.signalStrength)
      ? entry.signalStrength
      : fallbackBrief.signalStrength,
    ...(typeof entry.adoptionPct === 'number'
      ? { adoptionPct: Math.min(100, Math.max(0, Number(entry.adoptionPct))) }
      : {}),
    ...(typeof entry.confidencePct === 'number'
      ? { confidencePct: Math.min(100, Math.max(0, Number(entry.confidencePct))) }
      : {}),
    note: String(entry.note || 'Lifecycle checkpoint recorded.').slice(0, 580),
  }));

  if (cleaned.length > 0) return cleaned;

  return [
    {
      timestamp: String(fallbackBrief.updatedAt || fallbackBrief.createdAt || new Date().toISOString()).slice(0, 60),
      lifecyclePhase: validPhases.includes(fallbackBrief.lifecyclePhase)
        ? fallbackBrief.lifecyclePhase
        : 'Emergence',
      signalStrength: validStrength.includes(fallbackBrief.signalStrength)
        ? fallbackBrief.signalStrength
        : 'Moderate',
      adoptionPct: Math.min(100, Math.max(0, Number(fallbackBrief.metrics?.currentAdoptionPct) || 5)),
      confidencePct: Math.min(100, Math.max(0, Number(fallbackBrief.confidencePct) || 75)),
      note: 'Initial dossier baseline established.',
    },
  ];
}

export function subscribeUserBriefs(
  userId: string,
  onData: (briefs: ResearchBrief[]) => void,
  onError: (err: Error) => void,
): () => void {
  const colPath = `users/${userId}/briefs`;
  const q = query(collection(db, 'users', userId, 'briefs'), where('ownerId', '==', userId));

  return onSnapshot(
    q,
    (snapshot) => {
      const items: ResearchBrief[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          ...(data as Omit<ResearchBrief, 'id' | 'createdAt' | 'updatedAt'>),
          id: d.id,
          createdAt: toIsoString(data.createdAt),
          updatedAt: toIsoString(data.updatedAt),
        };
      });
      items.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, colPath);
      } catch (e) {
        onError(e instanceof Error ? e : new Error(String(e)));
      }
    },
  );
}

export async function saveBriefToFirestore(userId: string, brief: ResearchBrief): Promise<void> {
  const safeId = sanitizeId(brief.id, 'brief');
  const docPath = `users/${userId}/briefs/${safeId}`;
  const payload = sanitizeBriefPayload(brief, userId);

  try {
    await setDoc(doc(db, 'users', userId, 'briefs', safeId), {
      ...payload,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, docPath);
  }
}

export async function toggleBriefArchiveInFirestore(
  userId: string,
  briefId: string,
  isArchived: boolean,
): Promise<void> {
  const safeId = sanitizeId(briefId, 'brief');
  const docPath = `users/${userId}/briefs/${safeId}`;
  try {
    await updateDoc(doc(db, 'users', userId, 'briefs', safeId), {
      isArchived,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, docPath);
  }
}

export async function updateBriefHistoryInFirestore(
  userId: string,
  brief: ResearchBrief,
  updates: {
    signalStrength: SignalStrength;
    lifecyclePhase: LifecyclePhase;
    history: LifecycleHistoryEntry[];
  },
): Promise<void> {
  const safeId = sanitizeId(brief.id, 'brief');
  const docPath = `users/${userId}/briefs/${safeId}`;
  const sanitizedHistory = sanitizeHistoryEntries(updates.history, {
    ...brief,
    signalStrength: updates.signalStrength,
    lifecyclePhase: updates.lifecyclePhase,
  });
  try {
    await updateDoc(doc(db, 'users', userId, 'briefs', safeId), {
      signalStrength: updates.signalStrength,
      lifecyclePhase: updates.lifecyclePhase,
      history: sanitizedHistory,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, docPath);
  }
}

export async function deleteBriefFromFirestore(userId: string, briefId: string): Promise<void> {
  const safeId = sanitizeId(briefId, 'brief');
  const docPath = `users/${userId}/briefs/${safeId}`;
  try {
    await deleteDoc(doc(db, 'users', userId, 'briefs', safeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, docPath);
  }
}

export function subscribeUserWatchlist(
  userId: string,
  onData: (signals: WatchlistSignal[]) => void,
  onError: (err: Error) => void,
): () => void {
  const colPath = `users/${userId}/watchlist`;
  const q = query(collection(db, 'users', userId, 'watchlist'), where('ownerId', '==', userId));

  return onSnapshot(
    q,
    (snapshot) => {
      const items: WatchlistSignal[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          ...(data as Omit<WatchlistSignal, 'id' | 'createdAt' | 'updatedAt'>),
          id: d.id,
          createdAt: toIsoString(data.createdAt),
          updatedAt: toIsoString(data.updatedAt),
        };
      });
      items.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, colPath);
      } catch (e) {
        onError(e instanceof Error ? e : new Error(String(e)));
      }
    },
  );
}

export async function saveWatchlistSignalToFirestore(
  userId: string,
  signal: WatchlistSignal,
): Promise<void> {
  const safeId = sanitizeId(signal.id, 'sig');
  const docPath = `users/${userId}/watchlist/${safeId}`;

  const validStrength = ['Weak', 'Moderate', 'Strong'];
  const validPhases = ['Emergence', 'Growth', 'Maturity', 'Decline'];
  const validCadences = ['Weekly', 'Monthly', 'Quarterly'];

  const payload = {
    ownerId: userId,
    topic: signal.topic.trim().slice(0, 240) || 'Monitored Signal',
    industry: signal.industry.trim().slice(0, 120) || 'Technology',
    signalStrength: validStrength.includes(signal.signalStrength) ? signal.signalStrength : 'Moderate',
    lifecyclePhase: validPhases.includes(signal.lifecyclePhase) ? signal.lifecyclePhase : 'Emergence',
    cadence: validCadences.includes(signal.cadence) ? signal.cadence : 'Weekly',
    alertThreshold: (signal.alertThreshold || 'Notify on inflection shift').slice(0, 240),
    latestDeltaNote: (signal.latestDeltaNote || 'Signal baseline established.').slice(0, 1450),
    linkedBriefId: (signal.linkedBriefId || '').slice(0, 128),
  };

  try {
    await setDoc(doc(db, 'users', userId, 'watchlist', safeId), {
      ...payload,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, docPath);
  }
}

export async function updateWatchlistDeltaInFirestore(
  userId: string,
  signalId: string,
  updates: Pick<WatchlistSignal, 'signalStrength' | 'lifecyclePhase' | 'latestDeltaNote' | 'linkedBriefId'>,
): Promise<void> {
  const safeId = sanitizeId(signalId, 'sig');
  const docPath = `users/${userId}/watchlist/${safeId}`;
  try {
    await updateDoc(doc(db, 'users', userId, 'watchlist', safeId), {
      signalStrength: updates.signalStrength,
      lifecyclePhase: updates.lifecyclePhase,
      latestDeltaNote: updates.latestDeltaNote.slice(0, 1450),
      linkedBriefId: (updates.linkedBriefId || '').slice(0, 128),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, docPath);
  }
}

export async function updateWatchlistSettingsInFirestore(
  userId: string,
  signalId: string,
  cadence: WatchlistSignal['cadence'],
  alertThreshold: string,
): Promise<void> {
  const safeId = sanitizeId(signalId, 'sig');
  const docPath = `users/${userId}/watchlist/${safeId}`;
  try {
    await updateDoc(doc(db, 'users', userId, 'watchlist', safeId), {
      cadence,
      alertThreshold: alertThreshold.slice(0, 240),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, docPath);
  }
}

export async function deleteWatchlistSignalFromFirestore(userId: string, signalId: string): Promise<void> {
  const safeId = sanitizeId(signalId, 'sig');
  const docPath = `users/${userId}/watchlist/${safeId}`;
  try {
    await deleteDoc(doc(db, 'users', userId, 'watchlist', safeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, docPath);
  }
}
