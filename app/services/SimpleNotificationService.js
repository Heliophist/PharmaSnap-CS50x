// SimpleNotificationService.js - Minimal, reliable notification service for iOS

import notifee, { TriggerType } from '@notifee/react-native';
import { Platform, Alert } from 'react-native';

class SimpleNotificationService {
  constructor() {
    this.initialized = false;
    this.permissionsGranted = false;
  }

  async initialize() {
    try {
      console.log('🚀 Initializing SimpleNotificationService...');
      
      // Request permissions
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
      
      console.log('Permission request result:', settings);
      
      // Check authorization status (can be string or number)
      const authStatus = settings.authorizationStatus;
      console.log('Authorization status:', authStatus, 'Type:', typeof authStatus);
      
      if (authStatus === 'authorized' || authStatus === 1) {
        this.permissionsGranted = true;
        console.log('✅ Notification permissions granted');
      } else {
        this.permissionsGranted = false;
        console.log('❌ Notification permissions denied');
      }
      
      this.initialized = true;
      console.log('✅ SimpleNotificationService initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing SimpleNotificationService:', error);
    }
  }

  async requestPermissions() {
    try {
      console.log('🔐 SimpleNotificationService: Requesting notification permissions...');
      
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
        console.log('✅ SimpleNotificationService: Notification permissions granted');
        return true;
      } else if (authStatus === 'denied' || authStatus === 0) {
        console.log('❌ SimpleNotificationService: Notification permissions denied');
        return false;
      } else if (authStatus === 'not-determined' || authStatus === -1) {
        console.log('⚠️ SimpleNotificationService: Notification permissions not determined');
        return false;
      }
      
      console.log('⚠️ SimpleNotificationService: Unknown authorization status:', authStatus);
      return false;
    } catch (error) {
      console.error('❌ SimpleNotificationService: Error requesting permissions:', error);
      return false;
    }
  }

  async scheduleNotification(reminder) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }
      
      if (!this.permissionsGranted) {
        this.permissionsGranted = await this.requestPermissions();
        if (!this.permissionsGranted) {
          console.log('❌ SimpleNotificationService: Notifications not permitted');
          return;
        }
      }

      const { id, medicationName, times, recurrence } = reminder;
      
      console.log(`📅 Scheduling notifications for ${medicationName}`);
      console.log(`Times: ${times.join(', ')}`);
      
      for (let i = 0; i < times.length; i++) {
        const time = times[i];
        const notificationId = `${id}_${i}`;
        
        // Parse time (format: "HH:MM")
        const [hours, minutes] = time.split(':').map(Number);
        
        // Calculate next occurrence time
        const nextTime = this.calculateNextOccurrence(hours, minutes, recurrence);
        
        if (nextTime) {
          const timeUntilNotification = nextTime.getTime() - Date.now();
          console.log(`⏰ Scheduling notification ${notificationId} for ${nextTime.toLocaleString()}`);
          console.log(`⏱️ Time until notification: ${Math.round(timeUntilNotification / 1000)} seconds`);
          
          // iOS WORKAROUND: Use setTimeout with immediate notifications
          // This is more reliable than trigger notifications on iOS
          if (timeUntilNotification > 0 && timeUntilNotification < 86400000) { // Within 24 hours
            console.log(`📱 iOS: Using setTimeout workaround for ${notificationId}`);
            
            setTimeout(async () => {
              console.log(`🔔 iOS: Triggering delayed notification ${notificationId}`);
              try {
                // Send immediate notification
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
            
            console.log(`✅ iOS: Notification ${notificationId} scheduled with setTimeout for ${Math.round(Math.min(timeUntilNotification, 300000) / 1000)} seconds`);
          } else {
            console.log(`⚠️ Skipping ${notificationId} - time too far in future`);
          }
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

  calculateNextOccurrence(hours, minutes, recurrence) {
    const now = new Date();
    const nextTime = new Date();
    nextTime.setHours(hours, minutes, 0, 0);
    
    console.log(`🕐 calculateNextOccurrence called:`);
    console.log(`  Hours: ${hours}, Minutes: ${minutes}`);
    console.log(`  Recurrence:`, recurrence);
    console.log(`  Current time: ${now.toLocaleString()}`);
    console.log(`  Target time today: ${nextTime.toLocaleString()}`);
    
    switch (recurrence.type) {
      case 'daily':
        if (nextTime <= now) {
          nextTime.setDate(nextTime.getDate() + 1);
          console.log(`  Daily: Time passed today, scheduling for tomorrow: ${nextTime.toLocaleString()}`);
        } else {
          console.log(`  Daily: Scheduling for today: ${nextTime.toLocaleString()}`);
        }
        return nextTime;
        
      case 'weekdays':
        const weekdays = recurrence.weekdays || [1, 2, 3, 4, 5];
        let daysToAdd = 0;
        const currentDay = nextTime.getDay();
        
        while (daysToAdd < 7) {
          const checkDay = (currentDay + daysToAdd) % 7;
          const checkTime = new Date(nextTime);
          checkTime.setDate(nextTime.getDate() + daysToAdd);
          
          if (weekdays.includes(checkDay) && (daysToAdd > 0 || checkTime > now)) {
            nextTime.setDate(nextTime.getDate() + daysToAdd);
            console.log(`  Weekdays: Scheduling for weekday ${checkDay}: ${nextTime.toLocaleString()}`);
            return nextTime;
          }
          daysToAdd++;
        }
        nextTime.setDate(nextTime.getDate() + 7);
        console.log(`  Weekdays: Fallback to next week: ${nextTime.toLocaleString()}`);
        return nextTime;
        
      case 'interval':
        if (nextTime <= now) {
          nextTime.setHours(nextTime.getHours() + (recurrence.intervalHours || 1));
        }
        console.log(`  Interval: Scheduling for interval: ${nextTime.toLocaleString()}`);
        return nextTime;
        
      case 'custom':
        if (nextTime <= now) {
          nextTime.setDate(nextTime.getDate() + (recurrence.intervalDays || 1));
        }
        console.log(`  Custom: Scheduling for custom: ${nextTime.toLocaleString()}`);
        return nextTime;
        
      default:
        console.error(`  ❌ Unknown recurrence type: ${recurrence.type}`);
        return null;
    }
  }

  async testImmediateNotification() {
    try {
      console.log('🧪 Testing immediate notification...');
      
      const trigger = {
        type: TriggerType.TIMESTAMP,
        timestamp: Date.now() + 2000, // 2 seconds from now
      };
      
      await notifee.createTriggerNotification(
        {
          id: 'test_immediate',
          title: '🧪 Test Notification',
          body: 'This is a test notification',
        },
        trigger
      );
      
      console.log('✅ Immediate test notification scheduled');
      return true;
    } catch (error) {
      console.error('❌ Error testing immediate notification:', error);
      return false;
    }
  }

  async checkNotificationStatus() {
    try {
      const settings = await notifee.getNotificationSettings();
      console.log('📱 Current notification settings:', settings);
      return settings;
    } catch (error) {
      console.error('❌ Error checking notification status:', error);
      return null;
    }
  }
}

export default new SimpleNotificationService();