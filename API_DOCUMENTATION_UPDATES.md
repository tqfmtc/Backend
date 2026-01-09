# API Documentation Updates

## Admin Management

### Create Admin
**Endpoint:** `POST /api/admin`
**Access:** Private (Admin with 'admins' write permission)
**Authentication:** Bearer token required

**Description:** Create a new admin user with granular permissions. Super Admin status is automatically assigned if admin has write access to all sections.

---

#### Request Body Structure

```json
{
  "name": "Admin Name",
  "email": "admin@example.com",
  "phone": "1234567890",
  "password": "password123",
  "permissions": {
    "dashboard": { "read": boolean, "write": boolean },
    "tutors": { "read": boolean, "write": boolean },
    "hadiya": { "read": boolean, "write": boolean },
    "centers": { "read": boolean, "write": boolean },
    "students": { "read": boolean, "write": boolean },
    "tutorAttendance": { "read": boolean, "write": boolean },
    "guestTutors": { "read": boolean, "write": boolean },
    "announcements": { "read": boolean, "write": boolean },
    "supervisors": { "read": boolean, "write": boolean },
    "subjects": { "read": boolean, "write": boolean },
    "admins": { "read": boolean, "write": boolean }
  }
}
```

---

#### Field Descriptions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | String | Yes | Admin's full name |
| email | String | Yes | Unique email address |
| phone | String | Yes | 10-digit phone number (unique) |
| password | String | Yes | Minimum 6 characters |
| permissions | Object | No | Permission configuration for each section |

---

#### Permissions Object

Each permission section has the following structure:

```json
{
  "sectionName": {
    "read": true|false,    // Can view/access this section
    "write": true|false    // Can create/update/delete in this section
  }
}
```

**Available Sections:**
- `dashboard`: Dashboard and analytics access
- `tutors`: Manage tutor records
- `hadiya`: Manage Hadiya (scholarship) payments
- `centers`: Manage study centers
- `students`: Manage student records
- `tutorAttendance`: Mark and manage tutor attendance
- `guestTutors`: Manage guest tutor requests
- `announcements`: Create and manage announcements
- `supervisors`: Manage supervisor accounts
- `subjects`: Manage subjects
- `admins`: Manage admin users and permissions

---

#### Example 1: Basic Admin (Limited Permissions)

```json
{
  "name": "John Tutor Manager",
  "email": "tutor.manager@school.com",
  "phone": "9876543210",
  "password": "securePassword123",
  "permissions": {
    "dashboard": { "read": true, "write": false },
    "tutors": { "read": true, "write": true },
    "hadiya": { "read": false, "write": false },
    "centers": { "read": true, "write": false },
    "students": { "read": true, "write": false },
    "tutorAttendance": { "read": true, "write": true },
    "guestTutors": { "read": false, "write": false },
    "announcements": { "read": true, "write": false },
    "supervisors": { "read": false, "write": false },
    "subjects": { "read": false, "write": false },
    "admins": { "read": false, "write": false }
  }
}
```

**Result:** Creates an admin who can manage tutors and attendance only.

---

#### Example 2: Full Admin (Super Admin)

```json
{
  "name": "System Administrator",
  "email": "admin@school.com",
  "phone": "9876543211",
  "password": "securePassword456",
  "permissions": {
    "dashboard": { "read": true, "write": true },
    "tutors": { "read": true, "write": true },
    "hadiya": { "read": true, "write": true },
    "centers": { "read": true, "write": true },
    "students": { "read": true, "write": true },
    "tutorAttendance": { "read": true, "write": true },
    "guestTutors": { "read": true, "write": true },
    "announcements": { "read": true, "write": true },
    "supervisors": { "read": true, "write": true },
    "subjects": { "read": true, "write": true },
    "admins": { "read": true, "write": true }
  }
}
```

**Result:** Creates a Super Admin with `superAdmin: true` automatically set. Can access and manage everything.

---

#### Example 3: Partial Admin (With Admin Read-Only)

```json
{
  "name": "Content Manager",
  "email": "content@school.com",
  "phone": "9876543212",
  "password": "securePassword789",
  "permissions": {
    "dashboard": { "read": true, "write": true },
    "tutors": { "read": true, "write": true },
    "hadiya": { "read": true, "write": true },
    "centers": { "read": true, "write": true },
    "students": { "read": true, "write": true },
    "tutorAttendance": { "read": true, "write": true },
    "guestTutors": { "read": true, "write": true },
    "announcements": { "read": true, "write": true },
    "supervisors": { "read": true, "write": true },
    "subjects": { "read": true, "write": true },
    "admins": { "read": true, "write": false }
  }
}
```

**Result:** Can view admin activities and user logs, but cannot create/modify admin accounts.

---

#### ⚠️ Important: Admin Write Permission Rules

**To grant write access to the `admins` section**, the following condition **MUST** be met:

> The admin must have **BOTH** `read: true` AND `write: true` for **ALL** other 10 sections (dashboard, tutors, hadiya, centers, students, tutorAttendance, guestTutors, announcements, supervisors, subjects).

**If this condition is NOT met:**
- The API will return a **400 Bad Request** error
- Error message: `"Cannot grant Admin Write permission unless all other permissions (Read & Write) are granted."`

**If this condition IS met:**
- The `admins.write` permission is granted
- `superAdmin` is automatically set to `true`
- This admin can manage other admin accounts

---

#### Success Response (201 Created)

```json
{
  "_id": "507f1f77bcf86cd799439011",
  "name": "John Tutor Manager",
  "email": "tutor.manager@school.com",
  "phone": "9876543210",
  "role": "admin",
  "superAdmin": false,
  "permissions": {
    "dashboard": { "read": true, "write": false },
    "tutors": { "read": true, "write": true },
    "hadiya": { "read": false, "write": false },
    "centers": { "read": true, "write": false },
    "students": { "read": true, "write": false },
    "tutorAttendance": { "read": true, "write": true },
    "guestTutors": { "read": false, "write": false },
    "announcements": { "read": true, "write": false },
    "supervisors": { "read": false, "write": false },
    "subjects": { "read": false, "write": false },
    "admins": { "read": false, "write": false }
  },
  "createdAt": "2025-12-15T10:30:00.000Z"
}
```

---

#### Error Response Examples

**400 - Invalid Admin Permissions:**
```json
{
  "message": "Cannot grant Admin Write permission unless all other permissions (Read & Write) are granted."
}
```

**400 - Email Already Exists:**
```json
{
  "message": "Admin with this email or phone already exists"
}
```

**401 - Unauthorized:**
```json
{
  "message": "Not authorized as an admin"
}
```

**403 - Insufficient Permissions:**
```json
{
  "message": "Not authorized: Missing write permission for admins"
}
```

---

### Update Admin
**Endpoint:** `PUT /api/admin/:id`
**Access:** Private (Admin with 'admins' write permission)

**Description:** Update an existing admin's details and/or permissions.

**Request Body:**
```json
{
  "name": "Updated Name",
  "email": "newemail@school.com",
  "phone": "9876543220",
  "password": "newPassword123",
  "permissions": {
    "dashboard": { "read": true, "write": true },
    "tutors": { "read": true, "write": true },
    // ... other permissions
    "admins": { "read": true, "write": true }
  }
}
```

**Notes:**
- All fields are optional
- Same permission validation rules apply as Create Admin
- If admin loses write access to all sections, `superAdmin` is automatically set to `false`

---

## Student Management

### Create Student
**Endpoint:** `POST /api/students`
**Access:** Private (Admin or Tutor with 'students' write permission)

**Description:** Register a new student.

**New Fields:**
- `homeAddress` (String, Required): The student's residential address. Max 200 chars, auto-trimmed.
- `schoolAddress` (String, Optional): The address of the student's school. Only included if `isNonSchoolGoing` is false.

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
  "homeAddress": "123 Main St, City, State - 400001",
  "isNonSchoolGoing": false,
  "schoolInfo": {
    "name": "Public School",
    "class": "10th"
  },
  "schoolAddress": "456 School Ln, City, State - 400002",
  "remarks": "Good performance"
}
```

### Update Student
**Endpoint:** `PUT /api/students/:id`
**Access:** Private (Admin or Tutor with 'students' write permission)

**Description:** Update student details.

**Request Body:**
Supports all fields from Create Student, including `homeAddress` and `schoolAddress`.
