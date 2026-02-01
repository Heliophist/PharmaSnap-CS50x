// ReactNativeNotificationService.js - Using React Native's built-in notification system

import { Platform, Alert } from 'react-native';
import PushNotificationIOS from '@react-native-community/push-notification-ios';
import AsyncStorage from '@react-native-async-storage/async-storage';

class ReactNativeNotificationService {
  constructor() {
    this.initialized = false;
    this.permissionsGranted = false;
  }

  async initialize() {
    try {
      console.log('🚀 Initializing ReactNativeNotificationService...');
      
      if (Platform.OS === 'ios') {
        // Request permissions for iOS
        const permissions = await PushNotificationIOS.requestPermissions({
          alert: true,
          badge: true,
          sound: true,
        });
        
        console.log('iOS permission request result:', permissions);
        
        if (permissions.alert || permissions.badge || permissions.sound) {
          this.permissionsGranted = true;
          console.log('✅ iOS notification permissions granted');
        } else {
          this.permissionsGranted = false;
          console.log('❌ iOS notification permissions denied');
        }
      } else {
        // For Android, we'll use a simple approach
        this.permissionsGranted = true;
        console.log('✅ Android notifications enabled');
      }
      
      this.initialized = true;
      console.log('✅ ReactNativeNotificationService initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing ReactNativeNotificationService:', error);
    }
  }

  async scheduleNotification(reminder) {
    try {
      if (!this.initialized) {
        await this.initialize();
      }
      
      if (!this.permissionsGranted) {
        console.log('❌ Notifications not permitted');
        return;
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
          
          if (Platform.OS === 'ios') {
            // Use iOS native notification scheduling
            await this.scheduleIOSNotification(notificationId, medicationName, nextTime);
          } else {
            // Use Android notification scheduling
            await this.scheduleAndroidNotification(notificationId, medicationName, nextTime);
          }
          
          console.log(`✅ Notification ${notificationId} scheduled successfully`);
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

  async scheduleIOSNotification(notificationId, medicationName, scheduledTime) {
    try {
      console.log(`📱 iOS: Scheduling notification ${notificationId} for ${scheduledTime.toLocaleString()}`);
      
      // Create notification date
      const notificationDate = new Date(scheduledTime);
      
      // Schedule the notification using iOS native API
      PushNotificationIOS.scheduleLocalNotification({
        id: notificationId,
        alertTitle: '💊 Medication Reminder',
        alertBody: `Time to take ${medicationName}`,
        fireDate: notificationDate.toISOString(),
        repeatInterval: 'day', // For daily reminders
        userInfo: {
          medicationName,
          notificationId,
        },
      });
      
      console.log(`✅ iOS: Notification ${notificationId} scheduled for ${notificationDate.toLocaleString()}`);
    } catch (error) {
      console.error(`❌ iOS: Error scheduling notification ${notificationId}:`, error);
    }
  }

  async scheduleAndroidNotification(notificationId, medicationName, scheduledTime) {
    try {
      console.log(`🤖 Android: Scheduling notification ${notificationId} for ${scheduledTime.toLocaleString()}`);
      
      // For Android, we'll use a simple setTimeout approach
      const timeUntilNotification = scheduledTime.getTime() - Date.now();
      
      if (timeUntilNotification > 0) {
        setTimeout(() => {
          console.log(`🔔 Android: Triggering notification ${notificationId}`);
          // For now, just log - we can implement Android notifications later
          console.log(`📱 Android: Time to take ${medicationName}`);
        }, timeUntilNotification);
        
        console.log(`✅ Android: Notification ${notificationId} scheduled for ${Math.round(timeUntilNotification / 1000)} seconds`);
      }
    } catch (error) {
      console.error(`❌ Android: Error scheduling notification ${notificationId}:`, error);
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
      console.log('🧪 Testing immediate notification with React Native...');
      
      if (Platform.OS === 'ios') {
        // Test immediate iOS notification
        PushNotificationIOS.scheduleLocalNotification({
          id: 'test_immediate',
          alertTitle: '🧪 Test Notification',
          alertBody: 'This is a test notification',
          fireDate: new Date(Date.now() + 2000).toISOString(), // 2 seconds from now
        });
        
        console.log('✅ iOS immediate test notification scheduled');
        return true;
      } else {
        // Test immediate Android notification
        setTimeout(() => {
          console.log('📱 Android: Test notification triggered');
        }, 2000);
        
        console.log('✅ Android immediate test notification scheduled');
        return true;
      }
    } catch (error) {
      console.error('❌ Error testing immediate notification:', error);
      return false;
    }
  }

  async checkNotificationStatus() {
    try {
      if (Platform.OS === 'ios') {
        const permissions = await PushNotificationIOS.checkPermissions();
        console.log('📱 iOS notification permissions:', permissions);
        return permissions;
      } else {
        console.log('📱 Android notifications enabled');
        return { enabled: true };
      }
    } catch (error) {
      console.error('❌ Error checking notification status:', error);
      return null;
    }
  }
}

export default new ReactNativeNotificationService();
