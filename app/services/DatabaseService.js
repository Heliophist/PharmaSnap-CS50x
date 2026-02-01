// DatabaseService.js - Handles local AsyncStorage for reminders

import AsyncStorage from '@react-native-async-storage/async-storage';

class DatabaseService {
  constructor() {
    this.remindersKey = 'pharmasnap_reminders';
    this.logsKey = 'pharmasnap_reminder_logs';
    this.initialize();
  }

  async initialize() {
    try {
      // Initialize with empty arrays if they don't exist
      const reminders = await this.getAllReminders();
      const logs = await this.getAllLogs();
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Error initializing database:', error);
    }
  }

  async addReminder(reminder) {
    try {
      const { medicationName, times, recurrence } = reminder;
      
      const reminders = await this.getAllReminders();
      const newReminder = {
        id: Date.now().toString(), // Simple ID generation
        medicationName: medicationName.trim(),
        times,
        recurrence,
        enabled: reminder.enabled !== false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      reminders.push(newReminder);
      await AsyncStorage.setItem(this.remindersKey, JSON.stringify(reminders));
      
      console.log(`Added reminder with ID: ${newReminder.id}`);
      return newReminder;
    } catch (error) {
      console.error('Error adding reminder:', error);
      throw error;
    }
  }

  async updateReminder(id, reminder) {
    try {
      const reminders = await this.getAllReminders();
      const index = reminders.findIndex(r => r.id === id);
      
      if (index !== -1) {
        reminders[index] = {
          ...reminders[index],
          ...reminder,
          id,
          updatedAt: new Date().toISOString(),
        };
        
        await AsyncStorage.setItem(this.remindersKey, JSON.stringify(reminders));
        console.log(`Updated reminder with ID: ${id}`);
      }
    } catch (error) {
      console.error('Error updating reminder:', error);
      throw error;
    }
  }

  async deleteReminder(id) {
    try {
      // Don't delete associated logs - preserve history even after reminder deletion
      // The logs contain snapshots of medication details and should be kept
      
      // Delete only the reminder
      const reminders = await this.getAllReminders();
      const filteredReminders = reminders.filter(r => r.id !== id);
      await AsyncStorage.setItem(this.remindersKey, JSON.stringify(filteredReminders));
      
      console.log(`Deleted reminder with ID: ${id} (preserved history logs)`);
    } catch (error) {
      console.error('Error deleting reminder:', error);
      throw error;
    }
  }

  async getAllReminders() {
    try {
      const remindersJson = await AsyncStorage.getItem(this.remindersKey);
      return remindersJson ? JSON.parse(remindersJson) : [];
    } catch (error) {
      console.error('Error getting reminders:', error);
      return [];
    }
  }

  async getReminderById(id) {
    try {
      const reminders = await this.getAllReminders();
      return reminders.find(r => r.id === id) || null;
    } catch (error) {
      console.error('Error getting reminder by ID:', error);
      return null;
    }
  }

  async logReminderAction(reminderId, scheduledTime, status) {
    try {
      // Get the reminder details to store as snapshot
      const reminder = await this.getReminderById(reminderId);
      if (!reminder) {
        console.error(`Reminder with ID ${reminderId} not found for logging action`);
        return;
      }

      const logs = await this.getAllLogs();
      const newLog = {
        id: Date.now().toString(),
        reminderId,
        scheduledTime,
        status,
        actionTime: new Date().toISOString(),
        // Store medication details as snapshot
        medicationName: reminder.medicationName,
        times: reminder.times,
        recurrence: reminder.recurrence,
      };
      
      logs.push(newLog);
      await AsyncStorage.setItem(this.logsKey, JSON.stringify(logs));
      console.log(`Logged reminder action: ${status} for reminder ${reminderId} (${reminder.medicationName})`);
    } catch (error) {
      console.error('Error logging reminder action:', error);
    }
  }

  async getReminderLogs(reminderId, limit = 50) {
    try {
      const logs = await this.getAllLogs();
      const filteredLogs = logs
        .filter(log => log.reminderId === reminderId)
        .sort((a, b) => new Date(b.actionTime) - new Date(a.actionTime))
        .slice(0, limit);
      
      return filteredLogs;
    } catch (error) {
      console.error('Error getting reminder logs:', error);
      return [];
    }
  }

  async getAllLogs() {
    try {
      const logsJson = await AsyncStorage.getItem(this.logsKey);
      return logsJson ? JSON.parse(logsJson) : [];
    } catch (error) {
      console.error('Error getting logs:', error);
      return [];
    }
  }

  async toggleReminderEnabled(id, enabled) {
    try {
      const reminders = await this.getAllReminders();
      const index = reminders.findIndex(r => r.id === id);
      
      if (index !== -1) {
        reminders[index].enabled = enabled;
        reminders[index].updatedAt = new Date().toISOString();
        await AsyncStorage.setItem(this.remindersKey, JSON.stringify(reminders));
        console.log(`Toggled reminder ${id} enabled status to ${enabled}`);
      }
    } catch (error) {
      console.error('Error toggling reminder enabled status:', error);
      throw error;
    }
  }

  async deleteLogsForReminder(reminderId) {
    try {
      const logs = await this.getAllLogs();
      const filteredLogs = logs.filter(log => log.reminderId !== reminderId);
      await AsyncStorage.setItem(this.logsKey, JSON.stringify(filteredLogs));
    } catch (error) {
      console.error('Error deleting logs for reminder:', error);
    }
  }

  async deleteLogById(logId) {
    try {
      const logs = await this.getAllLogs();
      const filteredLogs = logs.filter(log => log.id !== logId);
      await AsyncStorage.setItem(this.logsKey, JSON.stringify(filteredLogs));
      console.log(`Deleted log with ID: ${logId}`);
    } catch (error) {
      console.error('Error deleting log:', error);
      throw error;
    }
  }

  async clearAllData() {
    try {
      await AsyncStorage.removeItem(this.remindersKey);
      await AsyncStorage.removeItem(this.logsKey);
      console.log('Cleared all reminder data');
    } catch (error) {
      console.error('Error clearing data:', error);
    }
  }
}

export default new DatabaseService();