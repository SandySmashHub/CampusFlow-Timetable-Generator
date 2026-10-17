// Automated test script for GreenSched Multilingual Chatbot & Timetable Engine
const API_BASE = 'http://localhost:3000/api';

async function postChat(query: string, batch: string = 'CS-A (3rd Year)') {
  const res = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, batch }),
  });
  if (!res.ok) {
    throw new Error(`HTTP Error ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

async function runTests() {
  console.log('🌱 Starting GreenSched Comprehensive Chatbot & Timetable Tests...\n');
  let passed = 0;
  let failed = 0;

  async function test(name: string, fn: () => Promise<void>) {
    try {
      await fn();
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`❌ [FAIL] ${name}: ${err.message}`);
      failed++;
    }
  }

  // 1. Teacher Full Weekly Schedule
  await test("Teacher full weekly schedule ('Show me Professor Sharma complete schedule')", async () => {
    const res = await postChat("Show me Professor Sharma's complete schedule");
    if (!res.answer || (!res.answer.includes('Sharma') && !res.answer.includes('Radhika'))) {
      throw new Error(`Expected teacher name in answer, got: ${res.answer}`);
    }
    const hasDetails = res.answer.includes('09:00') || res.answer.includes('DBMS') || res.answer.includes('lecture') || res.answer.includes('schedule');
    if (!hasDetails) {
      throw new Error(`Expected lecture details in answer, got: ${res.answer}`);
    }
  });

  // 2. Teacher Schedule on Specified Day (Hindi)
  await test("Teacher schedule on specified day ('Dr. Radhika Sharma ka Monday ko lecture kab hai?')", async () => {
    const res = await postChat('Dr. Radhika Sharma ka Monday ko lecture kab hai?');
    if (!res.answer.includes('Monday')) {
      throw new Error(`Expected Monday in answer, got: ${res.answer}`);
    }
    if (!res.answer.includes('Schedule') && !res.answer.includes('lecture') && !res.answer.includes('09:00')) {
      throw new Error(`Expected lecture details, got: ${res.answer}`);
    }
  });

  // 3. Ambiguous / Missing Teacher Name
  await test("Ambiguous / Missing Teacher ('Sir ka Monday ko lecture kab hai?')", async () => {
    const res = await postChat('Sir ka Monday ko lecture kab hai?');
    if (!res.answer.includes('teacher') && !res.answer.includes('faculty') && !res.answer.includes('Available')) {
      throw new Error(`Expected disambiguation question, got: ${res.answer}`);
    }
  });

  // 4. Teacher Free Slots Inquiry
  await test("Teacher free slots inquiry ('Dr. Radhika Sharma free kab hain?')", async () => {
    const res = await postChat('Dr. Radhika Sharma free kab hain?');
    if (!res.answer.includes('Free') && !res.answer.includes('free') && !res.answer.includes('available')) {
      throw new Error(`Expected free slots in answer, got: ${res.answer}`);
    }
  });

  // 5. Batch Timetable by Day (Hindi & English)
  await test("Batch timetable by day ('Mera Monday ka timetable kya hai?')", async () => {
    const res = await postChat('Mera Monday ka timetable kya hai?', 'CS-A (3rd Year)');
    if (!res.answer.includes('Monday') || !res.answer.includes('CS-A')) {
      throw new Error(`Expected Monday & CS-A in answer, got: ${res.answer}`);
    }
  });

  // 6. Complete Weekly Timetable for Batch
  await test("Complete weekly timetable for CS-B ('Show the complete weekly timetable for CS-B')", async () => {
    const res = await postChat('Show the complete weekly timetable for CS-B', 'CS-B (3rd Year)');
    if (!res.answer.includes('CS-B')) {
      throw new Error(`Expected CS-B in answer, got: ${res.answer}`);
    }
    const hasWeeklySchedule = res.answer.includes('Monday') || res.answer.includes('Networks') || res.answer.includes('lectures') || res.answer.includes('timetable');
    if (!hasWeeklySchedule) {
      throw new Error(`Expected weekly schedule details, got: ${res.answer}`);
    }
  });

  // 7. Next Lecture for Batch
  await test("Next lecture for batch ('Mera next lecture kab hai?')", async () => {
    const res = await postChat('Mera next lecture kab hai?', 'CS-A (3rd Year)');
    if (!res.answer.includes('Next') && !res.answer.includes('Lecture') && !res.answer.includes('lecture')) {
      throw new Error(`Expected next lecture info, got: ${res.answer}`);
    }
    const hasTime = res.answer.includes('Time') || res.answer.includes('Timing') || res.answer.includes('09:00');
    const hasSubject = res.answer.includes('Subject') || res.answer.includes('Database') || res.answer.includes('CS301');
    if (!hasTime || !hasSubject) {
      throw new Error(`Expected subject and time details, got: ${res.answer}`);
    }
  });

  // 8. Subject Teacher Lookup (Hindi & English)
  await test("Subject teacher lookup ('Who teaches Database Management Systems?')", async () => {
    const res = await postChat('Who teaches Database Management Systems?');
    if (!res.answer.includes('Radhika') && !res.answer.includes('Sharma')) {
      throw new Error(`Expected Dr. Radhika Sharma as instructor, got: ${res.answer}`);
    }
  });

  await test("Subject teacher lookup Hindi ('DBMS kaun padhata hai?')", async () => {
    const res = await postChat('DBMS kaun padhata hai?');
    if (!res.answer.includes('Radhika') && !res.answer.includes('Sharma')) {
      throw new Error(`Expected Dr. Radhika Sharma as instructor, got: ${res.answer}`);
    }
  });

  // 9. When is next DBMS lecture
  await test("Next subject lecture ('When is the next DBMS lecture?')", async () => {
    const res = await postChat('When is the next DBMS lecture?');
    if (!res.answer.includes('DBMS') && !res.answer.includes('Database Management Systems')) {
      throw new Error(`Expected DBMS details, got: ${res.answer}`);
    }
  });

  // 10. Room Schedule
  await test("Room schedule ('Which classes are scheduled in Room 101 today?')", async () => {
    const res = await postChat('Which classes are scheduled in Room 101 today?');
    if (!res.answer.includes('101') && !res.answer.includes('Green Hall')) {
      throw new Error(`Expected Room 101 / Green Hall in answer, got: ${res.answer}`);
    }
  });

  // 11. Room Availability at specified time
  await test("Room availability ('Which rooms are free on Monday at 11:30?')", async () => {
    const res = await postChat('Which rooms are free on Monday at 11:30?');
    if (!res.answer.includes('Free') && !res.answer.includes('Classrooms') && !res.answer.includes('rooms')) {
      throw new Error(`Expected free rooms list, got: ${res.answer}`);
    }
  });

  // 12. Timetable changes reflection after regeneration
  await test("Timetable updates after regeneration", async () => {
    // Call generate API
    const genRes = await fetch(`${API_BASE}/generate`, { method: 'POST' });
    const genData = await genRes.json();
    if (!genData.success) {
      throw new Error(`Generation failed: ${genData.error}`);
    }

    // Query chat immediately
    const res = await postChat('Mera Monday ka timetable kya hai?', 'CS-A (3rd Year)');
    if (!res.answer.includes('Monday')) {
      throw new Error(`Expected Monday schedule after regeneration, got: ${res.answer}`);
    }
  });

  console.log(`\n========================================`);
  console.log(`Test Results: ${passed} passed, ${failed} failed.`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
