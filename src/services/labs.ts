import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
} from 'firebase/firestore';

import { LabLocation } from '@/types/lab';
import { isRoomMatchingLab } from '@/utils/geo';
import { db, isFirebaseConfigured } from './firebase';

/**
 * Daftar lokasi resmi Laboratorium Informatika (Gedung E & Gedung AP).
 */
export const DEFAULT_LABS: LabLocation[] = [
  {
    id: 'lab-d',
    name: 'Lab D',
    building: 'Gedung E',
    latitude: -7.048043225501853,
    longitude: 110.44095559325535,
    radiusMeters: 50,
    updatedBy: 'Sistem Lab Informatika',
    updatedAt: '2026-11-25T08:00:00.000Z',
  },
  {
    id: 'lab-c',
    name: 'Lab C',
    building: 'Gedung E',
    latitude: -7.048275438394482,
    longitude: 110.44079360640808,
    radiusMeters: 50,
    updatedBy: 'Sistem Lab Informatika',
    updatedAt: '2026-11-25T08:00:00.000Z',
  },
  {
    id: 'lab-b',
    name: 'Lab B',
    building: 'Gedung E',
    latitude: -7.048277423119559,
    longitude: 110.4407486100616,
    radiusMeters: 50,
    updatedBy: 'Sistem Lab Informatika',
    updatedAt: '2026-11-25T08:00:00.000Z',
  },
  {
    id: 'lab-ap',
    name: 'Lab AP',
    building: 'Gedung AP',
    latitude: -7.049055499550855,
    longitude: 110.4416543631835,
    radiusMeters: 50,
    updatedBy: 'Sistem Lab Informatika',
    updatedAt: '2026-11-25T08:00:00.000Z',
  },
];

const LEGACY_LAB_IDS = new Set([
  'lab-komputer-1',
  'lab-komputer-2',
  'lab-basis-data',
  'lab-jaringan',
  'lab-riset-ai',
]);

const LEGACY_LAB_NAMES = new Set([
  'lab komputer 1',
  'lab komputer 2',
  'lab basis data',
  'lab jaringan',
  'lab riset & kecerdasan buatan',
]);

function isLegacyLab(lab: Partial<LabLocation> & { id: string }): boolean {
  if (LEGACY_LAB_IDS.has(lab.id.trim().toLowerCase())) return true;
  if (lab.name && LEGACY_LAB_NAMES.has(lab.name.trim().toLowerCase())) return true;
  return false;
}

let localLabsStore: LabLocation[] = [...DEFAULT_LABS];
const labListeners = new Set<() => void>();
let isSyncingDefaultLabs = false;
let hasCleanedLegacyLabs = false;

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

  localLabsStore.forEach((lab) => {
    if (!isLegacyLab(lab)) {
      byId.set(lab.id, lab);
    }
  });

  remoteLabs.forEach((lab) => {
    if (!isLegacyLab(lab)) {
      const defaultMatch = DEFAULT_LABS.find((d) => d.id === lab.id);
      // Pertahankan titik koordinat & gedung resmi DEFAULT_LABS untuk 4 lab utama
      if (defaultMatch) {
        byId.set(lab.id, {
          ...lab,
          name: defaultMatch.name,
          building: defaultMatch.building,
          latitude: defaultMatch.latitude,
          longitude: defaultMatch.longitude,
        });
      } else {
        byId.set(lab.id, lab);
      }
    }
  });

  const orderMap = new Map(DEFAULT_LABS.map((l, idx) => [l.id, idx]));
  const merged = Array.from(byId.values());
  merged.sort((a, b) => {
    const oa = orderMap.get(a.id) ?? 99;
    const ob = orderMap.get(b.id) ?? 99;
    if (oa !== ob) return oa - ob;
    return a.name.localeCompare(b.name);
  });

  localLabsStore = merged;
  return merged;
}

async function syncDefaultLabsAndCleanupLegacy(
  existingIds?: string[]
): Promise<void> {
  if (!isFirebaseConfigured || isSyncingDefaultLabs) return;
  isSyncingDefaultLabs = true;
  try {
    for (const lab of DEFAULT_LABS) {
      await setDoc(doc(db, 'labs', lab.id), sanitizeLabPayload(lab), {
        merge: true,
      });
    }

    if (!hasCleanedLegacyLabs) {
      const idsToRemove = existingIds
        ? existingIds.filter((id) => LEGACY_LAB_IDS.has(id.toLowerCase()))
        : Array.from(LEGACY_LAB_IDS);

      for (const oldId of idsToRemove) {
        try {
          await deleteDoc(doc(db, 'labs', oldId));
        } catch {
          // Abaikan bila dibatasi security rules untuk akun non-admin
        }
      }
      hasCleanedLegacyLabs = true;
    }
  } catch (err) {
    console.warn('Tidak dapat menyinkronkan koleksi labs:', err);
  } finally {
    isSyncingDefaultLabs = false;
  }
}

export function getLabsSync(): LabLocation[] {
  return [...localLabsStore];
}

/**
 * Mengambil seluruh daftar laboratorium dari Firestore (otomatis membersihkan lab lama & seed 4 lab resmi).
 */
export async function getLabs(): Promise<LabLocation[]> {
  if (isFirebaseConfigured) {
    try {
      const snap = await getDocs(collection(db, 'labs'));
      const docIds = snap.docs.map((d) => d.id);
      const missingNewLabs = DEFAULT_LABS.some((dl) => !docIds.includes(dl.id));
      const hasLegacyDocs = docIds.some((id) =>
        LEGACY_LAB_IDS.has(id.toLowerCase())
      );

      if (snap.empty || missingNewLabs || hasLegacyDocs) {
        void syncDefaultLabsAndCleanupLegacy(docIds);
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
          const docIds = snap.docs.map((d) => d.id);
          const missingNewLabs = DEFAULT_LABS.some(
            (dl) => !docIds.includes(dl.id)
          );
          const hasLegacyDocs = docIds.some((id) =>
            LEGACY_LAB_IDS.has(id.toLowerCase())
          );

          if (snap.empty || missingNewLabs || hasLegacyDocs) {
            void syncDefaultLabsAndCleanupLegacy(docIds);
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
  if (!(roomName || '').trim()) return null;
  const labs = await getLabs();
  const found = labs.find((l) => isRoomMatchingLab(roomName, l));
  return found ?? null;
}

/**
 * Menyimpan/memperbarui lokasi & radius laboratorium ke Cloud Firestore (SRS-S3-03).
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
    building: lab.building.trim() || 'Gedung E',
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
