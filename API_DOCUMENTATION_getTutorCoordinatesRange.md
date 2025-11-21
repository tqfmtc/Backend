# Tutor Coordinates Range API Documentation

## Endpoint: `getTutorCoordinatesRange`

### Overview
This controller retrieves consolidated attendance coordinates for tutors across a **date range spanning multiple months**. It's useful for generating reports, visualizing tutor movements over extended periods, and analyzing attendance patterns.

### Route Information
- **HTTP Method:** `POST`
- **Endpoint:** `/api/attendance/tutor-coordinates-range`
- **Access Level:** Private/Admin Only
- **Authentication Required:** Yes (Admin role)

---

## Request Body

```json
{
  "fromMonth": 1,
  "fromYear": 2025,
  "toMonth": 3,
  "toYear": 2025,
  "tutorId": "optional_tutor_id",
  "centerId": "optional_center_id"
}
```

### Request Parameters

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `fromMonth` | Number | ✅ Yes | Starting month (1-12) | `1` |
| `fromYear` | Number | ✅ Yes | Starting year | `2025` |
| `toMonth` | Number | ✅ Yes | Ending month (1-12) | `3` |
| `toYear` | Number | ✅ Yes | Ending year | `2025` |
| `tutorId` | String | ❌ No | Filter by specific tutor ID | `"507f1f77bcf86cd799439011"` |
| `centerId` | String | ❌ No | Filter by specific center ID | `"507f1f77bcf86cd799439012"` |

---

## Response Format

### Success Response (200 OK)

```json
[
  {
    "tutor": {
      "_id": "507f1f77bcf86cd799439011",
      "name": "Ahmed Khan",
      "phone": "+923001234567"
    },
    "center": {
      "_id": "507f1f77bcf86cd799439012",
      "name": "Center Downtown"
    },
    "dateRange": {
      "from": {
        "month": 1,
        "year": 2025
      },
      "to": {
        "month": 3,
        "year": 2025
      }
    },
    "totalPoints": 45,
    "points": [
      {
        "date": "2025-01-15",
        "time": "09:30",
        "lat": 31.5204,
        "lng": 74.3587,
        "status": "present"
      },
      {
        "date": "2025-01-16",
        "time": "10:15",
        "lat": 31.5205,
        "lng": 74.3588,
        "status": "present"
      }
      // ... more coordinate points
    ]
  }
  // ... more tutors
]
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `tutor._id` | String | Unique identifier of the tutor |
| `tutor.name` | String | Tutor's full name |
| `tutor.phone` | String | Tutor's phone number |
| `center._id` | String | ID of the assigned center |
| `center.name` | String | Name of the assigned center |
| `dateRange.from` | Object | Start date of the range |
| `dateRange.to` | Object | End date of the range |
| `totalPoints` | Number | Total number of location coordinates recorded |
| `points` | Array | Array of attendance coordinate records |
| `points[].date` | String | Date in `YYYY-MM-DD` format |
| `points[].time` | String | Time in `HH:mm` format (24-hour) |
| `points[].lat` | Number | Latitude coordinate |
| `points[].lng` | Number | Longitude coordinate |
| `points[].status` | String | Attendance status (always "present" for this endpoint) |

---

## Error Responses

### 400 - Bad Request (Missing Fields)
```json
{
  "message": "Missing required fields: fromMonth, fromYear, toMonth, toYear."
}
```

### 400 - Invalid Month/Year Format
```json
{
  "message": "Invalid month or year format. Months must be 1-12."
}
```

### 403 - Unauthorized (Non-Admin User)
```json
{
  "message": "Unauthorized"
}
```

### 500 - Server Error
```json
{
  "message": "Error fetching tutor coordinates range",
  "errorDetails": "Error description"
}
```

---

## Usage Examples

### Example 1: Get all tutors' coordinates for January to March 2025
```bash
curl -X POST http://localhost:3000/api/attendance/tutor-coordinates-range \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "fromMonth": 1,
    "fromYear": 2025,
    "toMonth": 3,
    "toYear": 2025
  }'
```

### Example 2: Get specific tutor's coordinates for a range
```bash
curl -X POST http://localhost:3000/api/attendance/tutor-coordinates-range \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "fromMonth": 1,
    "fromYear": 2025,
    "toMonth": 3,
    "toYear": 2025,
    "tutorId": "507f1f77bcf86cd799439011"
  }'
```

### Example 3: Get all tutors from a specific center for the range
```bash
curl -X POST http://localhost:3000/api/attendance/tutor-coordinates-range \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "fromMonth": 1,
    "fromYear": 2025,
    "toMonth": 3,
    "toYear": 2025,
    "centerId": "507f1f77bcf86cd799439012"
  }'
```

---

## Frontend Integration Guide

### Using JavaScript/Fetch API

```javascript
async function getTutorCoordinatesRange(fromMonth, fromYear, toMonth, toYear, tutorId = null, centerId = null) {
  const payload = {
    fromMonth,
    fromYear,
    toMonth,
    toYear
  };

  if (tutorId) payload.tutorId = tutorId;
  if (centerId) payload.centerId = centerId;

  try {
    const response = await fetch('/api/attendance/tutor-coordinates-range', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching tutor coordinates:', error);
    throw error;
  }
}

// Usage
const coordinates = await getTutorCoordinatesRange(1, 2025, 3, 2025);
console.log(coordinates);
```

### Using Axios

```javascript
import axios from 'axios';

const getTutorCoordinatesRange = async (fromMonth, fromYear, toMonth, toYear, tutorId, centerId) => {
  try {
    const { data } = await axios.post(
      '/api/attendance/tutor-coordinates-range',
      {
        fromMonth,
        fromYear,
        toMonth,
        toYear,
        ...(tutorId && { tutorId }),
        ...(centerId && { centerId })
      }
    );
    return data;
  } catch (error) {
    console.error('Error:', error.response?.data?.message || error.message);
    throw error;
  }
};
```

---

## Key Features

✅ **Multi-month support** - Retrieve data across any date range  
✅ **Flexible filtering** - Filter by tutor, center, or get all  
✅ **Location tracking** - Includes lat/lng coordinates for mapping  
✅ **Time stamps** - Precise date and time for each attendance  
✅ **Consolidated view** - Single API call for extended reports  
✅ **Admin-only** - Secure access restricted to administrators  

---

## Notes for Frontend Development

1. **Date Range Validation**: Ensure `fromMonth`/`fromYear` is before or equal to `toMonth`/`toYear`
2. **Large Date Ranges**: For very large date ranges (6+ months), consider pagination or limiting results
3. **Mapping Integration**: Use the `lat`/`lng` coordinates with mapping libraries like Leaflet or Google Maps
4. **Visualization**: The `totalPoints` field helps determine data density for visualization purposes
5. **Timezone**: All timestamps are in server timezone; convert to local timezone in frontend if needed

---

## Related Endpoints

- `getTutorMonthlyCoordinates` - Get coordinates for a single month
- `getAttendanceReport` - Get attendance summary for a month
- `getRecentAttendance` - Get latest 20 attendance records
