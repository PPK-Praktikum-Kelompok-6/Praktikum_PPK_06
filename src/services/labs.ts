import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
} from 'firebase/firestore';

import { LabLocation } from '@/types/lab';
import { db, isFirebaseConfigured } from './firebase';

/**
 * Daftar lokasi default Laboratorium Departemen Informatika (Gedung E & F FSM).
 * Digunakan sebagai seed otomatis ke Cloud Firestore apabila koleksi `labs` masih kosong
 * dan sebagai fallback sinkron.
 */
export const DEFAULT_LABS: LabLocation[] = [
  {
    id: 'lab-komputer-1',
    name: 'Lab Komputer 1',
    building: 'Gedung E Lt. 2 Departemen Informatika',
    latitude: -7.04975,
    longitude: 110.44045,
    radiusMeters: 60,
    updatedBy: 'Sistem Lab Informatika',
    updatedAt: '2026-11-22T08:00:00.000Z',
  },
  {
    id: 'lab-komputer-2',
    name: 'Lab Komputer 2',
    building: 'Gedung E Lt. 2 Departemen Informatika',
    latitude: -7.04992,
    longitude: 110.44078,
    radiusMeters: 60,
    updatedBy: 'Sistem Lab Informatika',
    updatedAt: '2026-11-22T08:00:00.000Z',
  },
  {
    id: 'lab-basis-data',
    name: 'Lab Basis Data',
    building: 'Gedung E Lt. 3 Departemen Informatika',
    latitude: -7.05018,
    longitude: 110.44052,
    radiusMeters: 65,
    updatedBy: 'Sistem Lab Informatika',
    updatedAt: '2026-11-22T08:00:00.000Z',
  },
  {
    id: 'lab-jaringan',
    name: 'Lab Jaringan',
    building: 'Gedung E Lt. 3 Departemen Informatika',
    latitude: -7.04958,
    longitude: 110.44095,
    radiusMeters: 55,
    updatedBy: 'Sistem Lab Informatika',
    updatedAt: '2026-11-22T08:00:00.000Z',
  },
  {
    id: 'lab-riset-ai',
    name: 'Lab Riset & Kecerdasan Buatan',
    building: 'Gedung F Lt. 2 Departemen Informatika',
    latitude: -7.05035,
    longitude: 110.44112,
    radiusMeters: 50,
    updatedBy: 'Sistem Lab Informatika',
    updatedAt: '2026-11-22T08:00:00.000Z',
  },
];

let localLabsStore: LabLocation[] = [...DEFAULT_LABS];
const labListeners = new Set<() => void>();
let isSeedingLabs = false;

function notifyLabListeners() {
  labListeners.forEach((listener) => listener());
}

function sanitizeLabPayload(lab: LabLocation): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [k, v] of Object.entries(lab)) {
    if (v !== undefined) {
      result[k] = v;
    }
  }
  return result;
}

function mergeLabs(remoteLabs: LabLocation[]): LabLocation[] {
  const byId = new Map<string, LabLocation>();
  DEFAULT_LABS.forEach((lab) => byId.set(lab.id, lab));
  localLabsStore.forEach((lab) => byId.set(lab.id, lab));
  remoteLabs.forEach((lab) => byId.set(lab.id, lab));
  const merged = Array.from(byId.values());
  merged.sort((a, b) => a.name.localeCompare(b.name));
  localLabsStore = merged;
  return merged;
}

async function seedDefaultLabsIfNeeded(): Promise<void> {
  if (!isFirebaseConfigured || isSeedingLabs) return;
  isSeedingLabs = true;
  try {
    for (const lab of DEFAULT_LABS) {
      await setDoc(doc(db, 'labs', lab.id), sanitizeLabPayload(lab), {
        merge: true,
      });
    }
  } catch (err) {
    console.warn('Tidak dapat melakukan seed awal koleksi labs:', err);
  } finally {
    isSeedingLabs = false;
  }
}

export function getLabsSync(): LabLocation[] {
  return [...localLabsStore];
}

/**
 * Mengambil seluruh daftar laboratorium dari Firestore (seed default lab Informatika jika kosong).
 */
export async function getLabs(): Promise<LabLocation[]> {
  if (isFirebaseConfigured) {
    try {
      const snap = await getDocs(collection(db, 'labs'));
      if (snap.empty) {
        await seedDefaultLabsIfNeeded();
        return [...localLabsStore];
      }
      const remoteLabs: LabLocation[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<LabLocation, 'id'>),
      }));
      return mergeLabs(remoteLabs);
    } catch {
      // Fallback ke store lokal jika offline
    }
  }
  return [...localLabsStore];
}

/**
 * Real-time listener daftar laboratorium (SRS-S3-04 & SRS-S3-05).
 */
export function subscribeLabs(
  onUpdate: (labs: LabLocation[]) => void
): () => void {
  if (isFirebaseConfigured) {
    try {
      const q = query(collection(db, 'labs'));
      const unsubFirestore = onSnapshot(
        q,
        (snap) => {
          if (snap.empty) {
            seedDefaultLabsIfNeeded();
            onUpdate([...localLabsStore]);
            return;
          }
          const remoteLabs: LabLocation[] = snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<LabLocation, 'id'>),
          }));
          onUpdate(mergeLabs(remoteLabs));
        },
        (err) => {
          console.warn('Real-time labs listener error:', err);
          onUpdate([...localLabsStore]);
        }
      );

      const localListener = () => onUpdate([...localLabsStore]);
      labListeners.add(localListener);

      return () => {
        unsubFirestore();
        labListeners.delete(localListener);
      };
    } catch (err) {
      console.warn('Could not setup labs listener:', err);
    }
  }

  onUpdate([...localLabsStore]);
  const localListener = () => onUpdate([...localLabsStore]);
  labListeners.add(localListener);
  return () => {
    labListeners.delete(localListener);
  };
}

/**
 * Mencari data lokasi lab berdasarkan nama ruangan (`session.room`) atau ID lab.
 */
export async function getLabByRoomName(
  roomName: string
): Promise<LabLocation | null> {
  const cleaned = (roomName || '').trim().toLowerCase();
  if (!cleaned) return null;

  const labs = await getLabs();
  const exact = labs.find(
    (l) =>
      l.id.toLowerCase() === cleaned ||
      l.name.trim().toLowerCase() === cleaned
  );
  if (exact) return exact;

  const partial = labs.find(
    (l) =>
      cleaned.includes(l.name.trim().toLowerCase()) ||
      l.name.trim().toLowerCase().includes(cleaned)
  );
  return partial ?? null;
}

/**
 * Asisten menyimpan/memperbarui koordinat & radius laboratorium ke Cloud Firestore (SRS-S3-03).
 */
export async function upsertLabLocation(
  lab: Omit<LabLocation, 'updatedAt'>
): Promise<void> {
  const updatedLab: LabLocation = {
    ...lab,
    id:
      lab.id.trim() ||
      `lab-${lab.name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')}`,
    name: lab.name.trim(),
    building: lab.building.trim() || 'Gedung E Departemen Informatika',
    radiusMeters: Math.max(10, Number(lab.radiusMeters) || 50),
    updatedAt: new Date().toISOString(),
  };

  if (isFirebaseConfigured) {
    try {
      await setDoc(
        doc(db, 'labs', updatedLab.id),
        sanitizeLabPayload(updatedLab),
        { merge: true }
      );
    } catch (err) {
      console.warn('Gagal menyimpan lokasi lab ke Firestore:', err);
    }
  }

  const idx = localLabsStore.findIndex((l) => l.id === updatedLab.id);
  if (idx >= 0) {
    localLabsStore[idx] = updatedLab;
  } else {
    localLabsStore = [...localLabsStore, updatedLab];
  }
  notifyLabListeners();
}
