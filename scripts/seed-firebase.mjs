import { initializeApp } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  getAuth,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { doc, getFirestore, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyBIEaal8mXM8fg1UQ8o6twVYGGhETufgKw',
  authDomain: 'ppk-praktikum-3ade8.firebaseapp.com',
  projectId: 'ppk-praktikum-3ade8',
  storageBucket: 'ppk-praktikum-3ade8.firebasestorage.app',
  messagingSenderId: '503940744413',
  appId: '1:503940744413:web:f8d832b8d37d28eb608734',
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const ACCOUNTS = [
  {
    email: 'admin@praktikum.ac.id',
    name: 'Administrator Lab',
    role: 'ADMIN',
    identifier: 'ADM-01',
    password: 'password123',
    approvalStatus: 'APPROVED',
  },
  {
    email: 'zaidan@praktikum.ac.id',
    name: 'Muhammad Zaidan Alfarizi',
    role: 'ASSISTANT',
    identifier: 'AST-01',
    password: 'password123',
    approvalStatus: 'APPROVED',
  },
  {
    email: 'bayu@praktikum.ac.id',
    name: 'Crystiano Bayu Satya Alves',
    role: 'ASSISTANT',
    identifier: 'AST-02',
    password: 'password123',
    approvalStatus: 'APPROVED',
  },
  {
    email: 'bahir@student.ac.id',
    name: 'Bahir Ananda Wibowo',
    role: 'STUDENT',
    identifier: '24060124140184',
    enrolledClasses: ['A1', 'B2', 'C1'],
    password: 'password123',
    approvalStatus: 'APPROVED',
  },
  {
    email: 'ahmad@student.ac.id',
    name: 'Ahmad Dahlan',
    role: 'STUDENT',
    identifier: '24060124140101',
    enrolledClasses: ['A1', 'C1'],
    password: 'password123',
    approvalStatus: 'APPROVED',
  },
  {
    email: 'siti@student.ac.id',
    name: 'Siti Nurhaliza',
    role: 'STUDENT',
    identifier: '24060124140102',
    enrolledClasses: ['B2', 'C1'],
    password: 'password123',
    approvalStatus: 'APPROVED',
  },
];

const CLASSES = [
  {
    id: 'class-c1',
    classCode: 'C1',
    courseName: 'Pemrograman Web & Mobile',
    room: 'Lab Komputer 2',
    assistantName: 'Muhammad Zaidan Alfarizi',
    studentIds: ['std-1', 'std-2', 'std-3', 'std-4', 'std-5'],
  },
  {
    id: 'class-b2',
    classCode: 'B2',
    courseName: 'Struktur Data & Algoritma',
    room: 'Lab Komputer 1',
    assistantName: 'Muhammad Zaidan Alfarizi',
    studentIds: ['std-1', 'std-3', 'std-4'],
  },
  {
    id: 'class-a1',
    classCode: 'A1',
    courseName: 'Basis Data Lanjut',
    room: 'Lab Basis Data',
    assistantName: 'Crystiano Bayu Satya Alves',
    studentIds: ['std-1', 'std-2', 'std-5'],
  },
];

const SESSIONS = [
  {
    id: 'session-1',
    courseName: 'Pemrograman Web & Mobile',
    classCode: 'C1',
    room: 'Lab Komputer 2',
    timeSlot: '08.00 - 10.00 WIB',
    date: new Date().toISOString(),
    status: 'NOT_STARTED',
    assistantName: 'Muhammad Zaidan Alfarizi',
    totalStudents: 30,
  },
  {
    id: 'session-2',
    courseName: 'Struktur Data & Algoritma',
    classCode: 'B2',
    room: 'Lab Komputer 1',
    timeSlot: '13.00 - 15.00 WIB',
    date: new Date(Date.now() + 86400000).toISOString(),
    status: 'NOT_STARTED',
    assistantName: 'Muhammad Zaidan Alfarizi',
    totalStudents: 32,
  },
  {
    id: 'session-3',
    courseName: 'Basis Data Lanjut',
    classCode: 'A1',
    room: 'Lab Basis Data',
    timeSlot: '10.00 - 12.00 WIB',
    date: new Date(Date.now() - 86400000).toISOString(),
    status: 'CLOSED',
    assistantName: 'Crystiano Bayu Satya Alves',
    totalStudents: 28,
  },
];

async function seed() {
  console.log('🚀 Memulai inisialisasi akun & data ke Firebase ppk-praktikum-3ade8...\n');

  let assistantZaidanUid = null;
  let assistantBayuUid = null;

  for (const acc of ACCOUNTS) {
    try {
      let uid;
      try {
        const res = await createUserWithEmailAndPassword(auth, acc.email, acc.password);
        uid = res.user.uid;
        console.log(`✅ [DAFTAR BARU] Akun dibuat: ${acc.email} (Role: ${acc.role})`);
      } catch (err) {
        if (err.code === 'auth/email-already-in-use') {
          const res = await signInWithEmailAndPassword(auth, acc.email, acc.password);
          uid = res.user.uid;
          console.log(`ℹ️ [SUDAH ADA] Akun login: ${acc.email} (Role: ${acc.role})`);
        } else {
          throw err;
        }
      }

      if (acc.email === 'zaidan@praktikum.ac.id') assistantZaidanUid = uid;
      if (acc.email === 'bayu@praktikum.ac.id') assistantBayuUid = uid;

      // Simpan profile di Firestore
      await setDoc(doc(db, 'users', uid), {
        email: acc.email,
        name: acc.name,
        role: acc.role,
        identifier: acc.identifier,
        enrolledClasses: acc.enrolledClasses || [],
        approvalStatus: acc.approvalStatus || 'APPROVED',
        createdAt: new Date().toISOString(),
      });
      console.log(`   📝 Dokumen profil Firestore users/${uid} tersimpan.`);
    } catch (err) {
      console.error(`❌ Gagal memproses ${acc.email}:`, err.message);
    }
  }

  console.log('\n📚 Mengisi data Kelas ke Firestore...');
  for (const c of CLASSES) {
    const assistantId = c.classCode === 'A1' ? (assistantBayuUid || 'ast-2') : (assistantZaidanUid || 'ast-1');
    await setDoc(doc(db, 'classes', c.id), {
      ...c,
      assistantId,
      createdAt: new Date().toISOString(),
    });
    console.log(`✅ Kelas ${c.classCode} (${c.courseName}) tersimpan.`);
  }

  console.log('\n⏰ Mengisi data Jadwal Sesi ke Firestore...');
  for (const s of SESSIONS) {
    const assistantId = s.classCode === 'A1' ? (assistantBayuUid || 'ast-2') : (assistantZaidanUid || 'ast-1');
    await setDoc(doc(db, 'sessions', s.id), {
      ...s,
      assistantId,
      createdAt: new Date().toISOString(),
    });
    console.log(`✅ Sesi ${s.classCode} (${s.courseName}) tersimpan.`);
  }

  console.log('\n📋 Mengisi data Presensi & Izin ke Firestore...');
  let bahirUid = 'mDZOvU3OiKUl037f9C1DuX5O6IH3';
  try {
    const bahirLogin = await signInWithEmailAndPassword(auth, 'bahir@student.ac.id', 'password123');
    bahirUid = bahirLogin.user.uid;
  } catch {}

  await setDoc(doc(db, 'attendance', `attendance_session-3_${bahirUid}`), {
    id: `attendance_session-3_${bahirUid}`,
    sessionId: 'session-3',
    studentId: bahirUid,
    studentName: 'Bahir Ananda Wibowo',
    studentNim: '24060124140184',
    timestamp: new Date().toISOString(),
    notes: 'Hadir praktikum Basis Data',
  });
  console.log('✅ Rekaman Presensi awal tersimpan di attendance.');

  await setDoc(doc(db, 'permits', 'permit-demo-1'), {
    id: 'permit-demo-1',
    sessionId: 'session-2',
    courseName: 'Struktur Data & Algoritma',
    studentId: bahirUid,
    studentName: 'Bahir Ananda Wibowo',
    studentNim: '24060124140184',
    reason: 'Mohon izin tidak dapat hadir karena demam tinggi dan disarankan dokter istirahat.',
    category: 'SAKIT',
    urgencyLevel: 'TINGGI',
    status: 'PENDING',
    createdAt: new Date().toISOString(),
  });
  console.log('✅ Rekaman Pengajuan Izin awal tersimpan di permits.');

  console.log('\n🎉 SEMUA DATA & AKUN BERHASIL DI-SEED KE FIREBASE CLOUD!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('\n❌ Fatal error saat seeding:', err);
  process.exit(1);
});

