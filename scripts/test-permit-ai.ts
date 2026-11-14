import { classifyPermitReason } from '../src/services/ai';
import {
  _resetPermitStore,
  getIncomingPermits,
  getStudentPermits,
  reviewPermit,
  submitPermit,
} from '../src/services/permits';

async function runTests() {
  console.log('--- STARTING FERDY SPRINT 2 INTEGRATION TESTS ---');

  // 1. Test AI Classification: SAKIT
  console.log('\n[TEST 1] AI Classification - Alasan Sakit');
  const resSakit = await classifyPermitReason('Saya sakit demam dan tifus, diopname di rumah sakit');
  console.log('Result Sakit:', resSakit);
  if (resSakit.category !== 'SAKIT' || resSakit.urgencyLevel !== 'TINGGI') {
    throw new Error('Test 1 Failed: Expected category SAKIT and urgency TINGGI');
  }
  console.log('✅ Test 1 PASSED');

  // 2. Test AI Classification: TUGAS_AKADEMIK
  console.log('\n[TEST 2] AI Classification - Tugas Akademik');
  const resAkademik = await classifyPermitReason('Menjadi delegasi universitas dalam kompetisi olimpiade sains nasional');
  console.log('Result Akademik:', resAkademik);
  if (resAkademik.category !== 'TUGAS_AKADEMIK') {
    throw new Error('Test 2 Failed: Expected category TUGAS_AKADEMIK');
  }
  console.log('✅ Test 2 PASSED');

  // 3. Test AI Classification: KEDUKAAN_URGEN
  console.log('\n[TEST 3] AI Classification - Kedukaan Urgen');
  const resDuka = await classifyPermitReason('Keluarga kami tertimpa musibah duka kakek meninggal dunia di luar kota');
  console.log('Result Duka:', resDuka);
  if (resDuka.category !== 'KEDUKAAN_URGEN') {
    throw new Error('Test 3 Failed: Expected category KEDUKAAN_URGEN');
  }
  console.log('✅ Test 3 PASSED');

  // 4. Test Service: Validation Edge Case (< 10 chars)
  console.log('\n[TEST 4] Edge Case - Alasan Terlalu Pendek (< 10 karakter)');
  const resShort = await submitPermit({
    sessionId: 'session-01',
    courseName: 'PPK',
    studentId: 'std-99',
    studentName: 'Budi Test',
    studentNim: '24060124110099',
    reason: 'Sakit',
  });
  console.log('Short Reason Response:', resShort);
  if (resShort.success) {
    throw new Error('Test 4 Failed: Submitting short reason should fail validation');
  }
  console.log('✅ Test 4 PASSED');

  // 5. Test Service: Submit Valid Permit
  console.log('\n[TEST 5] Submit Valid Permit with AI integration');
  const resValid = await submitPermit({
    sessionId: 'session-99',
    courseName: 'Praktikum Jaringan Komputer',
    studentId: 'std-99',
    studentName: 'Budi Test',
    studentNim: '24060124110099',
    reason: 'Izin tidak dapat hadir karena sedang bedrest pemulihan pasca operasi gigi bungsu',
  });
  console.log('Valid Submit Response:', resValid);
  if (!resValid.success || !resValid.permitId) {
    throw new Error('Test 5 Failed: Submit valid permit failed');
  }
  if (!resValid.data?.aiClassification || resValid.data.aiClassification.category !== 'SAKIT') {
    throw new Error('Test 5 Failed: AI classification not attached properly');
  }
  console.log('✅ Test 5 PASSED');

  // 6. Test Service: Anti-Double Permit per session
  console.log('\n[TEST 6] Edge Case - Anti-Double Permit per Session');
  const resDouble = await submitPermit({
    sessionId: 'session-99',
    courseName: 'Praktikum Jaringan Komputer',
    studentId: 'std-99',
    studentName: 'Budi Test',
    studentNim: '24060124110099',
    reason: 'Mencoba izin lagi untuk sesi yang sama',
  });
  console.log('Double Submit Response:', resDouble);
  if (resDouble.success) {
    throw new Error('Test 6 Failed: Duplicate permit submission should be blocked');
  }
  console.log('✅ Test 6 PASSED');

  // 7. Test Service: Review Permit (Approval by Assistant)
  console.log('\n[TEST 7] Assistant Review - Approve Permit with Note');
  const resReview = await reviewPermit(
    resValid.permitId,
    'APPROVED',
    'Asisten Ferdy',
    'Surat keterangan dokter terverifikasi, izin disetujui.'
  );
  console.log('Review Response:', resReview);
  if (!resReview.success) {
    throw new Error('Test 7 Failed: Review permit failed');
  }

  const studentPermits = await getStudentPermits('std-99');
  const target = studentPermits.find((p) => p.id === resValid.permitId);
  if (!target || target.status !== 'APPROVED' || target.reviewedBy !== 'Asisten Ferdy') {
    throw new Error('Test 7 Failed: Target permit status not updated properly');
  }
  console.log('✅ Test 7 PASSED');

  // 8. Test Service: Get Incoming Permits
  console.log('\n[TEST 8] Get Incoming Permits for Assistant');
  const incoming = await getIncomingPermits();
  if (incoming.length < 2) {
    throw new Error('Test 8 Failed: Expected incoming permits list');
  }
  console.log(`Total incoming permits retrieved: ${incoming.length}`);
  console.log('✅ Test 8 PASSED');

  console.log('\n🎉 ALL 8 INTEGRATION TESTS PASSED SUCCESSFULLY! 🎉\n');
}

runTests().catch((err) => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
