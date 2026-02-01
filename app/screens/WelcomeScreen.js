// WelcomeScreen, under the folder "app/screens", is the 2nd screen of this app. It contains the disclaimer.

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useTranslation} from 'react-i18next';

export default function WelcomeScreen({navigation}) {
  const {t} = useTranslation();
  const goToPharmaSnap = () => navigation.navigate('PharmaSnap');
  const goToMyMedicine = () => navigation.navigate('MyMedicine');
  const goToInfo = () => navigation.navigate('Info');
  const goToReminders = () => navigation.navigate('Reminders');
  const goToChatbot = () => navigation.navigate('Chatbot');
  const goToHome = () => navigation.navigate('LanguageSelection');

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.homeButton} onPress={goToHome}>
          <Icon name="language" size={24} color="#316CEB" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('pharmasnap')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Vertical Action List */}
      <View style={styles.cabinetContainer}>
        <View style={styles.list}>
          <TouchableOpacity 
            style={styles.cardButton} 
            onPress={goToPharmaSnap}
            accessibilityLabel="Identify Medicine"
            accessibilityHint="Tap to identify medication using camera"
            accessibilityRole="button"
          >
            <View style={styles.cardContent}>
              <View style={styles.iconCircle}>
                <Icon name="camera-alt" size={32} color="#316CEB" />
              </View>
              <Text style={styles.cardText}>{t('identify_medicine')}</Text>
              <Icon name="chevron-right" size={28} color="#90A4AE" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.cardButton} 
            onPress={goToMyMedicine}
            accessibilityLabel="My Medicine"
            accessibilityHint="Tap to view your saved medications"
            accessibilityRole="button"
          >
            <View style={styles.cardContent}>
              <View style={styles.iconCircle}>
                <Icon name="star" size={32} color="#316CEB" />
              </View>
              <Text style={styles.cardText}>{t('my_medicine')}</Text>
              <Icon name="chevron-right" size={28} color="#90A4AE" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.cardButton} 
            onPress={goToReminders}
            accessibilityLabel="Reminders"
            accessibilityHint="Tap to set medication reminders"
            accessibilityRole="button"
          >
            <View style={styles.cardContent}>
              <View style={styles.iconCircle}>
                <Icon name="schedule" size={32} color="#316CEB" />
              </View>
              <Text style={styles.cardText}>{t('reminders')}</Text>
              <Icon name="chevron-right" size={28} color="#90A4AE" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.cardButton} 
            onPress={goToChatbot}
            accessibilityLabel="AI Pharmacist"
            accessibilityHint="Tap to ask questions about medications"
            accessibilityRole="button"
          >
            <View style={styles.cardContent}>
              <View style={styles.iconCircle}>
                <Icon name="chat" size={32} color="#316CEB" />
              </View>
              <Text style={styles.cardText}>{t('ai_pharmacist')}</Text>
              <Icon name="chevron-right" size={28} color="#90A4AE" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.cardButton} 
            onPress={goToInfo}
            accessibilityLabel="Info"
            accessibilityHint="Tap to view app information and contact details"
            accessibilityRole="button"
          >
            <View style={styles.cardContent}>
              <View style={styles.iconCircle}>
                <Icon name="info" size={32} color="#316CEB" />
              </View>
              <Text style={styles.cardText}>{t('info')}</Text>
              <Icon name="chevron-right" size={28} color="#90A4AE" />
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    justifyContent: 'space-between',
  },
  homeButton: {
    padding: 8,
    borderRadius: 20,
  },
  headerSpacer: {
    width: 40, // Same width as home button to center the title
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#316CEB',
    textAlign: 'center',
  },
  cabinetContainer: {
    flex: 1,
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  list: {
    gap: 18,
  },
  cardButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 22,
    paddingHorizontal: 20,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
    minHeight: 80,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 36,
  },
  iconCircle: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  cardText: {
    flex: 1,
    fontSize: 22,
    color: '#000000',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
