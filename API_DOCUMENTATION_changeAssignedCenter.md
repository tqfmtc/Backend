# Change Student Assigned Center API Documentation

## Endpoint: Change Student's Assigned Center and Tutor

### Overview
This endpoint allows administrators to change a student's assigned center along with their assigned tutor. The tutor must belong to the specified center for the operation to succeed.

---

## HTTP Request

**Method:** `PUT`  
**URL:** `/api/students/change-center/:studentId`  
**Authentication:** Required (Admin with 'students' write permission)

---

## Request Parameters

### URL Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `studentId` | String (MongoDB ObjectId) | Yes | The ID of the student whose center is being changed |

### Request Body
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `assignedCenterId` | String (MongoDB ObjectId) | Yes | The ID of the new center to assign the student to |
| `assignedTutorId` | String (MongoDB ObjectId) | Yes | The ID of the tutor to assign the student to (must belong to the specified center) |

---

## Request Example

### Endpoint URL
```
PUT /api/students/6751234567890abcdef12345/change-center
```

### Headers
```json
{
  "Authorization": "Bearer <admin_jwt_token>",
  "Content-Type": "application/json"
}
```

### Request Body
```json
{
  "assignedCenterId": "675abcd1234567890def1234",
  "assignedTutorId": "675xyz9876543210fedcba98"
}
```

---

## Response

### Success Response

**Status Code:** `200 OK`

**Response Body:**
```json
{
  "message": "Student center and tutor updated successfully",
  "student": {
    "_id": "6751234567890abcdef12345",
    "name": "Ahmed Khan",
    "fatherName": "Mohammad Khan",
    "contact": "9876543210",
    "homeAddress": "123 Street, City",
    "gender": "Male",
    "medium": "Urdu",
    "aadharNumber": "1234 5678 9012",
    "status": "active",
    "isOrphan": false,
    "isNonSchoolGoing": false,
    "schoolInfo": {
      "name": "ABC School",
      "class": "5"
    },
    "assignedCenter": {
      "_id": "675abcd1234567890def1234",
      "name": "North Center",
      "location": "North District, City"
    },
    "assignedTutor": {
      "_id": "675xyz9876543210fedcba98",
      "name": "Fatima Ahmed",
      "contact": "9123456789",
      "email": "fatima@example.com"
    },
    "subjects": [],
    "attendance": [],
    "createdAt": "2024-12-01T10:30:00.000Z"
  }
}
```

---

## Error Responses

### 1. Missing Required Fields

**Status Code:** `400 Bad Request`

```json
{
  "message": "Both assignedCenterId and assignedTutorId are required"
}
```

### 2. Student Not Found

**Status Code:** `404 Not Found`

```json
{
  "message": "Student not found"
}
```

### 3. Center Not Found

**Status Code:** `404 Not Found`

```json
{
  "message": "Center not found"
}
```

### 4. Tutor Not Found

**Status Code:** `404 Not Found`

```json
{
  "message": "Tutor not found"
}
```

### 5. Tutor Does Not Belong to Center

**Status Code:** `400 Bad Request`

```json
{
  "message": "The specified tutor does not belong to the selected center. Please select a tutor assigned to this center."
}
```

**Description:** This error occurs when the provided tutor is assigned to a different center than the one specified in `assignedCenterId`. The system validates that tutors can only be assigned to students in their own center.

### 6. Unauthorized Access

**Status Code:** `403 Forbidden`

```json
{
  "message": "Not authorized: Missing write permission for students"
}
```

### 7. Invalid Token

**Status Code:** `401 Unauthorized`

```json
{
  "message": "Token is not valid"
}
```

### 8. Server Error

**Status Code:** `500 Internal Server Error`

```json
{
  "message": "Error message details"
}
```

---

## Business Logic

### Validation Rules

1. **Required Fields:** Both `assignedCenterId` and `assignedTutorId` must be provided
2. **Student Validation:** The student must exist in the database
3. **Center Validation:** The specified center must exist in the database
4. **Tutor Validation:** The specified tutor must exist in the database
5. **Center-Tutor Relationship:** The tutor's `assignedCenter` field must match the provided `assignedCenterId`

### Process Flow

1. Validate that both center ID and tutor ID are provided in request body
2. Find and verify the student exists
3. Find and verify the new center exists
4. Find and verify the tutor exists
5. Validate that the tutor belongs to the specified center
6. Update student's `assignedCenter` and `assignedTutor` fields
7. Save the student document
8. Populate and return the updated student with center and tutor details

---

## Use Cases

### Primary Use Case
When a student needs to be transferred from one center to another due to:
- Relocation
- Center capacity management
- Better location convenience
- Administrative reorganization

### Important Notes
- The operation updates both the center and tutor in a single atomic operation
- The system ensures data integrity by validating the center-tutor relationship
- Only administrators with write permission on students can perform this action
- The student's previous center and tutor relationships are completely replaced

---

## Frontend Implementation Guide

### React/JavaScript Example

```javascript
const changeStudentCenter = async (studentId, assignedCenterId, assignedTutorId) => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/students/${studentId}/change-center`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          assignedCenterId,
          assignedTutorId
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to change center');
    }

    console.log('Success:', data.message);
    return data.student;
  } catch (error) {
    console.error('Error changing student center:', error.message);
    throw error;
  }
};

// Usage
try {
  const updatedStudent = await changeStudentCenter(
    '6751234567890abcdef12345',  // studentId
    '675abcd1234567890def1234',   // new center ID
    '675xyz9876543210fedcba98'    // new tutor ID (must belong to new center)
  );
  
  alert('Student center changed successfully!');
} catch (error) {
  alert(`Error: ${error.message}`);
}
```

### Axios Example

```javascript
import axios from 'axios';

const changeStudentCenter = async (studentId, centerData) => {
  try {
    const response = await axios.put(
      `/api/students/${studentId}/change-center`,
      {
        assignedCenterId: centerData.centerId,
        assignedTutorId: centerData.tutorId
      },
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('adminToken')}`
        }
      }
    );

    return response.data;
  } catch (error) {
    if (error.response) {
      // Server responded with error
      throw new Error(error.response.data.message);
    } else {
      // Network or other error
      throw new Error('Network error occurred');
    }
  }
};
```

---

## Testing

### Manual Testing Steps

1. **Successful Center Change:**
   - Get a valid student ID
   - Get a valid center ID
   - Get a tutor ID that belongs to that center
   - Send PUT request with all required fields
   - Verify response shows updated center and tutor

2. **Validation Error - Tutor Not in Center:**
   - Get a valid student ID
   - Get a valid center ID
   - Get a tutor ID from a DIFFERENT center
   - Send PUT request
   - Verify error message about tutor not belonging to center

3. **Missing Fields:**
   - Send request without `assignedCenterId`
   - Send request without `assignedTutorId`
   - Verify 400 error response

### Sample Test Data

```javascript
// Test Case 1: Successful change
{
  studentId: "6751234567890abcdef12345",
  assignedCenterId: "675abcd1234567890def1234",
  assignedTutorId: "675xyz9876543210fedcba98"
}

// Test Case 2: Tutor not in center (should fail)
{
  studentId: "6751234567890abcdef12345",
  assignedCenterId: "675abcd1234567890def1234",
  assignedTutorId: "675wrong8765432fedcba98" // tutor from different center
}
```

---

## Related Endpoints

- `POST /api/students/change-assigned-tutor` - Change only the tutor (without changing center)
- `GET /api/students/:id` - Get student details
- `PUT /api/students/:id` - Update student information
- `GET /api/tutors` - Get list of all tutors (to find tutors by center)

---

## Notes for Frontend Developers

1. **Fetch Tutors by Center:** Before calling this endpoint, you should fetch the list of tutors assigned to the target center to present valid options to the user
2. **Form Validation:** Implement client-side validation to ensure both fields are selected before submission
3. **Error Handling:** Display user-friendly error messages, especially for the "tutor not in center" validation error
4. **Success Feedback:** Show confirmation message and update the UI to reflect the new center and tutor assignment
5. **Loading State:** Show loading indicator during the API call as this involves multiple database validations

---

## Version History

- **v1.0** (December 16, 2025) - Initial implementation
  - Added endpoint to change student's assigned center and tutor
  - Implemented validation for center-tutor relationship
  - Added comprehensive error handling
