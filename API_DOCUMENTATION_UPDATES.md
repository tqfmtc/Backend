# API Documentation Updates

## Admin Management

### Create Admin
**Endpoint:** `POST /api/admin`
**Access:** Private (Admin with 'admins' write permission)

**Description:** Create a new admin user. Supports granular permissions.

**Request Body:**
```json
{
  "name": "Admin Name",
  "email": "admin@example.com",
  "phone": "1234567890",
  "password": "password123",
  "permissions": {
    "dashboard": { "read": true, "write": false },
    "tutors": { "read": true, "write": true },
    "hadiyaCenters": { "read": true, "write": false },
    "students": { "read": true, "write": true },
    "tutorAttendance": { "read": true, "write": false },
    "guestTutors": { "read": true, "write": false },
    "announcements": { "read": true, "write": false },
    "supervisors": { "read": true, "write": false },
    "subjects": { "read": true, "write": false },
    "admins": { "read": false, "write": false }
  }
}
```

**Notes on Permissions:**
- `permissions` is an object where each key corresponds to a section of the application.
- Each section has `read` and `write` boolean flags.
- **Super Admin Logic:** To grant `admins: { write: true }`, the user **MUST** have `read: true` and `write: true` for **ALL** other sections. If this condition is met, the system will automatically set `superAdmin: true`. Otherwise, the request will fail with a 400 error.

### Update Admin
**Endpoint:** `PUT /api/admin/:id`
**Access:** Private (Admin with 'admins' write permission)

**Description:** Update an existing admin's details and permissions.

**Request Body:**
```json
{
  "name": "Updated Name",
  "permissions": {
    "dashboard": { "read": true, "write": true },
    // ... other permissions
    "admins": { "read": true, "write": true } 
  }
}
```

---

## Student Management

### Create Student
**Endpoint:** `POST /api/students`
**Access:** Private (Admin or Tutor with 'students' write permission)

**Description:** Register a new student.

**New Fields:**
- `homeAddress` (String, Required): The student's residential address. Max 200 chars.
- `schoolAddress` (String, Optional): The address of the student's school. Required if `isNonSchoolGoing` is false.

**Request Body Example:**
```json
{
  "name": "Student Name",
  "fatherName": "Father Name",
  "contact": "9876543210",
  "gender": "Male",
  "medium": "English",
  "aadharNumber": "1234 5678 9012",
  "assignedCenter": "60d5ec...",
  "homeAddress": "123 Main St, City, State",
  "isNonSchoolGoing": false,
  "schoolInfo": {
    "name": "Public School",
    "class": "10th"
  },
  "schoolAddress": "456 School Ln, City, State"
}
```

### Update Student
**Endpoint:** `PUT /api/students/:id`
**Access:** Private (Admin or Tutor with 'students' write permission)

**Description:** Update student details.

**Request Body:**
Supports all fields from Create Student, including `homeAddress` and `schoolAddress`.
