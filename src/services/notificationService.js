const Notification = require('../models/Notification');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');

/**
 * Create a new notification
 */
const createNotification = async (notificationData) => {
  const notification = await Notification.create(notificationData);
  return notification;
};

/**
 * Get notifications for a user
 */
const getNotifications = async (userId, options = {}) => {
  const { 
    page = 1, 
    limit = 20, 
    unreadOnly = false,
    type 
  } = options;
  
  const skip = (page - 1) * limit;

  const query = { user: userId };
  
  if (unreadOnly) {
    query.isRead = false;
  }
  
  if (type) {
    query.type = type;
  }

  const notifications = await Notification.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Notification.countDocuments(query);
  const unreadCount = await Notification.countDocuments({ 
    user: userId, 
    isRead: false 
  });

  return {
    notifications,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    },
    unreadCount
  };
};

/**
 * Mark notification as read
 */
const markAsRead = async (notificationId, userId) => {
  const notification = await Notification.findOne({
    _id: notificationId,
    user: userId
  });

  if (!notification) {
    throw new ApiError(404, 'Notification not found.');
  }

  notification.isRead = true;
  notification.readAt = new Date();
  await notification.save();

  return notification;
};

/**
 * Mark all notifications as read
 */
const markAllAsRead = async (userId) => {
  const result = await Notification.updateMany(
    { user: userId, isRead: false },
    { isRead: true, readAt: new Date() }
  );

  return {
    message: 'All notifications marked as read.',
    modifiedCount: result.modifiedCount
  };
};

/**
 * Delete notification
 */
const deleteNotification = async (notificationId, userId) => {
  const notification = await Notification.findOneAndDelete({
    _id: notificationId,
    user: userId
  });

  if (!notification) {
    throw new ApiError(404, 'Notification not found.');
  }

  return { message: 'Notification deleted.' };
};

/**
 * Clear all notifications
 */
const clearAllNotifications = async (userId) => {
  await Notification.deleteMany({ user: userId });
  return { message: 'All notifications cleared.' };
};

/**
 * Get unread count
 */
const getUnreadCount = async (userId) => {
  const count = await Notification.countDocuments({
    user: userId,
    isRead: false
  });
  return { unreadCount: count };
};

/**
 * Send push notification (placeholder for push notification integration)
 */
const sendPushNotification = async (userId, title, message, data = {}) => {
  const user = await User.findById(userId).select('deviceTokens');

  if (!user || !user.deviceTokens || user.deviceTokens.length === 0) {
    console.log('No device tokens found for user');
    return { success: false, message: 'No device tokens found' };
  }

  // Placeholder for actual push notification implementation
  // In production, integrate with FCM (Firebase Cloud Messaging) or similar
  
  // Example FCM implementation:
  // const message = {
  //   notification: { title, body: message },
  //   data: { ...data },
  //   tokens: user.deviceTokens
  // };
  // await admin.messaging().sendMulticast(message);

  console.log(`Push notification sent to user ${userId}: ${title} - ${message}`);
  
  return { 
    success: true, 
    sentTo: user.deviceTokens.length 
  };
};

/**
 * Save device token for push notifications
 */
const saveDeviceToken = async (userId, token, platform) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new ApiError(404, 'User not found.');
  }

  // Check if token already exists
  const existingToken = user.deviceTokens?.find(t => t.token === token);

  if (existingToken) {
    // Update last used
    existingToken.lastUsed = new Date();
  } else {
    // Add new token
    if (!user.deviceTokens) {
      user.deviceTokens = [];
    }
    user.deviceTokens.push({
      token,
      platform,
      lastUsed: new Date()
    });
  }

  await user.save();

  return { message: 'Device token saved.' };
};

/**
 * Remove device token
 */
const removeDeviceToken = async (userId, token) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new ApiError(404, 'User not found.');
  }

  user.deviceTokens = user.deviceTokens?.filter(t => t.token !== token);
  await user.save();

  return { message: 'Device token removed.' };
};

/**
 * Notification templates for different types
 */
const notificationTemplates = {
  interest_received: {
    title: 'New Interest Received',
    getMessage: (senderName) => `${senderName} sent you an interest.`
  },
  interest_accepted: {
    title: 'Interest Accepted!',
    getMessage: (receiverName) => `${receiverName} accepted your interest.`
  },
  interest_rejected: {
    title: 'Interest Declined',
    getMessage: (receiverName) => `${receiverName} declined your interest.`
  },
  new_match: {
    title: 'New Match Found!',
    getMessage: (matchName) => `We found a new match for you: ${matchName}`
  },
  profile_view: {
    title: 'Profile Viewed',
    getMessage: (viewerName) => `${viewerName} viewed your profile.`
  },
  subscription_expiring: {
    title: 'Subscription Expiring',
    getMessage: (days) => `Your subscription expires in ${days} days. Renew now!`
  },
  subscription_expired: {
    title: 'Subscription Expired',
    getMessage: () => 'Your subscription has expired. Upgrade to continue enjoying premium features.'
  },
  verification_complete: {
    title: 'Profile Verified',
    getMessage: () => 'Your profile has been verified successfully!'
  },
  photo_approved: {
    title: 'Photo Approved',
    getMessage: () => 'Your photo has been approved and is now visible.'
  },
  photo_rejected: {
    title: 'Photo Rejected',
    getMessage: (reason) => `Your photo was rejected: ${reason}`
  },
  system_alert: {
    title: 'System Alert',
    getMessage: (message) => message
  }
};

/**
 * Create notification from template
 */
const createFromTemplate = async (type, userId, data = {}) => {
  const template = notificationTemplates[type];
  
  if (!template) {
    throw new ApiError(400, `Unknown notification type: ${type}`);
  }

  const message = template.getMessage(data.messageParam || '');

  const notification = await createNotification({
    user: userId,
    type,
    title: template.title,
    message,
    data
  });

  // Also send push notification
  await sendPushNotification(userId, template.title, message, data);

  return notification;
};

module.exports = {
  createNotification,
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAllNotifications,
  getUnreadCount,
  sendPushNotification,
  saveDeviceToken,
  removeDeviceToken,
  createFromTemplate,
  notificationTemplates
};