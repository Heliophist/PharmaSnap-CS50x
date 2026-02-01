// ReminderContext.js - Context for managing reminder state

import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NotificationService from '../services/NotificationService';

const ReminderContext = createContext();

export const ReminderProvider = ({ children }) => {
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(false);

  const remindersKey = 'pharmasnap_reminders';

  useEffect(() => {
    loadReminders();
    NotificationService.setupEventListeners();
  }, []);

  const loadReminders = async () => {
    try {
      setLoading(true);
      const remindersJson = await AsyncStorage.getItem(remindersKey);
      const loadedReminders = remindersJson ? JSON.parse(remindersJson) : [];
      setReminders(loadedReminders);
    } catch (error) {
      console.error('Error loading reminders:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveReminders = async (updatedReminders) => {
    try {
      await AsyncStorage.setItem(remindersKey, JSON.stringify(updatedReminders));
      setReminders(updatedReminders);
    } catch (error) {
      console.error('Error saving reminders:', error);
    }
  };

  const addReminder = async (reminderData) => {
    try {
      setLoading(true);
      
      const newReminder = {
        id: Date.now().toString(),
        ...reminderData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      const updatedReminders = [newReminder, ...reminders];
      await saveReminders(updatedReminders);
      
      // Schedule notifications if enabled
      if (reminderData.enabled !== false) {
        await NotificationService.scheduleNotification(newReminder);
      }
      
      return newReminder;
    } catch (error) {
      console.error('Error adding reminder:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateReminder = async (id, reminderData) => {
    try {
      setLoading(true);
      
      // Cancel existing notifications
      const existingReminder = reminders.find(r => r.id === id);
      if (existingReminder) {
        await NotificationService.cancelNotification(id);
      }
      
      const updatedReminders = reminders.map(reminder => 
        reminder.id === id 
          ? { ...reminder, ...reminderData, updatedAt: new Date().toISOString() }
          : reminder
      );
      
      await saveReminders(updatedReminders);
      
      // Schedule new notifications if enabled
      if (reminderData.enabled !== false) {
        const updatedReminder = { ...reminderData, id };
        await NotificationService.scheduleNotification(updatedReminder);
      }
    } catch (error) {
      console.error('Error updating reminder:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const deleteReminder = async (id) => {
    try {
      setLoading(true);
      
      // Cancel notifications
      await NotificationService.cancelNotification(id);
      
      const updatedReminders = reminders.filter(reminder => reminder.id !== id);
      await saveReminders(updatedReminders);
    } catch (error) {
      console.error('Error deleting reminder:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const toggleReminderEnabled = async (id) => {
    try {
      const reminder = reminders.find(r => r.id === id);
      if (!reminder) return;
      
      const newEnabled = !reminder.enabled;
      
      const updatedReminders = reminders.map(r => 
        r.id === id 
          ? { ...r, enabled: newEnabled, updatedAt: new Date().toISOString() }
          : r
      );
      
      await saveReminders(updatedReminders);
      
      if (newEnabled) {
        // Schedule notifications
        await NotificationService.scheduleNotification(reminder);
      } else {
        // Cancel notifications
        await NotificationService.cancelNotification(id);
      }
    } catch (error) {
      console.error('Error toggling reminder enabled status:', error);
      throw error;
    }
  };

  const markReminderTaken = async (reminderId, scheduledTime) => {
    try {
      console.log(`Marked reminder ${reminderId} as taken`);
    } catch (error) {
      console.error('Error marking reminder as taken:', error);
    }
  };

  const markReminderSkipped = async (reminderId, scheduledTime) => {
    try {
      console.log(`Marked reminder ${reminderId} as skipped`);
    } catch (error) {
      console.error('Error marking reminder as skipped:', error);
    }
  };

  const getUpcomingReminders = () => {
    const now = new Date();
    const upcoming = [];
    
    reminders.forEach(reminder => {
      if (!reminder.enabled) return;
      
      reminder.times.forEach(time => {
        const [hours, minutes] = time.split(':').map(Number);
        const today = new Date();
        today.setHours(hours, minutes, 0, 0);
        
        // If time has passed today, check tomorrow
        if (today <= now) {
          today.setDate(today.getDate() + 1);
        }
        
        upcoming.push({
          id: `${reminder.id}_${time}`,
          reminderId: reminder.id,
          medicationName: reminder.medicationName,
          scheduledTime: today.toISOString(),
          time: time,
          recurrence: reminder.recurrence,
        });
      });
    });
    
    return upcoming.sort((a, b) => new Date(a.scheduledTime) - new Date(b.scheduledTime));
  };

  const value = {
    reminders,
    loading,
    addReminder,
    updateReminder,
    deleteReminder,
    toggleReminderEnabled,
    markReminderTaken,
    markReminderSkipped,
    getUpcomingReminders,
    loadReminders,
  };

  return (
    <ReminderContext.Provider value={value}>
      {children}
    </ReminderContext.Provider>
  );
};

export const useReminders = () => {
  const context = useContext(ReminderContext);
  if (!context) {
    throw new Error('useReminders must be used within a ReminderProvider');
  }
  return context;
};