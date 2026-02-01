// NotificationService.js - Simplified notification handling with error recovery

import notifee, { AndroidImportance, AndroidVisibility, TriggerType } from '@notifee/react-native';
import { Platform, PermissionsAndroid, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SimpleNotificationService from './SimpleNotificationService';

class NotificationService {
  constructor() {
    this.initialized = false;
    this.permissionsGranted = false;
    this.eventListenersSetup = false;
  }

  async initialize() {
    try {
      console.log('🚀 Initializing NotificationService...');
      
      // Create notification channels for Android first
      if (Platform.OS === 'android') {
        await this.createNotificationChannel();
      }
      
      // Request notification permissions
      this.permissionsGranted = await this.requestPermissions();
      console.log('Permission status:', this.permissionsGranted);
      
      // Setup event listeners
      this.setupEventListeners();
      
      this.initialized = true;
      console.log('✅ NotificationService initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing NotificationService:', error);
      console.error('Error details:', error.message);
    }
  }

  async requestPermissions() {
    try {
      console.log('🔐 Requesting notification permissions...');
      
      const settings = await notifee.requestPermission({
        alert: true,
        badge: true,
        sound: true,
        criticalAlert: false,
        provisional: false,
        announcement: false,
        carPlay: false,
        lockScreen: true,
        notificationCenter: true,
      });
      
      // Check authorization status (can be string or number)
      const authStatus = settings.authorizationStatus;
      
      if (authStatus === 'authorized' || authStatus === 1) {
        console.log('✅ Notification permissions granted');
        return true;
      } else if (authStatus === 'denied' || authStatus === 0) {
        console.log('❌ Notification permissions denied');
        return false;
      } else if (authStatus === 'not-determined' || authStatus === -1) {
        console.log('⚠️ Notification permissions not determined');
        return false;
      }
      
      // Request Android permissions
      if (Platform.OS === 'android') {
        console.log('📱 Requesting Android notification permissions...');
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
        );
        console.log('Android permission result:', granted);
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }
      
      return false;
    } catch (error) {
      console.error('❌ Error requesting permissions:', error);
      return false;
    }
  }

  async createNotificationChannel() {
    try {
      console.log('📺 Creating notification channel for Android...');
      await notifee.createChannel({
        id: 'medication-reminders',
        name: 'Medication Reminders',
        importance: AndroidImportance.HIGH,
        visibility: AndroidVisibility.PUBLIC,
        sound: 'default',
        vibration: true,
        vibrationPattern: [300, 500],
        lights: true,
        lightColor: '#008000',
      });
      console.log('✅ Notification channel created successfully');
    } catch (error) {
      console.error('❌ Error creating notification channel:', error);
    }
  }

  async scheduleNotification(reminder) {
    try {
      // Ensure we're initialized and have permissions
      if (!this.initialized) {
        console.log('⚠️ Service not initialized, initializing now...');
        await this.initialize();
      }
      
      if (!this.permissionsGranted) {
        this.permissionsGranted = await this.requestPermissions();
        if (!this.permissionsGranted) {
          console.log('❌ Notifications not permitted, skipping scheduling');
          return;
        }
      }

      const { id, medicationName, times, recurrence } = reminder;
      
      console.log(`📅 Scheduling notifications for ${medicationName}`);
      console.log(`Times: ${times.join(', ')}`);
      console.log(`Recurrence: ${recurrence.type}`);
      
      // For iOS, delegate to the simple notification service (more reliable)
      if (Platform.OS === 'ios') {
        await SimpleNotificationService.scheduleNotification(reminder);
        return;
      }
      
      // Schedule notifications for each time (Android)
      for (let i = 0; i < times.length; i++) {
        const time = times[i];
        const notificationId = `${id}_${i}`;
        
        // Parse time (format: "HH:MM")
        const [hours, minutes] = time.split(':').map(Number);
        
        // Calculate next occurrence time
        const nextTime = this.calculateNextOccurrence(hours, minutes, recurrence);
        
        if (nextTime) {
          console.log(`⏰ Scheduling notification ${notificationId} for ${nextTime.toLocaleString()}`);
          
          const trigger = {
            type: TriggerType.TIMESTAMP,
            timestamp: nextTime.getTime(),
          };
          
          await this.createNotification(notificationId, medicationName, trigger);
          console.log(`✅ Notification scheduled: ${notificationId}`);
        } else {
          console.error(`❌ Could not calculate next occurrence for ${time}`);
        }
      }
      
      console.log(`✅ Completed scheduling notifications for ${medicationName}`);
    } catch (error) {
      console.error('❌ Error scheduling notification:', error);
      console.error('Error details:', error.message);
    }
  }

  // iOS-specific notification scheduling using setTimeout
  async scheduleNotificationIOS(reminder) {
    try {
      const { id, medicationName, times, recurrence } = reminder;
      
      for (let i = 0; i < times.length; i++) {
        const time = times[i];
        const notificationId = `${id}_${i}`;
        
        // Parse time (format: "HH:MM")
        const [hours, minutes] = time.split(':').map(Number);
        
        // Calculate next occurrence time
        const nextTime = this.calculateNextOccurrence(hours, minutes, recurrence);
        
        if (nextTime) {
          const timeUntilNotification = nextTime.getTime() - Date.now();
          console.log(`📱 iOS: Scheduling ${notificationId} for ${nextTime.toLocaleString()}`);
          console.log(`⏱️ Time until notification: ${Math.round(timeUntilNotification / 1000)} seconds`);
          
          // Only schedule if within reasonable time (24 hours max)
          if (timeUntilNotification > 0 && timeUntilNotification < 86400000) {
            // Store the reminder for background processing
            await this.storeReminderForBackground(reminder, notificationId, nextTime);
            
            // Use setTimeout with immediate notifications (iOS workaround)
            setTimeout(async () => {
              console.log(`🔔 iOS: Triggering notification ${notificationId}`);
              try {
                // Use displayNotification instead of createTriggerNotification
                await notifee.displayNotification({
                  id: notificationId,
                  title: '💊 Medication Reminder',
                  body: `Time to take ${medicationName}`,
                  data: {
                    medicationName,
                    reminderId: id,
                  },
                });
                console.log(`✅ iOS: Notification ${notificationId} sent successfully`);
              } catch (error) {
                console.error(`❌ iOS: Error sending notification ${notificationId}:`, error);
              }
            }, Math.min(timeUntilNotification, 300000)); // Max 5 minutes for testing
            
            console.log(`✅ iOS: Notification ${notificationId} scheduled for ${Math.round(timeUntilNotification / 1000)} seconds`);
          } else {
            console.log(`⚠️ iOS: Skipping ${notificationId} - time too far in future`);
          }
        } else {
          console.error(`❌ Could not calculate next occurrence for ${time}`);
        }
      }
    } catch (error) {
      console.error('❌ Error in iOS notification scheduling:', error);
    }
  }

  // Store reminder for background processing
  async storeReminderForBackground(reminder, notificationId, scheduledTime) {
    try {
      const reminderData = {
        id: notificationId,
        reminder: reminder,
        scheduledTime: scheduledTime.toISOString(),
        createdAt: new Date().toISOString(),
      };
      
      // Store in AsyncStorage for background processing
      const existingReminders = await AsyncStorage.getItem('background_reminders');
      const reminders = existingReminders ? JSON.parse(existingReminders) : [];
      reminders.push(reminderData);
      await AsyncStorage.setItem('background_reminders', JSON.stringify(reminders));
      
      console.log(`💾 Stored reminder ${notificationId} for background processing`);
    } catch (error) {
      console.error('❌ Error storing reminder for background:', error);
    }
  }

  calculateNextOccurrence(hours, minutes, recurrence) {
    const now = new Date();
    const nextTime = new Date();
    nextTime.setHours(hours, minutes, 0, 0);
    
    console.log(`Calculating next occurrence for ${hours}:${minutes.toString().padStart(2, '0')}`);
    console.log(`Current time: ${now.toLocaleString()}`);
    console.log(`Target time today: ${nextTime.toLocaleString()}`);
    
    switch (recurrence.type) {
      case 'daily':
        // If the time has passed today, schedule for tomorrow
        if (nextTime <= now) {
          nextTime.setDate(nextTime.getDate() + 1);
          console.log(`Time has passed today, scheduling for tomorrow: ${nextTime.toLocaleString()}`);
        } else {
          console.log(`Scheduling for today: ${nextTime.toLocaleString()}`);
        }
        return nextTime;
        
      case 'weekdays':
        const weekdays = recurrence.weekdays || [1, 2, 3, 4, 5]; // Monday-Friday
        let daysToAdd = 0;
        const currentDay = nextTime.getDay();
        
        // Find next valid weekday
        while (daysToAdd < 7) {
          const checkDay = (currentDay + daysToAdd) % 7;
          const checkTime = new Date(nextTime);
          checkTime.setDate(nextTime.getDate() + daysToAdd);
          
          if (weekdays.includes(checkDay) && (daysToAdd > 0 || checkTime > now)) {
            nextTime.setDate(nextTime.getDate() + daysToAdd);
            console.log(`Scheduling for weekday ${checkDay}: ${nextTime.toLocaleString()}`);
            return nextTime;
          }
          daysToAdd++;
        }
        
        // Fallback: schedule for next week
        nextTime.setDate(nextTime.getDate() + 7);
        console.log(`Scheduling for next week: ${nextTime.toLocaleString()}`);
        return nextTime;
        
      case 'interval':
        // For interval (every X hours), if time has passed, add interval
        if (nextTime <= now) {
          nextTime.setHours(nextTime.getHours() + (recurrence.intervalHours || 1));
        }
        console.log(`Scheduling for interval: ${nextTime.toLocaleString()}`);
        return nextTime;
        
      case 'custom':
        // For custom (every X days), if time has passed, add interval
        if (nextTime <= now) {
          nextTime.setDate(nextTime.getDate() + (recurrence.intervalDays || 1));
        }
        console.log(`Scheduling for custom: ${nextTime.toLocaleString()}`);
        return nextTime;
        
      default:
        console.log(`Unknown recurrence type: ${recurrence.type}`);
        return null;
    }
  }

  async createNotification(notificationId, medicationName, trigger) {
    try {
      console.log(`Creating notification: ${notificationId} for ${medicationName}`);
      console.log(`Trigger timestamp: ${new Date(trigger.timestamp).toLocaleString()}`);
      
      // Use the same simple approach that works in direct testing
      const notification = {
        id: notificationId,
        title: '💊 Medication Reminder',
        body: `Time to take ${medicationName}`,
        data: {
          medicationName,
          reminderId: notificationId.split('_')[0],
        },
      };

      // Simplified trigger - use the exact same format as the working direct test
      const simpleTrigger = {
        type: TriggerType.TIMESTAMP,
        timestamp: trigger.timestamp,
      };

      console.log('📱 Creating trigger notification with simplified approach...');
      await notifee.createTriggerNotification(notification, simpleTrigger);
      console.log(`✅ Successfully created notification: ${notificationId} for ${medicationName}`);
      
      // Verify the notification was scheduled
      const scheduledNotifications = await notifee.getTriggerNotifications();
      const ourNotification = scheduledNotifications.find(n => n.notification.id === notificationId);
      if (ourNotification) {
        console.log(`✅ Verified notification ${notificationId} is scheduled`);
      } else {
        console.log(`⚠️ Warning: Notification ${notificationId} not found in scheduled list`);
      }
      
    } catch (error) {
      console.error('❌ Error creating notification:', error);
      console.error('Error details:', error.message);
      console.error('Error stack:', error.stack);
      throw error; // Re-throw to let caller handle
    }
  }

  async cancelNotification(notificationId) {
    try {
      await notifee.cancelNotification(notificationId);
      console.log(`Cancelled notification: ${notificationId}`);
    } catch (error) {
      console.error('Error cancelling notification:', error);
    }
  }

  async cancelAllNotifications() {
    try {
      await notifee.cancelAllNotifications();
      console.log('Cancelled all notifications');
    } catch (error) {
      console.error('Error cancelling all notifications:', error);
    }
  }

  async handleNotificationAction(actionId, notificationData) {
    try {
      const { medicationName, reminderId } = notificationData;
      
      switch (actionId) {
        case 'taken':
          console.log(`Marked ${medicationName} as taken`);
          Alert.alert('Success', `${medicationName} marked as taken`);
          break;
          
        case 'snooze':
          console.log(`Snoozed ${medicationName} for 10 minutes`);
          await this.scheduleSnoozeNotification(medicationName, reminderId);
          break;
          
        case 'skip':
          console.log(`Skipped ${medicationName}`);
          Alert.alert('Skipped', `${medicationName} skipped`);
          break;
          
        default:
          console.log('Unknown action:', actionId);
      }
    } catch (error) {
      console.error('Error handling notification action:', error);
    }
  }

  async scheduleSnoozeNotification(medicationName, reminderId) {
    try {
      const snoozeTime = new Date();
      snoozeTime.setMinutes(snoozeTime.getMinutes() + 10);
      
      await notifee.createTriggerNotification(
        {
          id: `snooze_${reminderId}_${Date.now()}`,
          title: '💊 Medication Reminder (Snoozed)',
          body: `Time to take ${medicationName}`,
          data: {
            medicationName,
            reminderId,
            isSnoozed: true,
          },
        },
        {
          type: TriggerType.TIMESTAMP,
          timestamp: snoozeTime.getTime(),
        }
      );
      console.log(`Scheduled snooze notification for ${medicationName}`);
    } catch (error) {
      console.error('Error scheduling snooze notification:', error);
    }
  }

  // Setup notification event listeners
  setupEventListeners() {
    try {
      // Prevent duplicate event listener registration
      if (this.eventListenersSetup) {
        console.log('Event listeners already setup, skipping...');
        return;
      }
      
      notifee.onForegroundEvent(({ type, detail }) => {
        if (type === 'press') {
          console.log('Notification pressed:', detail.notification);
        } else if (type === 'action') {
          this.handleNotificationAction(detail.pressAction.id, detail.notification.data);
        }
      });

      notifee.onBackgroundEvent(async ({ type, detail }) => {
        if (type === 'action') {
          await this.handleNotificationAction(detail.pressAction.id, detail.notification.data);
        }
      });
      
      this.eventListenersSetup = true;
      console.log('Notification event listeners setup');
    } catch (error) {
      console.error('Error setting up event listeners:', error);
    }
  }

  // Debug method to check notification status
  async checkNotificationStatus() {
    try {
      console.log('📱 Checking notification status...');
      
      // First check if notifee is available
      if (!notifee) {
        console.log('❌ Notifee is not available');
        return { error: 'Notifee not available' };
      }
      
      const settings = await notifee.getNotificationSettings();
      console.log('📱 Notification settings:', settings);
      
      const scheduledNotifications = await notifee.getTriggerNotifications();
      console.log('📅 Scheduled notifications:', scheduledNotifications);
      
      // Test if we can create a simple notification
      try {
        await notifee.displayNotification({
          id: 'test_check',
          title: 'Test',
          body: 'Test notification',
        });
        console.log('✅ Test notification created successfully');
        await notifee.cancelNotification('test_check');
        console.log('✅ Test notification cancelled');
      } catch (testError) {
        console.log('❌ Test notification failed:', testError.message);
      }
      
      return {
        settings,
        scheduledNotifications,
        notifeeAvailable: true,
      };
    } catch (error) {
      console.error('❌ Error checking notification status:', error);
      return { error: error.message };
    }
  }

  // Test method to schedule immediate notification
  async testImmediateNotification() {
    try {
      console.log('🧪 Testing immediate notification...');
      
      // Ensure we're initialized and have permissions
      if (!this.initialized) {
        console.log('⚠️ Service not initialized, initializing now...');
        await this.initialize();
      }
      
      if (!this.permissionsGranted) {
        console.log('⚠️ Permissions not granted, requesting now...');
        this.permissionsGranted = await this.requestPermissions();
        if (!this.permissionsGranted) {
          console.log('❌ Permissions still not granted');
          return false;
        }
      }
      
      // Try multiple approaches for iOS compatibility
      const testTime = new Date();
      testTime.setSeconds(testTime.getSeconds() + 10); // 10 seconds from now
      
      console.log(`⏰ Scheduling test notification for ${testTime.toLocaleString()}`);
      
      // Method 1: Try simple display notification first
      try {
        console.log('📱 Attempting simple display notification...');
        await notifee.displayNotification({
          id: 'test_immediate',
          title: '💊 Test Notification',
          body: 'This is a test notification',
          data: {
            medicationName: 'Test Medication',
            reminderId: 'test',
          },
        });
        console.log('✅ Simple notification displayed successfully');
        return true;
      } catch (displayError) {
        console.log('❌ Simple notification failed:', displayError.message);
      }
      
      // Method 2: Try trigger notification with minimal config
      try {
        console.log('📱 Attempting minimal trigger notification...');
        const trigger = {
          type: TriggerType.TIMESTAMP,
          timestamp: testTime.getTime(),
        };
        
        const notification = {
          id: 'test_notification',
          title: '💊 Test Medication',
          body: 'Time to take Test Medication',
        };
        
        await notifee.createTriggerNotification(notification, trigger);
        console.log(`✅ Minimal trigger notification scheduled for ${testTime.toLocaleString()}`);
        
        // Verify the notification was scheduled
        const scheduledNotifications = await notifee.getTriggerNotifications();
        const ourNotification = scheduledNotifications.find(n => n.notification.id === 'test_notification');
        if (ourNotification) {
          console.log(`✅ Verified notification test_notification is scheduled`);
        } else {
          console.log(`⚠️ Warning: Notification test_notification not found in scheduled list`);
        }
        
        return true;
      } catch (triggerError) {
        console.log('❌ Minimal trigger notification failed:', triggerError.message);
      }
      
      // Method 3: Try with iOS-specific configuration
      try {
        console.log('📱 Attempting iOS-specific notification...');
        const trigger = {
          type: TriggerType.TIMESTAMP,
          timestamp: testTime.getTime(),
        };
        
        const notification = {
          id: 'test_ios',
          title: '💊 Test Medication',
          body: 'Time to take Test Medication',
          ios: {
            sound: 'default',
          },
        };
        
        await notifee.createTriggerNotification(notification, trigger);
        console.log(`✅ iOS-specific notification scheduled for ${testTime.toLocaleString()}`);
        return true;
      } catch (iosError) {
        console.log('❌ iOS-specific notification failed:', iosError.message);
      }
      
      console.log('❌ All notification methods failed');
      return false;
      
    } catch (error) {
      console.error('❌ Error creating test notification:', error);
      console.error('Error details:', error.message);
      console.error('Error stack:', error.stack);
      return false;
    }
  }

  // Method to reschedule all notifications (useful for debugging)
  async rescheduleAllNotifications(reminders) {
    try {
      console.log('🔄 Rescheduling all notifications...');
      
      // Cancel all existing notifications
      await this.cancelAllNotifications();
      
      // Schedule all reminders
      for (const reminder of reminders) {
        if (reminder.enabled !== false) {
          await this.scheduleNotification(reminder);
        }
      }
      
      console.log('✅ All notifications rescheduled');
    } catch (error) {
      console.error('❌ Error rescheduling notifications:', error);
    }
  }
}

export default new NotificationService();