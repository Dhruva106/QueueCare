# QueueCare — Verification & Testing Documentation

**Course:** Database Management Systems (UE24CS352B) | Semester V  
**Institution:** PES University, Bangalore  
**Authors:** Pramath Ganesh Hegde (`PES2UG24CS648`) & Dhruva Ganesh Hegde (`PES2UG24CS671`)

---

## 1. Testing Strategy & Framework

Testing was conducted across four systematic levels:
1. **Automated Unit & Integration Test Suite (`npm test`)**: Direct programmatic assertion of relational schema constraints, CRUD operations, prioritization sorting rules, double-booking prevention, starvation mitigation, sequential token generation, wait-time computation, no-show/skip transitions, syllabus SQL queries, scrypt password hashing, session JWT verification, Redis caching, and Neo4j graph recommendations.
2. **Type Checking & Static Analysis (`npm run build`, `npm run lint`)**: Strict TypeScript compilation with zero `any` shortcuts, Next.js build validation across all 22 static and dynamic routes, and ESLint verification with 0 errors and 0 warnings.
3. **End-to-End Workflow Verification**: Multi-role persona switching (`Administrator`, `Doctor`, `Receptionist`, `Patient`), patient intake, real-time priority queueing, Neo4j doctor discovery with explainable graph traversal paths, physician consultation notes, and notification delivery.
4. **Relational Data Integrity Verification**: Direct SQL query assertion against foreign keys, unique constraints, and transaction state changes.

---

## 2. Automated Test Results Log

Run command:
```bash
npm test
```

### Execution Output:
```text
===============================================================================
QUEUECARE AUTOMATED INTEGRATION & UNIT TEST SUITE
Database target: /Users/dhruvag/QueueCare/queuecare/data/queuecare.db
===============================================================================

✓ [PASS] 1.1 Schema Verification: All 8 required tables exist
✓ [PASS] 1.2 Referential Integrity: Foreign key constraints are enforced
✓ [PASS] 2.1 Patient Registration: Successfully inserts patient with all demographic fields
✓ [PASS] 2.2 Constraint Enforcement: Duplicate phone numbers are rejected
✓ [PASS] 3.1 Appointment Booking: Creates scheduled appointment linked to doctor & department
✓ [PASS] 3.2 Double Booking Prevention: Detects and flags conflicting doctor appointment slots
✓ [PASS] 4.1 Emergency Triage Classification: Severe cardiac/trauma symptoms get Emergency priority
✓ [PASS] 4.2 Geriatric Priority: Patients aged 60+ receive Senior Citizen priority tier
✓ [PASS] 4.3 Pediatric Priority: Patients aged 12 and under receive Child/Infant priority tier
✓ [PASS] 4.4 Starvation Mitigation: Older waiting Normal entries gain priority weight over newer arrivals
✓ [PASS] 5.1 Sequential Token Generation: Daily doctor tokens increment monotonically
✓ [PASS] 5.2 Wait-Time Formula: Emergency receives 0 min, routine receives 15 min * patients ahead
✓ [PASS] 6.1 Queue Transitions: Check-in -> Called -> In-Consultation -> Completed
✓ [PASS] 6.2 No-Show / Skip Transition: Accurately records absence and releases queue position
✓ [PASS] 7.1 Notification Dispatch: Automated SMS/alert generated on clinical events
✓ [PASS] 7.2 Clinical Audit Logging: Tracks role, action, target entity and timestamp
✓ [PASS] 8.1 Query 7.1: GROUP BY with aggregate functions executes successfully
✓ [PASS] 8.2 Query 7.2: UPDATE with Subquery executes successfully
✓ [PASS] 8.3 Query 7.3: DELETE with Subquery executes successfully
✓ [PASS] 8.4 Query 7.4: Correlated Subquery executes and produces valid results
✓ [PASS] 8.5 Query 7.5: Nested Subquery with IN / NOT IN executes successfully
✓ [PASS] 9.1 Scrypt Hashing: Verifies password hash generation with random salt
✓ [PASS] 9.2 Password Mismatch Rejection: Incorrect password fails verification
✓ [PASS] 9.3 Session JWT Verification: HMAC-SHA256 signs and validates token integrity
✓ [PASS] 9.4 Tampered Token Rejection: Modified token payload invalidates signature
✓ [PASS] 10.1 Cache-Aside Read/Write Simulation: Cache writes and computes hit ratio
✓ [PASS] 10.2 Cache Invalidation: Mutations clear stale cache keys
✓ [PASS] 11.1 Graph Recommendation Scoring: Computes multi-factor match score
✓ [PASS] 11.2 Graph Path Traversal Format: Explains clinical relationship chain

===============================================================================
TEST SUMMARY: 29 / 29 TESTS PASSED (100% SUCCESS)
===============================================================================
```

---

## 3. Test Coverage Matrix

| Test ID | Test Category | Target Functionality | Expected Result | Actual Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-01** | Schema | Existence of 8 normalized tables | All tables present | 8 tables verified | **PASS** |
| **TC-02** | Integrity | Foreign Key constraint enforcement | Rejects orphaned records | PRAGMA FK = 1 | **PASS** |
| **TC-03** | Patient | Registration with full fields | Generates ID, sets status 'Active' | ID generated, record saved | **PASS** |
| **TC-04** | Patient | Duplicate phone check | Rejects duplicate phone numbers | Throws constraint violation | **PASS** |
| **TC-05** | Appointment| Booking creation | Persists with doctor & department | Appointment saved | **PASS** |
| **TC-06** | Appointment| Conflict detection (Double Booking) | Blocks doctor booked at same slot | Detects slot overlap | **PASS** |
| **TC-07** | Triage | Emergency keyword evaluation | Detects "chest pain", sets Tier 1 | Priority = 'Emergency' | **PASS** |
| **TC-08** | Triage | Geriatric age calculation | DOB resulting in age $\ge 60$ sets Tier 3 | Priority = 'Senior Citizen'| **PASS** |
| **TC-09** | Triage | Pediatric age calculation | DOB resulting in age $\le 12$ sets Tier 4 | Priority = 'Child/Infant' | **PASS** |
| **TC-10** | Triage | Starvation Mitigation | Waiting $> 45$ min accelerates queue weight | Effective weight boosted | **PASS** |
| **TC-11** | Queue | Sequential token generation | Doctor-specific tokens monotonic | Incrementing token numbers | **PASS** |
| **TC-12** | Queue | Dynamic wait-time computation | 15 mins/patient ahead; 0 for Emergency | Matches mathematical formula | **PASS** |
| **TC-13** | Lifecycle | State machine transitions | Waiting $\to$ Called $\to$ Consult $\to$ Done | States synchronized across tables | **PASS** |
| **TC-14** | Lifecycle | No-Show / Skip Transition | Records absence and marks entry | State = 'No-Show' | **PASS** |
| **TC-15** | Notification| Automated event dispatch | Insert logs to `notification` | Notification record created | **PASS** |
| **TC-16** | Audit | Clinical action logging | Records role, entity, and timestamp | Audit entry saved | **PASS** |
| **TC-17** | Query | Syllabus 7.1 GROUP BY & Aggregate | Computes count, avg, min, max wait | Correct grouped dataset | **PASS** |
| **TC-18** | Query | Syllabus 7.2 UPDATE with Subquery | Modifies records based on subquery | Correct affected rows | **PASS** |
| **TC-19** | Query | Syllabus 7.3 DELETE with Subquery | Deletes orphaned or cancelled data | Correct deletion | **PASS** |
| **TC-20** | Query | Syllabus 7.4 Correlated Subquery | Finds doctors earning above dept avg | Valid correlated results | **PASS** |
| **TC-21** | Query | Syllabus 7.5 Nested Subquery | Filters with `IN` and `NOT IN` | Accurate nested dataset | **PASS** |
| **TC-22** | Security | Scrypt Password Hashing | 64-byte hex hash with random salt | Constant-time match verified | **PASS** |
| **TC-23** | Security | Password Mismatch Rejection | Bad password fails comparison | Rejection verified | **PASS** |
| **TC-24** | Security | Session Token JWT Signing | HMAC-SHA256 signature verification | Valid signature matches key | **PASS** |
| **TC-25** | Security | Tampered Token Detection | Modified token payload fails | Signature mismatch rejected | **PASS** |
| **TC-26** | Cache | Redis Cache-Aside Simulation | Key miss writes; key hit serves | 50% hit ratio observed | **PASS** |
| **TC-27** | Cache | Redis Cache Invalidation | Mutations evict stale cache keys | Cache entry evicted | **PASS** |
| **TC-28** | Graph | Neo4j Multi-Factor Scoring | Calculates weighted match score | Score calculated | **PASS** |
| **TC-29** | Graph | Cypher Path Traversal Format | Explains clinical relationship chain | Graph edge path generated | **PASS** |

---

## 4. Build and Lint Verification

```bash
# Next.js 16 Webpack Production Build
npm run build
```
**Result:** 
- Successfully compiled in **~1000ms**.
- 22 production routes generated (Static prerendered + Dynamic API endpoints).
- Zero TypeScript compilation errors.

```bash
# ESLint Static Analysis
npm run lint
```
**Result:** 
- Clean exit (Code 0). Zero errors, zero warnings.
