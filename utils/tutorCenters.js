import mongoose from 'mongoose';
import { SESSION_TYPES, SESSION_TIMINGS } from '../models/Tutor.js';
import { calculateDistance } from './geoUtils.js';

// Helpers for tutor.assignments ([{ center, sessionType, sessionTiming }]).
// They accept populated or raw documents.

const idOf = (ref) => String(ref?._id ?? ref);

// Id strings of the centers a tutor is assigned to
export const tutorCenterIds = (tutor) =>
  (tutor?.assignments || []).filter(a => a?.center).map(a => idOf(a.center));

export const tutorHasCenter = (tutor, centerId) =>
  centerId != null && tutorCenterIds(tutor).includes(idOf(centerId));

// Populate options for the assigned centers
export const assignmentsPopulate = (select = 'name location') => ({ path: 'assignments.center', select });

// The tutor's assigned center nearest to (lat, lon), as { center, distance } in meters,
// or null if none has coordinates. Needs assignments.center populated with coordinates.
export const nearestAssignedCenter = (tutor, lat, lon) => {
  let nearest = null;
  for (const { center } of tutor?.assignments || []) {
    if (!Array.isArray(center?.coordinates) || center.coordinates.length !== 2) continue;
    const distance = calculateDistance(lat, lon, center.coordinates[0], center.coordinates[1]);
    if (!nearest || distance < nearest.distance) nearest = { center, distance };
  }
  return nearest;
};

// Single-center fields for clients built before tutors could have several centers
// (mobile app <= 3.1.1 reads assignedCenter from the login response)
export const legacyCenterFields = (tutor) => {
  const first = tutor?.assignments?.[0];
  return {
    assignedCenter: first?.center ?? null,
    sessionType: first?.sessionType,
    sessionTiming: first?.sessionTiming,
    centerName: first?.center?.name || 'Unknown Center'
  };
};

// Read `assignments` from a request body. Multipart forms send it as a JSON string.
// Returns { assignments } on success, { error } on bad input, or null when not provided.
export const parseAssignments = (body) => {
  let list = body?.assignments;
  if (list === undefined || list === null || list === '') return null;
  if (typeof list === 'string') {
    try {
      list = JSON.parse(list);
    } catch {
      return { error: 'assignments must be a JSON array' };
    }
  }
  if (!Array.isArray(list) || list.length === 0) {
    return { error: 'At least one center assignment is required' };
  }

  const assignments = [];
  const seen = new Set();
  for (const item of list) {
    const center = idOf(item?.center);
    if (!mongoose.Types.ObjectId.isValid(center)) {
      return { error: `Invalid center ID: ${center}` };
    }
    if (!SESSION_TYPES.includes(item.sessionType)) {
      return { error: `Invalid session type: ${item.sessionType}` };
    }
    if (!SESSION_TIMINGS.includes(item.sessionTiming)) {
      return { error: `Invalid session timing: ${item.sessionTiming}` };
    }
    if (seen.has(center)) {
      return { error: 'A tutor can be assigned to each center only once' };
    }
    seen.add(center);
    assignments.push({ center, sessionType: item.sessionType, sessionTiming: item.sessionTiming });
  }
  return { assignments };
};
