// ReminderScreen.js - Complete reminder management with notifications

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Switch,
  Alert,
  Modal,
  FlatList,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NotificationService from '../services/NotificationService';
import SimpleNotificationService from '../services/SimpleNotificationService';
import DatabaseService from '../services/DatabaseService';
import { useTranslation } from 'react-i18next';

const ReminderForm = ({ visible, onClose, reminder = null, onSave }) => {
  const { t } = useTranslation();
  const [medicationName, setMedicationName] = useState(reminder?.medicationName || '');
  const [time, setTime] = useState(reminder?.times?.[0] || '');
  const [recurrenceType, setRecurrenceType] = useState(reminder?.recurrence?.type || 'daily');
  const [intervalDays, setIntervalDays] = useState(reminder?.recurrence?.intervalDays || 1);
  const [intervalHours, setIntervalHours] = useState(reminder?.recurrence?.intervalHours || 1);
  const [weekdays, setWeekdays] = useState(reminder?.recurrence?.weekdays || [1, 2, 3, 4, 5]);
  const [enabled, setEnabled] = useState(reminder?.enabled ?? true);
  const [times, setTimes] = useState(reminder?.times || ['']);

  const recurrenceOptions = [
    { value: 'daily', label: t('daily') },
    { value: 'weekdays', label: t('weekdays_only') },
    { value: 'interval', label: t('interval') },
    { value: 'custom', label: t('custom') },
  ];

  const weekdayOptions = [
    { value: 1, label: t('monday') },
    { value: 2, label: t('tuesday') },
    { value: 3, label: t('wednesday') },
    { value: 4, label: t('thursday') },
    { value: 5, label: t('friday') },
    { value: 6, label: t('saturday') },
    { value: 7, label: t('sunday') },
  ];

  const handleSave = () => {
    if (!medicationName.trim()) {
      Alert.alert(t('error'), t('please_enter_medication_name'));
      return;
    }

    const validTimes = times.filter(t => t.trim());
    if (validTimes.length === 0) {
      Alert.alert(t('error'), t('please_enter_at_least_one_time'));
      return;
    }

    // Validate time format
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    for (const timeStr of validTimes) {
      if (!timeRegex.test(timeStr)) {
        Alert.alert(t('error'), t('please_enter_time_in_hh_mm_format'));
        return;
      }
    }

    const reminderData = {
      medicationName: medicationName.trim(),
      times: validTimes,
      recurrence: {
        type: recurrenceType,
        intervalDays: recurrenceType === 'custom' ? parseInt(intervalDays) : 1,
        intervalHours: recurrenceType === 'interval' ? parseInt(intervalHours) : 1,
        weekdays: recurrenceType === 'weekdays' ? weekdays : [],
      },
      enabled,
    };

    onSave(reminderData);
    onClose();
  };

  const addTimeSlot = () => {
    setTimes([...times, '']);
  };

  const removeTimeSlot = (index) => {
    if (times.length > 1) {
      setTimes(times.filter((_, i) => i !== index));
    }
  };

  const updateTimeSlot = (index, value) => {
    const newTimes = [...times];
    newTimes[index] = value;
    setTimes(newTimes);
  };

  const toggleWeekday = (weekday) => {
    setWeekdays(prev => 
      prev.includes(weekday) 
        ? prev.filter(w => w !== weekday)
        : [...prev, weekday].sort()
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.cancelButton}>{t('cancel')}</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>
            {reminder ? t('edit_reminder') : t('new_reminder')}
          </Text>
          <TouchableOpacity onPress={handleSave}>
            <Text style={styles.saveButton}>{t('save')}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.formContainer}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('medication_name')}</Text>
            <TextInput
              style={styles.textInput}
              value={medicationName}
              onChangeText={setMedicationName}
              placeholder={t('enter_medication_name')}
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('times')}</Text>
            {times.map((timeSlot, index) => (
              <View key={index} style={styles.timeSlotContainer}>
                <TextInput
                  style={[styles.textInput, styles.timeInput]}
                  value={timeSlot}
                  onChangeText={value => updateTimeSlot(index, value)}
                  placeholder={t('hh_mm')}
                  placeholderTextColor="#999"
                />
                {times.length > 1 && (
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => removeTimeSlot(index)}>
                    <Icon name="remove-circle" size={24} color="#FF6B6B" />
                  </TouchableOpacity>
                )}
              </View>
            ))}
            <TouchableOpacity style={styles.addButton} onPress={addTimeSlot}>
              <Icon name="add-circle" size={24} color="#316CEB" />
              <Text style={styles.addTimeButtonText}>{t('add_time')}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('recurrence')}</Text>
            {recurrenceOptions.map(option => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.optionButton,
                  recurrenceType === option.value && styles.selectedOption,
                ]}
                onPress={() => setRecurrenceType(option.value)}>
                <Text
                  style={[
                    styles.optionText,
                    recurrenceType === option.value && styles.selectedOptionText,
                  ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {recurrenceType === 'custom' && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('every_x_days')}</Text>
              <TextInput
                style={styles.textInput}
                value={intervalDays.toString()}
                onChangeText={text => setIntervalDays(parseInt(text) || 1)}
                keyboardType="numeric"
                placeholder="1"
                placeholderTextColor="#999"
              />
            </View>
          )}

          {recurrenceType === 'interval' && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('every_x_hours')}</Text>
              <TextInput
                style={styles.textInput}
                value={intervalHours.toString()}
                onChangeText={text => setIntervalHours(parseInt(text) || 1)}
                keyboardType="numeric"
                placeholder="1"
                placeholderTextColor="#999"
              />
            </View>
          )}

          {recurrenceType === 'weekdays' && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('select_days')}</Text>
              <View style={styles.weekdayContainer}>
                {weekdayOptions.map(day => (
                  <TouchableOpacity
                    key={day.value}
                    style={[
                      styles.weekdayButton,
                      weekdays.includes(day.value) && styles.selectedWeekday,
                    ]}
                    onPress={() => toggleWeekday(day.value)}>
                    <Text
                      style={[
                        styles.weekdayText,
                        weekdays.includes(day.value) && styles.selectedWeekdayText,
                      ]}>
                      {day.value === 1 ? t('mon') : 
                       day.value === 2 ? t('tue') :
                       day.value === 3 ? t('wed') :
                       day.value === 4 ? t('thu') :
                       day.value === 5 ? t('fri') :
                       day.value === 6 ? t('sat') :
                       t('sun')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <View style={styles.inputGroup}>
            <View style={styles.switchContainer}>
              <Text style={styles.label}>{t('enabled')}</Text>
              <Switch
                value={enabled}
                onValueChange={setEnabled}
                trackColor={{ false: '#767577', true: '#81b0ff' }}
                thumbColor={enabled ? '#316CEB' : '#f4f3f4'}
              />
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const ReminderItem = ({ reminder, onEdit, onDelete, onToggle }) => {
  const { t } = useTranslation();
  
  const formatRecurrence = (recurrence) => {
    switch (recurrence.type) {
      case 'daily':
        return t('daily');
      case 'weekdays':
        return t('weekdays_only');
      case 'interval':
        return `${t('every_x_hours').replace('X', recurrence.intervalHours)}`;
      case 'custom':
        return `${t('every_x_days').replace('X', recurrence.intervalDays)}`;
      default:
        return t('unknown');
    }
  };

  const formatTimes = (times) => {
    return times.join(', ');
  };

  return (
    <View style={styles.reminderItem}>
      <View style={styles.reminderHeader}>
        <View style={styles.reminderInfo}>
          <Text style={styles.medicationName}>{reminder.medicationName}</Text>
          <Text style={styles.recurrenceText}>{formatRecurrence(reminder.recurrence)}</Text>
          <Text style={styles.timeText}>{formatTimes(reminder.times)}</Text>
        </View>
        <View style={styles.reminderActions}>
          <Switch
            value={reminder.enabled}
            onValueChange={() => onToggle(reminder.id)}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={reminder.enabled ? '#316CEB' : '#f4f3f4'}
          />
          <TouchableOpacity onPress={() => onEdit(reminder)}>
            <Icon name="edit" size={24} color="#316CEB" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onDelete(reminder.id)}>
            <Icon name="delete" size={24} color="#FF6B6B" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const UpcomingReminderItem = ({ reminder, onMarkTaken, onSkip }) => {
  const { t } = useTranslation();
  
  const formatTime = (timeString) => {
    const date = new Date(timeString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (timeString) => {
    const date = new Date(timeString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) {
      return t('today');
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return t('tomorrow');
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <View style={styles.upcomingItem}>
      <View style={styles.upcomingInfo}>
        <Text style={styles.upcomingMedication}>{reminder.medicationName}</Text>
        <Text style={styles.upcomingTime}>{formatTime(reminder.scheduledTime)}</Text>
        <Text style={styles.upcomingDate}>{formatDate(reminder.scheduledTime)}</Text>
      </View>
      <View style={styles.upcomingActions}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.takenButton]}
          onPress={() => onMarkTaken(reminder.reminderId, reminder.scheduledTime)}>
          <Icon name="check" size={20} color="#FFFFFF" />
          <Text style={styles.actionButtonText}>{t('taken')}</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionButton, styles.skipButton]}
          onPress={() => onSkip(reminder.reminderId, reminder.scheduledTime)}>
          <Icon name="skip-next" size={20} color="#FFFFFF" />
          <Text style={styles.actionButtonText}>{t('skip')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const HistoryItem = ({ historyEntry, onDelete }) => {
  const { t } = useTranslation();
  
  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const entryDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    let dateText;
    if (entryDate.getTime() === today.getTime()) {
      dateText = t('today');
    } else if (entryDate.getTime() === yesterday.getTime()) {
      dateText = t('yesterday');
    } else {
      dateText = date.toLocaleDateString();
    }
    
    const timeText = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    return `${dateText} at ${timeText}`;
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'taken':
        return { name: 'check-circle', color: '#4CAF50' };
      case 'skipped':
        return { name: 'skip-next', color: '#FF9800' };
      default:
        return { name: 'help', color: '#666666' };
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'taken':
        return t('taken');
      case 'skipped':
        return t('skipped');
      default:
        return t('unknown');
    }
  };

  const statusIcon = getStatusIcon(historyEntry.status);

  return (
    <View style={styles.historyItem}>
      <View style={styles.historyIcon}>
        <Icon name={statusIcon.name} size={24} color={statusIcon.color} />
      </View>
      <View style={styles.historyInfo}>
        <Text style={styles.historyMedication}>{historyEntry.medicationName}</Text>
        <Text style={styles.historyStatus}>{getStatusText(historyEntry.status)}</Text>
        <Text style={styles.historyDateTime}>{formatDateTime(historyEntry.actionTime)}</Text>
      </View>
      <View style={styles.historyActions}>
        <TouchableOpacity onPress={() => onDelete(historyEntry.id)}>
          <Icon name="delete" size={24} color="#FF6B6B" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default function ReminderScreen({ navigation }) {
  const { t } = useTranslation();
  const [reminders, setReminders] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingReminder, setEditingReminder] = useState(null);
  const [activeTab, setActiveTab] = useState('upcoming'); // 'upcoming', 'all', or 'history'

  const remindersKey = 'pharmasnap_reminders';

  useEffect(() => {
    loadReminders();
    loadHistory();
    initializeNotificationService();
  }, []);

  const initializeNotificationService = async () => {
    try {
      await NotificationService.initialize();
      await SimpleNotificationService.initialize();
    } catch (error) {
      console.error('❌ Failed to initialize notification services:', error);
    }
  };

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

  const loadHistory = async () => {
    try {
      const logs = await DatabaseService.getAllLogs();
      // Use the stored snapshot data instead of fetching current reminder data
      const historyWithMedicationNames = logs.map((log) => ({
        ...log,
        // Use the stored medication name from the snapshot
        medicationName: log.medicationName || 'Unknown Medication',
      }));
      setHistory(historyWithMedicationNames.sort((a, b) => new Date(b.actionTime) - new Date(a.actionTime)));
    } catch (error) {
      console.error('Error loading history:', error);
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
        try {
          await NotificationService.scheduleNotification(newReminder);
        } catch (error) {
          console.error('❌ Real reminder scheduling failed:', error);
          Alert.alert(t('scheduling_error'), `${t('failed_to_schedule_notification')}: ${error.message}`);
        }
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
        try {
          await NotificationService.scheduleNotification(updatedReminder);
        } catch (error) {
          console.error('❌ Updated reminder scheduling failed:', error);
        }
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
      await DatabaseService.logReminderAction(reminderId, scheduledTime, 'taken');
      await loadHistory(); // Refresh history
      console.log(`Marked reminder ${reminderId} as taken`);
      Alert.alert(t('success'), t('medication_marked_as_taken'));
    } catch (error) {
      console.error('Error marking reminder as taken:', error);
    }
  };

  const markReminderSkipped = async (reminderId, scheduledTime) => {
    try {
      await DatabaseService.logReminderAction(reminderId, scheduledTime, 'skipped');
      await loadHistory(); // Refresh history
      console.log(`Marked reminder ${reminderId} as skipped`);
      Alert.alert(t('skip'), t('reminder_skipped'));
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

  const handleSaveReminder = async (reminderData) => {
    try {
      if (editingReminder) {
        await updateReminder(editingReminder.id, reminderData);
      } else {
        await addReminder(reminderData);
      }
    } catch (error) {
      Alert.alert(t('error'), t('failed_to_save_reminder'));
      console.error('Error saving reminder:', error);
    }
  };

  const handleEditReminder = (reminder) => {
    setEditingReminder(reminder);
    setShowForm(true);
  };

  const handleDeleteReminder = (id) => {
    Alert.alert(
      t('delete_reminder'),
      t('are_you_sure_delete_reminder'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteReminder(id);
            } catch (error) {
              Alert.alert(t('error'), t('failed_to_delete_reminder'));
            }
          },
        },
      ]
    );
  };

  const handleToggleReminder = async (id) => {
    try {
      await toggleReminderEnabled(id);
    } catch (error) {
      Alert.alert(t('error'), t('failed_to_toggle_reminder'));
    }
  };

  const handleMarkTaken = async (reminderId, scheduledTime) => {
    try {
      await markReminderTaken(reminderId, scheduledTime);
    } catch (error) {
      Alert.alert(t('error'), t('failed_to_mark_as_taken'));
    }
  };

  const handleSkip = async (reminderId, scheduledTime) => {
    try {
      await markReminderSkipped(reminderId, scheduledTime);
    } catch (error) {
      Alert.alert(t('error'), t('failed_to_skip_reminder'));
    }
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingReminder(null);
  };

  const handleDeleteHistory = (logId) => {
    Alert.alert(
      t('delete_history_record'),
      t('are_you_sure_delete_history_record'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await DatabaseService.deleteLogById(logId);
              await loadHistory(); // Refresh history
            } catch (error) {
              Alert.alert(t('error'), t('failed_to_delete_history_record'));
            }
          },
        },
      ]
    );
  };

  const upcomingReminders = getUpcomingReminders();

  const renderUpcomingReminders = () => (
    <View style={styles.tabContent}>
      {upcomingReminders.length === 0 ? (
        <View style={styles.emptyState}>
          <Icon name="schedule" size={64} color="#CCCCCC" />
          <Text style={styles.emptyText}>{t('no_upcoming_reminders')}</Text>
          <Text style={styles.emptySubtext}>{t('add_reminder_to_get_started')}</Text>
        </View>
      ) : (
        <FlatList
          data={upcomingReminders.slice(0, 10)} // Show next 10
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <UpcomingReminderItem
              reminder={item}
              onMarkTaken={handleMarkTaken}
              onSkip={handleSkip}
            />
          )}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );

  const renderAllReminders = () => (
    <View style={styles.tabContent}>
      {reminders.length === 0 ? (
        <View style={styles.emptyState}>
          <Icon name="schedule" size={64} color="#CCCCCC" />
          <Text style={styles.emptyText}>{t('no_reminders_yet')}</Text>
          <Text style={styles.emptySubtext}>{t('tap_plus_to_add_first_reminder')}</Text>
        </View>
      ) : (
        <FlatList
          data={reminders}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <ReminderItem
              reminder={item}
              onEdit={handleEditReminder}
              onDelete={handleDeleteReminder}
              onToggle={handleToggleReminder}
            />
          )}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );

  const renderHistory = () => (
    <View style={styles.tabContent}>
      {history.length === 0 ? (
        <View style={styles.emptyState}>
          <Icon name="history" size={64} color="#CCCCCC" />
          <Text style={styles.emptyText}>{t('no_history_yet')}</Text>
          <Text style={styles.emptySubtext}>{t('medication_actions_will_appear_here')}</Text>
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <HistoryItem historyEntry={item} onDelete={handleDeleteHistory} />
          )}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Title Bar */}
      <View style={styles.titleBar}>
        <Text style={styles.title}>{t('pharmasnap')}</Text>
      </View>

      {/* Main Content */}
      <View style={styles.container}>
        <View style={styles.headerSection}>
          <Text style={styles.sectionTitle}>{t('medication_reminders')}</Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity 
              style={[styles.addButton, {backgroundColor: '#316CEB', paddingHorizontal: 24}]} 
              onPress={() => setShowForm(true)}
              activeOpacity={0.7}
            >
              <Icon name="add" size={24} color="#FFFFFF" />
              <Text style={[styles.addButtonText, {color: '#FFFFFF', marginLeft: 8}]}>{t('add')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'upcoming' && styles.activeTab]}
            onPress={() => setActiveTab('upcoming')}>
            <Text style={[styles.tabText, activeTab === 'upcoming' && styles.activeTabText]}>
              {t('upcoming')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'all' && styles.activeTab]}
            onPress={() => setActiveTab('all')}>
            <Text style={[styles.tabText, activeTab === 'all' && styles.activeTabText]}>
              {t('all_reminders')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'history' && styles.activeTab]}
            onPress={() => setActiveTab('history')}>
            <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>
              {t('history')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        {activeTab === 'upcoming' && renderUpcomingReminders()}
        {activeTab === 'all' && renderAllReminders()}
        {activeTab === 'history' && renderHistory()}
      </View>

      {/* Navigation Bar */}
      <View style={styles.navigationBar}>
        <TouchableOpacity style={styles.navButton} onPress={() => navigation.navigate('Welcome')}>
          <Icon name="home" size={32} color="#000000" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.navButton} onPress={() => navigation.navigate('PharmaSnap')}>
          <Icon name="camera-alt" size={32} color="#000000" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.navButton} onPress={() => navigation.navigate('MyMedicine')}>
          <Icon name="star" size={32} color="#000000" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.navButton}>
          <Icon name="schedule" size={32} color="#316CEB" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.navButton} onPress={() => navigation.navigate('Chatbot')}>
          <Icon name="chat" size={32} color="#000000" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.navButton} onPress={() => navigation.navigate('Info')}>
          <Icon name="info" size={32} color="#000000" />
        </TouchableOpacity>
      </View>

      {/* Reminder Form Modal */}
      <ReminderForm
        visible={showForm}
        onClose={handleCloseForm}
        reminder={editingReminder}
        onSave={handleSaveReminder}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  titleBar: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
   title: {
     fontSize: 32,
     fontWeight: 'bold',
     color: '#316CEB',
   },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  headerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 16,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
   addButton: {
     flexDirection: 'row',
     alignItems: 'center',
     backgroundColor: '#316CEB',
     paddingHorizontal: 24,
     paddingVertical: 8,
     borderRadius: 20,
     shadowColor: '#316CEB',
     shadowOffset: {
       width: 0,
       height: 2,
     },
     shadowOpacity: 0.25,
     shadowRadius: 4,
     elevation: 4,
   },
  addButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    marginLeft: 8,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
   activeTab: {
     backgroundColor: '#316CEB',
   },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666666',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  tabContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    color: '#666666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999999',
    marginTop: 8,
    textAlign: 'center',
  },
  reminderItem: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  reminderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reminderInfo: {
    flex: 1,
  },
  medicationName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  recurrenceText: {
    fontSize: 14,
    color: '#666666',
    marginTop: 4,
  },
  timeText: {
    fontSize: 14,
    color: '#316CEB',
    marginTop: 2,
  },
  reminderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  upcomingItem: {
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  upcomingInfo: {
    marginBottom: 12,
  },
  upcomingMedication: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1B5E20',
  },
  upcomingTime: {
    fontSize: 16,
    color: '#2E7D32',
    marginTop: 4,
  },
  upcomingDate: {
    fontSize: 14,
    color: '#4CAF50',
    marginTop: 2,
  },
  upcomingActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
  },
  takenButton: {
    backgroundColor: '#4CAF50',
  },
  skipButton: {
    backgroundColor: '#FF9800',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    marginLeft: 4,
  },
  navigationBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 80,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 20,
    paddingHorizontal: 15,
  },
  navButton: {
    flex: 1,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 8,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  cancelButton: {
    fontSize: 16,
    color: '#666666',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  saveButton: {
    fontSize: 16,
    color: '#316CEB',
    fontWeight: '600',
  },
  formContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#000000',
  },
  timeSlotContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  timeInput: {
    flex: 1,
    marginRight: 8,
  },
  removeButton: {
    padding: 4,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#316CEB',
    borderRadius: 8,
    borderStyle: 'dashed',
  },
  addTimeButtonText: {
    color: '#316CEB',
    marginLeft: 8,
    fontWeight: '600',
  },
  optionButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 8,
  },
  selectedOption: {
    backgroundColor: '#E8F5E9',
    borderColor: '#316CEB',
  },
  optionText: {
    fontSize: 16,
    color: '#000000',
  },
  selectedOptionText: {
    color: '#316CEB',
    fontWeight: '600',
  },
  weekdayContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  weekdayButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
  },
  selectedWeekday: {
    backgroundColor: '#316CEB',
    borderColor: '#316CEB',
  },
  weekdayText: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
  },
  selectedWeekdayText: {
    color: '#FFFFFF',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  // History styles
  historyItem: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyIcon: {
    marginRight: 16,
  },
  historyInfo: {
    flex: 1,
  },
  historyActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  historyMedication: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  historyStatus: {
    fontSize: 14,
    color: '#666666',
    marginTop: 4,
  },
  historyDateTime: {
    fontSize: 14,
    color: '#316CEB',
    marginTop: 2,
  },
});