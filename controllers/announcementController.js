import Announcement from '../models/Announcement.js';
import asyncHandler from 'express-async-handler';

// @desc Get active announcements (current date within start & end)
// @route GET /api/announcements
// @access Public
export const getActiveAnnouncements = asyncHandler(async (req, res) => {
  const now = new Date();
  const active = await Announcement.find({
    startDate: { $lte: now },
    endDate: { $gte: now },
  }).sort({ priority: -1, createdAt: -1 });
  res.json(active);
});

// @desc Create announcement
// @route POST /api/announcements
// @access Private (admin)
export const createAnnouncement = asyncHandler(async (req, res) => {
  const { title, body, startDate, endDate, priority } = req.body;
  if (!title || !body || !startDate || !endDate) {
    return res.status(400).json({ message: 'All fields are required.' });
  }
  const announcement = await Announcement.create({ title, body, startDate, endDate, priority });
  res.status(201).json(announcement);
});

// @desc Get all announcements (admin)
export const getAllAnnouncements = asyncHandler(async (req, res) => {
  const list = await Announcement.find().sort({ createdAt: -1 });
  res.json(list);
});

// @desc Update announcement
export const updateAnnouncement = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updated = await Announcement.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });
  if (!updated) return res.status(404).json({ message: 'Not found' });
  res.json(updated);
});

// @desc Delete announcement
export const deleteAnnouncement = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const deleted = await Announcement.findByIdAndDelete(id);
  if (!deleted) return res.status(404).json({ message: 'Not found' });
  res.json({ message: 'Deleted' });
});
