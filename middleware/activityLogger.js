import AdminActivity from '../models/AdminActivity.js';

// Helper function to log admin activity
export const logAdminActivity = async (adminUser, action, targetType, targetId, targetName, details = {}, req = null) => {
  try {
    const activityData = {
      adminId: adminUser._id,
      adminName: adminUser.name,
      adminEmail: adminUser.email,
      action,
      targetType,
      targetId,
      targetName,
      details,
      ipAddress: req ? req.ip || req.connection.remoteAddress : null,
      userAgent: req ? req.get('User-Agent') : null
    };

    const activity = new AdminActivity(activityData);
    await activity.save();
    
    // console.log(`Admin activity logged: ${adminUser.name} performed ${action} on ${targetType} ${targetName}`);
  } catch (error) {
    console.error('Error logging admin activity:', error);
    // Don't throw error to avoid breaking the main operation
  }
};

// Middleware to automatically log activities for specific routes
export const createActivityLogger = (action, targetType) => {
  return async (req, res, next) => {
    // Store original res.json and res.status to intercept successful responses
    const originalJson = res.json;
    const originalStatus = res.status;
    
    let statusCode = 200; // Default status
    
    // Override res.status to capture status code
    res.status = function(code) {
      statusCode = code;
      return originalStatus.call(this, code);
    };
    
    res.json = function(data) {
      // Only log if the operation was successful (status < 400) and we have user info
      if (statusCode < 400 && req.user && data) {
        // Extract target information from response or request
        let targetId, targetName;
        
        if (action.includes('DELETE')) {
          // For delete operations, get info from request params
          targetId = req.params.id;
          targetName = req.deletedItemName || 'Unknown';
        } else if (data._id || data.id) {
          // For create/update operations, get info from response
          targetId = data._id || data.id;
          targetName = data.name || data.title || data.email || 'Unknown';
        } else if (req.params.id) {
          // Fallback to request params for update operations
          targetId = req.params.id;
          targetName = req.body.name || req.body.title || req.body.email || 'Unknown';
        } else if (action.includes('CREATE') && req.body) {
          // For create operations, try to get info from request body
          targetName = req.body.name || req.body.title || req.body.email || 'Unknown';
          // We'll get the ID from the response after creation
          targetId = data._id || data.id || 'Unknown';
        }

        if (targetId && targetId !== 'Unknown') {
          // Log the activity asynchronously
          setImmediate(() => {
            logAdminActivity(
              req.user,
              action,
              targetType,
              targetId,
              targetName,
              {
                requestBody: req.body,
                responseData: data
              },
              req
            );
          });
        }
      }
      
      // Call original res.json
      return originalJson.call(this, data);
    };
    
    next();
  };
};

export default { logAdminActivity, createActivityLogger };