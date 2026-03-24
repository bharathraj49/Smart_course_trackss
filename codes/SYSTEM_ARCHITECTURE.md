# Smart Course Track - Learning Management System Architecture

## System Overview

Smart Course Track is a comprehensive Learning Management System (LMS) designed for structured, knowledge-based progression through courses. The system enforces disciplined learning pathways by ensuring students master content before advancing.

---

## 1. Core Learning Flow

### Module Structure
Each module follows this sequence:

```
┌─────────────────────────────────────────────┐
│         MODULE LEARNING JOURNEY             │
├─────────────────────────────────────────────┤
│  1. PRE-TEST (Knowledge Assessment)         │
│     ├─ Assesses baseline knowledge          │
│     ├─ Optional/Informative                 │
│     └─ Doesn't block content access         │
│                                             │
│  2. LEARNING MATERIALS                      │
│     ├─ Video Lectures                       │
│     ├─ PDF Documents                        │
│     ├─ Study Notes                          │
│     └─ All resources accessible after test  │
│                                             │
│  3. FINAL TEST (Mastery Verification)       │
│     ├─ Mandatory assessment                 │
│     ├─ Must achieve passing score (70%)     │
│     └─ Determines module completion         │
│                                             │
│  4. MODULE COMPLETION                       │
│     ├─ Certificate/Badge (optional)         │
│     └─ Unlocks next module                  │
│                                             │
│  5. REVISION LESSONS (Optional)             │
│     ├─ Available if final test fails        │
│     ├─ Supplementary materials              │
│     └─ Re-attempt final test                │
└─────────────────────────────────────────────┘
```

---

## 2. User Roles & Permissions

### Student/User Role
- **Capabilities:**
  - Browse available published courses
  - Enroll in courses (via payment)
  - Access learning materials after enrollment
  - Take pre-tests and post-tests
  - Track progress across modules
  - Access revision materials after failed attempts
  - View certificates upon course completion
  - Use code editor for practice

- **Restrictions:**
  - Cannot create courses
  - Cannot access unpublished courses
  - Cannot view other students' progress

### Instructor Role
- **Capabilities:**
  - Create and edit courses
  - Create modules with structured content
  - Design and configure assessments
  - Create pre-tests for knowledge evaluation
  - Create post-tests for mastery validation
  - Create revision materials
  - Publish/unpublish courses
  - Set pricing (minimum ₹50 for published)
  - Upload videos, PDFs, and notes
  - View student analytics and progress
  - Track course performance metrics

- **Restrictions:**
  - Cannot access student payment details
  - Cannot modify published course structure without republishing

### Admin Role
- **Capabilities:**
  - All instructor capabilities
  - Manage all users
  - Oversee system-wide analytics
  - Configure payment settings
  - Monitor course quality

---

## 3. Course Structure

### Course Entity
```javascript
{
  _id: ObjectId,
  title: String,
  description: String,
  priceInINR: Number (min: 50 for published),
  thumbnailUrl: String,
  createdBy: Reference(User),
  isPublished: Boolean,
  contents: Array<ContentItem>,
  timestamps: {
    createdAt: DateTime,
    updatedAt: DateTime
  }
}
```

### Content Item Types

#### 1. **Section** (Main Learning Module)
```javascript
{
  type: "section",
  title: String,
  lessons: Array<Lesson>,
  preTest: Quiz (optional),  // Knowledge assessment
  quiz: Quiz (mandatory),     // Final mastery test
  revisionLessons: Array<Lesson> (optional)
}
```

#### 2. **Lesson** (Learning Material)
```javascript
{
  type: "video|pdf|note",
  title: String,
  url: String,
  durationMinutes: Number (optional)
}
```

#### 3. **Quiz** (Assessment)
```javascript
{
  passMarkPercent: Number (default: 70),
  questions: Array<QuizQuestion>
}
```

#### 4. **Quiz Question**
```javascript
{
  question: String,
  options: Array<String> (min: 2),
  correctIndex: Number
}
```

---

## 4. Pre-Test Feature (Knowledge Assessment)

### Purpose
The pre-test evaluates students' baseline knowledge before accessing module materials. It helps:
- Identify knowledge gaps
- Personalize learning recommendations
- Provide diagnostic insights to instructors
- Set realistic expectations

### Configuration (Instructor Control)
Instructors can:
- Create custom questions for each module
- Set number and complexity of questions
- Determine question types (multiple choice)
- Decide if results affect content access
- Configure feedback for each answer

### Pre-Test Characteristics
- **Optional Blocker**: Does not prevent access to learning materials
- **Informative Purpose**: Primarily diagnostic
- **Score Recording**: Stored but not mandatory for progress
- **Retryable**: Students can retake before viewing materials
- **Feedback**: Can provide explanations for answers

### Pre-Test Flow
```
Student Opens Module
    ↓
Pre-Test Available? (If configured)
    ├─ YES: Take Pre-Test (optional)
    │   ├─ View Results
    │   ├─ See Performance Analysis
    │   └─ Proceed to Materials (always allowed)
    └─ NO: Direct to Learning Materials
         ↓
    Access Lessons, Videos, PDFs, Notes
         ↓
    Attempt Final Test (mandatory)
         ├─ PASS (≥70%): Module Complete ✓
         └─ FAIL (<70%): Revision Loop
              ├─ Study Revision Materials
              ├─ Retry Test
              └─ Repeat until pass
```

---

## 5. Assessment Strategy

### Pre-Test (Diagnostic)
| Aspect | Configuration |
|--------|---|
| Purpose | Knowledge evaluation |
| Block Progress | No |
| Required Score | N/A (diagnostic) |
| Retakes | Unlimited (before materials) |
| Pass/Fail | Informative only |
| Weight in Grade | None |

### Post-Test/Final Test (Summative)
| Aspect | Configuration |
|--------|---|
| Purpose | Mastery validation |
| Block Progress | Yes (must pass to continue) |
| Required Score | ≥70% (configurable) |
| Retakes | Unlimited (with revision) |
| Pass/Fail | Mandatory for progression |
| Weight in Grade | 100% |

---

## 6. Progress Tracking & Module Unlocking

### Progress States
```
MODULE STATUS TRANSITIONS

LOCKED
  ├─ Previous module not completed
  └─ User cannot access content

AVAILABLE
  ├─ Pre-requisites met
  ├─ Pre-test available (optional)
  └─ Can access learning materials

IN_PROGRESS
  ├─ Lessons accessed
  ├─ Final test not taken
  └─ Can continue learning

IN_REVISION
  ├─ Final test failed
  ├─ Revision materials available
  └─ Can retry final test

COMPLETED ✓
  ├─ Final test passed (≥70%)
  ├─ Certificate earned
  └─ Next module unlocked
```

### Module Unlock Logic
```
UNLOCK NEXT MODULE IF:
  ✓ Previous module final test passed
  ✓ Score ≥ configured passing percentage
  ✓ No prerequisite violations
```

---

## 7. Instructor Course Management

### Course Creation Workflow
```
1. Create Course
   ├─ Title
   ├─ Description
   ├─ Thumbnail
   └─ Price (₹50+ for publication)

2. Add Content Modules
   ├─ Section Title
   ├─ Add Lessons
   │  ├─ Video URL (YouTube, Vimeo, Google Drive)
   │  ├─ PDF URL
   │  └─ Study Notes
   ├─ Configure Pre-Test (optional)
   │  ├─ Add Questions
   │  ├─ Set Options
   │  └─ Indicate Correct Answer
   ├─ Configure Final Assessment (mandatory)
   │  ├─ Add Questions
   │  ├─ Set Passing Score
   │  └─ Prepare explanations
   └─ Add Revision Materials (optional)

3. Review & Publish
   ├─ Validate structure
   ├─ Set as Published
   └─ Course live for students
```

### Pre-Test Question Creation Interface
```
Question Configuration:
┌─────────────────────────────────┐
│ Question Text                   │
├─────────────────────────────────┤
│ Option A: ___________________   │ ○
│ Option B: ___________________   │ ○ (Selected)
│ Option C: ___________________   │ ○
│ Option D: ___________________   │ ○
├─────────────────────────────────┤
│ ✓ Correct Answer: Option B      │
├─────────────────────────────────┤
│ Explanation (optional):         │
│ _____________________________   │
│ _____________________________   │
└─────────────────────────────────┘
```

---

## 8. Student Learning Experience

### Dashboard
- View all enrolled courses
- See module progress (locked/available/completed)
- Quick access to in-progress modules
- Performance summary

### Course Player
1. **Pre-Test Phase** (if available)
   - Take optional pre-test
   - Review diagnostic results
   - Proceed to materials

2. **Learning Phase**
   - Access organized lessons
   - Play videos with player controls
   - Download/view PDFs
   - Read study notes
   - Use code editor for practice (if applicable)
   - Mark lessons as complete

3. **Assessment Phase**
   - Take final module test
   - View score immediately
   - Check answer explanations

4. **Resolution Phase**
   - If passed: Celebrate, unlock next module
   - If failed: Review revision materials, retry

---

## 9. Data Models

### Course Model
```javascript
{
  title: String,
  description: String,
  priceInINR: Number,
  thumbnailUrl: String,
  contents: [
    {
      type: String, // "section", "quiz", "video", "pdf", "note"
      title: String,
      url: String,
      durationMinutes: Number,
      // For sections:
      lessons: [],
      preTest: { passMarkPercent, questions },
      quiz: { passMarkPercent, questions },
      revisionLessons: []
      // For questions:
      // { question, options, correctIndex }
    }
  ],
  createdBy: ObjectId,
  isPublished: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### Enrollment Model
```javascript
{
  user: ObjectId,
  course: ObjectId,
  enrolledAt: Date,
  completionPercentage: Number,
  status: String, // "enrolled", "in_progress", "completed"
  certificationDate: Date
}
```

### Progress Model
```javascript
{
  user: ObjectId,
  course: ObjectId,
  moduleIndex: Number,
  preTestScore: Number,
  preTestTaken: Boolean,
  postTestScore: Number,
  postTestAttempts: Number,
  completedAt: Date,
  status: String // "locked", "available", "in_progress", "completed"
}
```

---

## 10. API Endpoints Summary

### Course Management
- `POST /courses` - Create course (instructor)
- `GET /courses` - List published courses
- `GET /courses/:id` - Get course details
- `PUT /courses/:id` - Update course
- `DELETE /courses/:id` - Delete course
- `POST /courses/:id/publish` - Publish course
- `POST /courses/:id/unpublish` - Unpublish course

### Assessment
- `POST /courses/:id/pretest/:moduleIdx/submit` - Submit pre-test
- `POST /courses/:id/quiz/:moduleIdx/submit` - Submit final test
- `GET /courses/:id/results/:moduleIdx` - Get assessment results

### Enrollment & Progress
- `POST /courses/:id/enroll` - Enroll in course
- `GET /courses/me/enrollments` - Get my courses
- `GET /courses/:id/progress` - Get my progress
- `PUT /courses/:id/progress` - Update progress

---

## 11. Key Features Implemented

✅ **Multi-role system** (Student, Instructor, Admin)
✅ **Structured course creation** with sections and lessons
✅ **Mandatory final assessments** with 70% passing threshold
✅ **Optional pre-tests** for knowledge evaluation
✅ **Revision materials** for failed assessments
✅ **Module progression logic** based on test scores
✅ **Student progress tracking** per module
✅ **Certificate support** upon course completion
✅ **Code practice editor** for programming courses
✅ **Multiple content types** (video, PDF, notes)
✅ **Payment integration** with Stripe
✅ **Analytics dashboard** for instructors

---

## 12. Future Enhancement Opportunities

- [ ] Adaptive learning paths based on pre-test scores
- [ ] Different assessment types (essay, practical, code)
- [ ] Discussion forums per module
- [ ] Peer review mechanisms
- [ ] Gamification (badges, leaderboards)
- [ ] Advanced analytics (learning curves, common misconceptions)
- [ ] Live instructor sessions/webinars
- [ ] Mobile app with offline access
- [ ] AI-powered personalized recommendations
- [ ] Integration with third-party tools

---

## 13. Technical Stack

### Frontend
- React 18+
- React Router v6
- Tailwind CSS
- Monaco Editor (Code Editor)
- Stripe Integration

### Backend
- Node.js + Express
- MongoDB + Mongoose
- JWT Authentication
- Stripe API

### Deployment
- Vite (Frontend build)
- Docker (containerization)
- Environment-based configuration

---

## 14. Best Practices

### For Instructors
1. **Pre-test Design**: Make pre-tests relevant but not discouraging
2. **Content Organization**: Use clear module titles and descriptions
3. **Assessment Design**: Write clear, unambiguous questions
4. **Revision Materials**: Provide focused supplementary content
5. **Pricing Strategy**: Set fair prices reflecting course quality
6. **Video Quality**: Ensure good audio/video production

### For Students
1. **Linear Progression**: Follow module order for best learning
2. **Active Learning**: Don't just watch, practice and reflect
3. **Assessment Attempt**: Prepare well before final tests
4. **Revision Discipline**: If you fail, truly understand revisions
5. **Resource Utilization**: Use all provided materials

### For Platform
1. **Security**: Validate all user inputs
2. **Performance**: Optimize video streaming
3. **Reliability**: Ensure payment transaction integrity
4. **Accessibility**: Support multiple content formats
5. **User Experience**: Keep interfaces intuitive

---

## 15. Troubleshooting Guide

### Common Issues

**Issue**: Module shows as locked but prerequisites are met
- **Solution**: Clear browser cache, refresh page, check backend progress records

**Issue**: Pre-test score not showing
- **Solution**: Verify pre-test was submitted properly, check API response

**Issue**: Final test won't let student pass
- **Solution**: Verify passing percentage configuration, check answer correctness

**Issue**: Video won't play
- **Solution**: Verify URL validity, check CORS headers, test in different browser

**Issue**: Revision materials not appearing
- **Solution**: Ensure revision_lessons array is populated, check test failure status

---

## 16. Glossary

| Term | Definition |
|------|-----------|
| **Module** | A section representing one topic/unit in a course |
| **Pre-Test** | Optional diagnostic assessment at module start |
| **Final Test** | Mandatory assessment to confirm mastery |
| **Mastery** | Achieving ≥70% on final test |
| **Revision** | Supplementary materials after test failure |
| **Progress** | Student's completion status across modules |
| **Enrollment** | Student registration in a course |
| **Certificate** | Digital proof of course completion |
| **Passing Score** | Minimum percentage to pass (default 70%) |

---

## Document Version
- **Version**: 1.0
- **Last Updated**: November 24, 2025
- **Maintained By**: Smart Course Track Development Team
