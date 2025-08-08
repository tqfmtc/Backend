import AdminActivity from '../models/AdminActivity.js';

// Helper function to format action names
const formatActionName = (action) => {
  const actionMap = {
    CREATE_TUTOR: 'Created Tutor',
    UPDATE_TUTOR: 'Updated Tutor',
    DELETE_TUTOR: 'Deleted Tutor',
    CREATE_STUDENT: 'Created Student',
    UPDATE_STUDENT: 'Updated Student',
    DELETE_STUDENT: 'Deleted Student',
    CREATE_CENTER: 'Created Center',
    UPDATE_CENTER: 'Updated Center',
    DELETE_CENTER: 'Deleted Center',
    MARK_ATTENDANCE: 'Marked Attendance',
    UPDATE_HADIYA: 'Updated Hadiya',
    CREATE_ANNOUNCEMENT: 'Created Announcement',
    UPDATE_ANNOUNCEMENT: 'Updated Announcement',
    DELETE_ANNOUNCEMENT: 'Deleted Announcement'
  };
  return actionMap[action] || action;
};

// Helper function to format JSON details into readable text
const formatDetails = (action, details, targetInfo = null) => {
  if (!details) return '';
  
  try {
    const data = typeof details === 'string' ? JSON.parse(details) : details;
    
    switch (action) {
      case 'CREATE_ADMIN':
        return `Created new admin: ${data.requestBody?.name || 'Unknown'} (${data.requestBody?.email || 'Unknown'})`;
      
      case 'UPDATE_ADMIN':
        const changes = [];
        if (data.requestBody?.password) changes.push('password');
        if (data.requestBody?.name) changes.push('name');
        if (data.requestBody?.email) changes.push('email');
        if (data.requestBody?.phone) changes.push('phone number');
        return `Updated admin ${data.responseData?.name || 'Unknown'}: Changed ${changes.join(', ')}`;
      
      case 'DELETE_ADMIN':
        return `Deleted admin: ${data.deletedAdmin?.name || 'Unknown'} (${data.deletedAdmin?.email || 'Unknown'})`;
      
      case 'DELETE_SUPERVISOR':
        return `Deleted supervisor: ${data.deletedSupervisor?.name || 'Unknown'} (${data.deletedSupervisor?.email || 'Unknown'})`;
      
      case 'CREATE_TUTOR':
        if (targetInfo) {
          return `Created new tutor: ${targetInfo.name} (${targetInfo.phone}) for ${targetInfo.center?.name || 'Unknown Center'}`;
        }
        return `Created new tutor: ${data.requestBody?.name || 'Unknown'} for ${data.requestBody?.centerName || 'Unknown Center'}`;
      
      case 'UPDATE_TUTOR':
        if (targetInfo) {
          return `Updated tutor information for: ${targetInfo.name} (${targetInfo.phone})`;
        }
        return `Updated tutor information for: ${data.responseData?.name || 'Unknown Tutor'}`;
      
      case 'DELETE_TUTOR':
        if (targetInfo) {
          return `Deleted tutor: ${targetInfo.name} (${targetInfo.phone})`;
        }
        return `Deleted tutor: ${data.deletedTutor?.name || 'Unknown'}`;
      
      case 'CREATE_CENTER':
        if (targetInfo) {
          return `Created new center: ${targetInfo.name} in ${targetInfo.area} (Sadar: ${targetInfo.sadarName})`;
        }
        return `Created new center: ${data.requestBody?.name || 'Unknown'} in ${data.requestBody?.area || 'Unknown Area'}`;
      
      case 'UPDATE_CENTER':
        if (targetInfo) {
          return `Updated center information for: ${targetInfo.name} in ${targetInfo.area}`;
        }
        return `Updated center information for: ${data.centerName || 'Unknown Center'}`;
      
      case 'DELETE_CENTER':
        if (targetInfo) {
          return `Deleted center: ${targetInfo.name} from ${targetInfo.area}`;
        }
        return `Deleted center: ${data.deletedCenter?.name || 'Unknown'}`;
      
      case 'CREATE_SUPERVISOR':
        if (targetInfo) {
          return `Created new supervisor: ${targetInfo.name} (${targetInfo.email})`;
        }
        return `Created new supervisor: ${data.requestBody?.name || 'Unknown'}`;
      
      case 'UPDATE_SUPERVISOR':
        if (targetInfo) {
          return `Updated supervisor information for: ${targetInfo.name} (${targetInfo.email})`;
        }
        return `Updated supervisor information for: ${data.responseData?.name || 'Unknown Supervisor'}`;
      
      case 'DELETE_SUPERVISOR':
        if (targetInfo) {
          return `Deleted supervisor: ${targetInfo.name} (${targetInfo.email})`;
        }
        return `Deleted supervisor: ${data.deletedSupervisor?.name || 'Unknown'}`;
      
      default:
        return action;
    }
  } catch (error) {
    console.error('Error formatting details:', error);
    return 'Action details not available';
  }
};

// Helper function to format activity descriptions
const formatActivityDescription = (action, activity) => {
  if (!activity.target) return formatActionName(action);
  
  const targetInfo = activity.target ? ` - ${activity.target}` : '';
  const detailsInfo = activity.details ? `: ${formatDetails(action, activity.details, activity.targetInfo)}` : '';
  return `${formatActionName(action)}${targetInfo}${detailsInfo}`;
};

// @desc    Get recent admin activities
// @route   GET /api/admin/activities
// @access  Admin only
export const getAdminActivities = async (req, res) => {
  try {
    const { adminId, action, targetType } = req.query;
    
    // Build filter object
    const filter = {};
    if (adminId) filter.adminId = adminId;
    if (action) filter.action = action;
    if (targetType) filter.targetType = targetType;
    
    // Get activities with populated data
    const activities = await AdminActivity.find(filter)
      .populate('adminId', 'name email phone')
      .sort({ timestamp: -1 })
      .limit(50)
      .lean();
    
    // Populate target information based on targetType
    const populatedActivities = await Promise.all(
      activities.map(async (activity) => {
        let targetInfo = null;
        
        try {
          switch (activity.targetType) {
            case 'Tutor':
              const Tutor = (await import('../models/Tutor.js')).default;
              const tutor = await Tutor.findById(activity.targetId)
                .populate('assignedCenter', 'name area')
                .lean();
              if (tutor) {
                targetInfo = {
                  id: tutor._id,
                  name: tutor.name,
                  phone: tutor.phone,
                  email: tutor.email,
                  center: tutor.assignedCenter ? {
                    name: tutor.assignedCenter.name,
                    area: tutor.assignedCenter.area
                  } : null,
                  status: tutor.status
                };
              }
              break;
              
            case 'Center':
              const Center = (await import('../models/Center.js')).default;
              const center = await Center.findById(activity.targetId).lean();
              if (center) {
                targetInfo = {
                  id: center._id,
                  name: center.name,
                  area: center.area,
                  sadarName: center.sadarName,
                  sadarContact: center.sadarContact,
                  status: center.status
                };
              }
              break;
              
            case 'Admin':
              const Admin = (await import('../models/Admin.js')).default;
              const admin = await Admin.findById(activity.targetId).lean();
              if (admin) {
                targetInfo = {
                  id: admin._id,
                  name: admin.name,
                  email: admin.email,
                  phone: admin.phone
                };
              }
              break;
              
            case 'Supervisor':
              const Supervisor = (await import('../models/Supervisor.js')).default;
              const supervisor = await Supervisor.findById(activity.targetId).lean();
              if (supervisor) {
                targetInfo = {
                  id: supervisor._id,
                  name: supervisor.name,
                  email: supervisor.email,
                  phone: supervisor.phone
                };
              }
              break;
          }
        } catch (error) {
          console.error(`Error populating ${activity.targetType} data:`, error);
        }
        
        // Format the activity description
        const description = formatActivityDescription(activity.action, {
          target: targetInfo ? targetInfo.name : activity.targetName,
          details: activity.details,
          targetInfo: targetInfo
        });
        
        return {
          _id: activity._id,
          action: activity.action,
          actionName: formatActionName(activity.action),
          targetType: activity.targetType,
          targetInfo: targetInfo,
          description: description,
          admin: {
            id: activity.adminId._id,
            name: activity.adminId.name,
            email: activity.adminId.email,
            phone: activity.adminId.phone
          },
          timestamp: activity.timestamp,
          ipAddress: activity.ipAddress,
          userAgent: activity.userAgent,
          details: activity.details
        };
      })
    );
    
    res.json(populatedActivities);
  } catch (error) {
    console.error('Error fetching admin activities:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Get activity statistics
// @route   GET /api/admin/activities/stats
// @access  Admin only
export const getActivityStats = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    
    // Get activities with populated data
    const activities = await AdminActivity.find({
      timestamp: { $gte: startDate }
    })
    .populate('adminId', 'name email phone')
    .sort({ timestamp: -1 })
    .lean();
    
    // Populate target information for each activity
    const populatedActivities = await Promise.all(
      activities.map(async (activity) => {
        let targetInfo = null;
        
        try {
          switch (activity.targetType) {
            case 'Tutor':
              const Tutor = (await import('../models/Tutor.js')).default;
              const tutor = await Tutor.findById(activity.targetId)
                .populate('assignedCenter', 'name area')
                .lean();
              if (tutor) {
                targetInfo = {
                  id: tutor._id,
                  name: tutor.name,
                  phone: tutor.phone,
                  email: tutor.email,
                  center: tutor.assignedCenter ? {
                    name: tutor.assignedCenter.name,
                    area: tutor.assignedCenter.area
                  } : null,
                  status: tutor.status
                };
              }
              break;
              
            case 'Center':
              const Center = (await import('../models/Center.js')).default;
              const center = await Center.findById(activity.targetId).lean();
              if (center) {
                targetInfo = {
                  id: center._id,
                  name: center.name,
                  area: center.area,
                  sadarName: center.sadarName,
                  sadarContact: center.sadarContact,
                  status: center.status
                };
              }
              break;
              
            case 'Admin':
              const Admin = (await import('../models/Admin.js')).default;
              const admin = await Admin.findById(activity.targetId).lean();
              if (admin) {
                targetInfo = {
                  id: admin._id,
                  name: admin.name,
                  email: admin.email,
                  phone: admin.phone
                };
              }
              break;
              
            case 'Supervisor':
              const Supervisor = (await import('../models/Supervisor.js')).default;
              const supervisor = await Supervisor.findById(activity.targetId).lean();
              if (supervisor) {
                targetInfo = {
                  id: supervisor._id,
                  name: supervisor.name,
                  email: supervisor.email,
                  phone: supervisor.phone
                };
              }
              break;
          }
        } catch (error) {
          console.error(`Error populating ${activity.targetType} data:`, error);
        }
        
        return {
          ...activity,
          targetInfo,
          admin: {
            id: activity.adminId._id,
            name: activity.adminId.name,
            email: activity.adminId.email,
            phone: activity.adminId.phone
          }
        };
      })
    );
    
    // Group by action
    const actionStats = populatedActivities.reduce((acc, activity) => {
      const action = activity.action;
      if (!acc[action]) {
        acc[action] = {
          count: 0,
          activities: []
        };
      }
      acc[action].count++;
      acc[action].activities.push({
        timestamp: activity.timestamp,
        admin: activity.admin,
        targetInfo: activity.targetInfo,
        description: formatDetails(activity.action, activity.details, activity.targetInfo)
      });
      return acc;
    }, {});
    
    // Group by admin
    const adminStats = populatedActivities.reduce((acc, activity) => {
      const adminId = activity.adminId._id.toString();
      if (!acc[adminId]) {
        acc[adminId] = {
          adminName: activity.admin.name,
          adminEmail: activity.admin.email,
          totalActions: 0,
          recentActivities: []
        };
      }
      acc[adminId].totalActions++;
      acc[adminId].recentActivities.push({
        action: activity.action,
        timestamp: activity.timestamp,
        targetInfo: activity.targetInfo,
        description: formatDetails(activity.action, activity.details, activity.targetInfo)
      });
      return acc;
    }, {});
    
    // Group by date
    const dailyStats = populatedActivities.reduce((acc, activity) => {
      const date = new Date(activity.timestamp).toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = {
          totalActivities: 0,
          topActivities: []
        };
      }
      acc[date].totalActivities++;
      acc[date].topActivities.push({
        action: activity.action,
        admin: activity.admin,
        timestamp: activity.timestamp,
        targetInfo: activity.targetInfo,
        description: formatDetails(activity.action, activity.details, activity.targetInfo)
      });
      return acc;
    }, {});
    
    // Format the data for better readability
    const formattedResponse = {
      success: true,
      data: {
        actionStatistics: Object.entries(actionStats).map(([action, stat]) => ({
          action: formatActionName(action),
          totalCount: stat.count,
          recentExamples: stat.activities
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, 5)
            .map(activity => ({
              admin: activity.admin,
              description: activity.description,
              time: new Date(activity.timestamp).toLocaleString()
            }))
        })),
        
        adminStatistics: Object.values(adminStats)
          .sort((a, b) => b.totalActions - a.totalActions)
          .map(admin => ({
            adminName: admin.adminName,
            email: admin.adminEmail,
            totalActivities: admin.totalActions,
            recentActivities: admin.recentActivities
              .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
              .slice(0, 5)
              .map(activity => ({
                description: activity.description,
                time: new Date(activity.timestamp).toLocaleString()
              }))
          })),
        
        dailyActivity: Object.entries(dailyStats)
          .sort(([a], [b]) => b.localeCompare(a))
          .map(([date, day]) => ({
            date: new Date(date).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            }),
            totalActivities: day.totalActivities,
            highlights: day.topActivities
              .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
              .slice(0, 5)
              .map(activity => ({
                admin: activity.admin,
                description: activity.description,
                time: new Date(activity.timestamp).toLocaleTimeString()
              }))
          })),
        
        period: `Last ${days} days`
      }
    };

    res.json(formattedResponse);
  
  } catch (error) {
    console.error('Error fetching activity stats:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

export default { getAdminActivities, getActivityStats };