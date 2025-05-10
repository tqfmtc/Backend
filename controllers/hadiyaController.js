import Tutor from '../models/Tutor.js';
import Admin from '../models/Admin.js'; // Assuming you have an Admin model to reference paidBy
import Center from '../models/Center.js'; // For filtering by center
import mongoose from 'mongoose';

// @desc    Record a Hadiya payment for a tutor
// @route   POST /api/hadiya/record
// @access  Private/Admin
export const recordHadiyaPayment = async (req, res) => {
  try {
    const { tutorId, month, year, amountPaid, notes, update } = req.body;
    const adminId = req.user._id; // Assuming admin ID is from auth middleware

    if (!tutorId || !month || !year || amountPaid === undefined) {
      return res.status(400).json({ message: 'Tutor ID, month, year, and amount paid are required.' });
    }

    const tutor = await Tutor.findById(tutorId);
    if (!tutor) {
      return res.status(404).json({ message: 'Tutor not found' });
    }

    const paymentRecord = {
      month: parseInt(month, 10),
      year: parseInt(year, 10),
      amountPaid: parseFloat(amountPaid),
      paidBy: adminId,
      notes: notes || '',
      datePaid: new Date() // Update date when payment is modified
    };

    // Check if a record for this month and year already exists
    const existingRecordIndex = tutor.hadiyaRecords.findIndex(
      record => record.month === paymentRecord.month && record.year === paymentRecord.year
    );

    if (existingRecordIndex > -1) {
      if (update) {
        // If update flag is true, update the existing record
        tutor.hadiyaRecords[existingRecordIndex] = {
          ...tutor.hadiyaRecords[existingRecordIndex],
          amountPaid: paymentRecord.amountPaid,
          notes: paymentRecord.notes,
          datePaid: paymentRecord.datePaid,
          paidBy: paymentRecord.paidBy
        };
      } else {
        // If update flag is not true, prevent duplicate payment
        return res.status(400).json({ message: `Hadiya payment for ${month}/${year} has already been recorded for this tutor.` });
      }
    } else {
      tutor.hadiyaRecords.push(paymentRecord);
    }

    await tutor.save();
    res.status(201).json({ message: 'Hadiya payment recorded successfully', hadiyaRecord: paymentRecord });

  } catch (error) {
    console.error('Error recording Hadiya payment:', error);
    res.status(500).json({ message: 'Server error recording Hadiya payment', error: error.message });
  }
};

// @desc    Get Hadiya payment report
// @route   GET /api/hadiya/report
// @access  Private/Admin
export const getHadiyaReport = async (req, res) => {
  try {
    const { month, year, centerId, tutorId, tutorName } = req.query; // Added tutorName
    let query = {};

    // Build tutor query based on filters
    if (tutorId) {
      if (!mongoose.Types.ObjectId.isValid(tutorId)) {
        return res.status(400).json({ message: 'Invalid Tutor ID format' });
      }
      query._id = tutorId; // Specific tutor lookup takes precedence
    } else {
      // Apply other filters if not looking up by specific tutorId
      if (centerId) {
        if (!mongoose.Types.ObjectId.isValid(centerId)) {
          return res.status(400).json({ message: 'Invalid Center ID format' });
        }
        query.assignedCenter = centerId;
      }
      if (tutorName) {
        query.name = { $regex: tutorName.trim(), $options: 'i' }; // Case-insensitive search for name
      }
    }
    // If no filters, it will fetch for all tutors

    const tutors = await Tutor.find(query)
      .populate('assignedCenter', 'name')
      .select('name email phone assignedCenter assignedHadiyaAmount hadiyaRecords'); // Select necessary fields

    if (!tutors || tutors.length === 0) {
      return res.status(404).json({ message: 'No tutors found matching criteria.' });
    }

    let reportData = tutors.map(tutor => {
      let relevantRecords = tutor.hadiyaRecords;
      if (month && year) {
        const numMonth = parseInt(month, 10);
        const numYear = parseInt(year, 10);
        relevantRecords = tutor.hadiyaRecords.filter(
          record => record.month === numMonth && record.year === numYear
        );
      } else if (year) { // Filter by year only if month is not provided
        const numYear = parseInt(year, 10);
        relevantRecords = tutor.hadiyaRecords.filter(record => record.year === numYear);
      }
      // If neither month nor year, all records for the filtered tutors are taken

      // Calculate total paid for the filtered records for this tutor
      const totalPaidForTutorFiltered = relevantRecords.reduce((sum, record) => sum + record.amountPaid, 0);
      
      return {
        tutorId: tutor._id,
        tutorName: tutor.name,
        tutorEmail: tutor.email,
        tutorPhone: tutor.phone,
        assignedCenter: tutor.assignedCenter ? { _id: tutor.assignedCenter._id, name: tutor.assignedCenter.name } : {name: 'N/A'},
        assignedHadiyaAmount: tutor.assignedHadiyaAmount,
        hadiyaRecords: relevantRecords, // Records for the specified month/year or all if not specified
        totalPaidFiltered: totalPaidForTutorFiltered // Total paid for this tutor for the filtered period
      };
    });
    
    // Calculate grand total for the report
    const grandTotalPaid = reportData.reduce((sum, tutorData) => sum + tutorData.totalPaidFiltered, 0);

    res.status(200).json({ 
      report: reportData,
      grandTotalPaid: grandTotalPaid 
    });

  } catch (error) {
    console.error('Error fetching Hadiya report:', error);
    res.status(500).json({ message: 'Server error fetching Hadiya report', error: error.message });
  }
};
