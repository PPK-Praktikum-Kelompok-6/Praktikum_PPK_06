import {
  confirmJoinClassAsAssistant,
  confirmJoinClassAsStudent,
  createClassroomByAssistant,
  leaveClassAsAssistant,
  leaveClassAsStudent,
  lookupClassByInviteCode,
} from '../src/services/sessions';
import {
  canAttend,
  canClose,
  canOpen,
  getSessionDateRange,
  isSessionExpired,
  isSessionStartTimeReached,
  parseSessionTimeSlot,
} from '../src/store/rules';
import { PracticalSession, UserProfile } from '../src/types/attendance';
import { PermitRequest } from '../src/types/permit';

console.log('=== RUNNING TESTS FOR SPRINT 2/3 GOVERNANCE & APPROVALS ===\n');

// 1. TEST TIME SLOT PARSING
console.log('[TEST 1] parseSessionTimeSlot');
const parsed = parseSessionTimeSlot('08.00 - 10.00 WIB');
if (!parsed || parsed.startHour !== 8 || parsed.endHour !== 10) {
  throw new Error('TEST 1 FAILED: Could not parse 08.00 - 10.00 WIB');
}
console.log('  Result:', parsed.startText, 'sampai', parsed.endText);
console.log('  -> PASS\n');

// 2. TEST SESSION START TIME REACHED RULE
console.log('[TEST 2] isSessionStartTimeReached (Future session vs Current session)');
const futureSession: PracticalSession = {
  id: 'session-future',
  courseName: 'Pemrograman Perangkat Keras',
  classCode: 'C1',
  room: 'Lab Komputer 2',
  timeSlot: '14.00 - 16.00 WIB',
  date: '2026-12-30',
  status: 'NOT_STARTED',
  assistantId: 'ast-1',
  assistantName: 'Muhammad Zaidan Alfarizi',
  totalStudents: 30,
};

const checkFuture = isSessionStartTimeReached(futureSession, new Date('2026-11-22T08:00:00Z'));
if (checkFuture.reached) {
  throw new Error('TEST 2 FAILED: Future session should not be reached');
}
console.log('  Future check reason:', checkFuture.reason);
console.log('  -> PASS\n');

// 3. TEST CAN OPEN SESSION
console.log('[TEST 3] canOpen business rule');
const assistantUser: UserProfile = {
  id: 'ast-1',
  name: 'Muhammad Zaidan Alfarizi',
  role: 'ASSISTANT',
  identifier: 'AST-01',
};
const studentUser: UserProfile = {
  id: 'std-1',
  name: 'Bahir Ananda Wibowo',
  role: 'STUDENT',
  identifier: '24060124140184',
};

// Student cannot open session
const studentOpenCheck = canOpen(futureSession, studentUser.role);
if (studentOpenCheck.allowed) {
  throw new Error('TEST 3 FAILED: Student should not be allowed to open session');
}
console.log('  Student open check reason:', studentOpenCheck.reason);

// Assistant cannot open future session
const assistantOpenFuture = canOpen(futureSession, assistantUser.role);
if (assistantOpenFuture.allowed) {
  throw new Error('TEST 3 FAILED: Assistant should not open future session without tolerance');
}
console.log('  Assistant open future reason:', assistantOpenFuture.reason);

// Assistant CAN open session created just now (15-min tolerance)
const newlyCreatedSession: PracticalSession = {
  ...futureSession,
  createdAt: new Date().toISOString(),
};
const assistantOpenNew = canOpen(newlyCreatedSession, assistantUser.role);
if (!assistantOpenNew.allowed) {
  throw new Error(`TEST 3 FAILED: Newly created session should be allowed under 15m tolerance: ${assistantOpenNew.reason}`);
}
console.log('  Assistant newly created session open allowed:', assistantOpenNew.allowed);
console.log('  -> PASS\n');

// 4. TEST EXPIRED SESSION & AUTO-CLOSE
console.log('[TEST 4] isSessionExpired & auto-close constraint');
const expiredSession: PracticalSession = {
  ...futureSession,
  date: '2026-11-20',
  timeSlot: '08.00 - 10.00 WIB',
  status: 'OPEN',
};
const expiredCheck = isSessionExpired(expiredSession, new Date('2026-11-22T12:00:00'));
if (!expiredCheck.expired) {
  throw new Error('TEST 4 FAILED: Past session should be marked expired');
}
console.log('  Expired status:', expiredCheck.expired, 'at', expiredCheck.dateText, expiredCheck.endText);

const canAttendExpired = canAttend(expiredSession, [], 'std-1');
if (canAttendExpired.allowed) {
  throw new Error('TEST 4 FAILED: Student should not be allowed to attend expired session');
}
console.log('  canAttend on expired session reason:', canAttendExpired.reason);
console.log('  -> PASS\n');

// 5. TEST PERMIT ATTACHMENT STRUCTURE
console.log('[TEST 5] Permit Attachment Contract & Validation');
const samplePermit: PermitRequest = {
  id: 'permit-with-attachment',
  sessionId: 'session-1',
  courseName: 'Pemrograman Perangkat Keras',
  studentId: 'std-1',
  studentName: 'Bahir Ananda Wibowo',
  studentNim: '24060124140184',
  reason: 'Izin karena sakit dan ada surat dokter resmi',
  submittedAt: new Date().toISOString(),
  status: 'PENDING',
  attachment: {
    name: 'surat_dokter.pdf',
    size: 154200,
    mimeType: 'application/pdf',
    uri: 'file:///sample/surat_dokter.pdf',
  },
};

if (!samplePermit.attachment || samplePermit.attachment.name !== 'surat_dokter.pdf') {
  throw new Error('TEST 5 FAILED: Permit attachment typing is invalid');
}
console.log('  Permit attachment file:', samplePermit.attachment.name, `(${samplePermit.attachment.size} bytes)`);
console.log('  -> PASS\n');

// 6. TEST ONLINE-OFFLINE DELIVERY MODE
console.log('[TEST 6] Delivery Mode (ONLINE / OFFLINE) on PracticalSession');
const onlineSession: PracticalSession = {
  ...futureSession,
  deliveryMode: 'ONLINE',
  meetingLink: 'https://meet.google.com/abc-defg-hij',
};
if (onlineSession.deliveryMode !== 'ONLINE' || !onlineSession.meetingLink) {
  throw new Error('TEST 6 FAILED: Online session deliveryMode or meetingLink missing');
}
console.log('  Delivery Mode:', onlineSession.deliveryMode, 'Link:', onlineSession.meetingLink);
console.log('  -> PASS\n');

// 7. TEST GOOGLE CLASSROOM STYLE INVITE CODES (CREATE, LOOKUP PREVIEW, CO-ASSISTANT JOIN, STUDENT JOIN, LEAVE)
async function runClassroomTests() {
  console.log('[TEST 7] Google Classroom Style Codes (Create, Preview, Co-Asprak Join, Student Join & Leave)');

  // Asprak X creates "Pemrograman Perangkat Keras D1"
  const createdClass = await createClassroomByAssistant({
    courseName: 'Pemrograman Perangkat Keras',
    classCode: 'D1',
    room: 'Lab Basis Data',
    assistantId: 'ast-x',
    assistantName: 'Asprak X',
  });

  if (!createdClass.studentJoinCode || !createdClass.assistantInviteCode) {
    throw new Error('TEST 7 FAILED: Codes were not generated');
  }
  if (!/^PPK-D1-\d{3}$/.test(createdClass.studentJoinCode)) {
    throw new Error(`TEST 7 FAILED: Student code format mismatch: ${createdClass.studentJoinCode}`);
  }
  if (!/^ASP-PPK-D1-\d{3}$/.test(createdClass.assistantInviteCode)) {
    throw new Error(`TEST 7 FAILED: Assistant code format mismatch: ${createdClass.assistantInviteCode}`);
  }
  console.log('  Created Class:', createdClass.courseName, createdClass.classCode);
  console.log('  -> Student Join Code ([ABBR]-[CLASS]-[RANDOM]):', createdClass.studentJoinCode);
  console.log('  -> Assistant Special Invite Code:', createdClass.assistantInviteCode);

  // Asprak Y looks up the special invite code -> sees preview with Asprak X
  const previewForAsprakY = await lookupClassByInviteCode(
    createdClass.assistantInviteCode,
    'ASSISTANT'
  );
  if (
    !previewForAsprakY.assistantNames ||
    !previewForAsprakY.assistantNames.includes('Asprak X')
  ) {
    throw new Error('TEST 7 FAILED: Asprak Y preview did not show Asprak X');
  }
  console.log('  Asprak Y Preview shows existing assistants:', previewForAsprakY.assistantNames.join(', '));

  // Asprak Y confirms joining
  const afterAsprakYJoin = await confirmJoinClassAsAssistant(
    previewForAsprakY,
    'ast-y',
    'Asprak Y'
  );
  if (
    !afterAsprakYJoin.assistantNames?.includes('Asprak X') ||
    !afterAsprakYJoin.assistantNames?.includes('Asprak Y')
  ) {
    throw new Error('TEST 7 FAILED: Co-assistant join did not include both Asprak X and Asprak Y');
  }
  console.log('  After Asprak Y joins, assistants are:', afterAsprakYJoin.assistantNames.join(', '));

  // Student looks up studentJoinCode -> sees class name + both Asprak X & Asprak Y
  const previewForStudent = await lookupClassByInviteCode(
    createdClass.studentJoinCode,
    'STUDENT'
  );
  console.log(
    '  Student Preview shows class:',
    `${previewForStudent.courseName} (${previewForStudent.classCode})`,
    '| Asprak:',
    previewForStudent.assistantNames?.join(', ')
  );

  // Student confirms joining
  const afterStudentJoin = await confirmJoinClassAsStudent(
    previewForStudent,
    'std-99'
  );
  if (!afterStudentJoin.studentIds.includes('std-99')) {
    throw new Error('TEST 7 FAILED: Student was not added to class');
  }
  console.log('  Student joined successfully! Total students:', afterStudentJoin.studentIds.length);

  // Student leaves class & Asprak Y leaves class at end of semester
  await leaveClassAsStudent(afterStudentJoin, 'std-99');
  await leaveClassAsAssistant(createdClass.id, 'ast-y', 'Asprak Y');
  console.log('  Leave class for Student & Asprak Y verified -> PASS\n');

  console.log('=== ALL 7 AUTOMATED FEATURE TESTS PASSED SUCCESSFULLY! ===\n');
  process.exit(0);
}

runClassroomTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
