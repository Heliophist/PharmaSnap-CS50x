import React from 'react';
import {View, Text, StyleSheet, SafeAreaView, StatusBar, TouchableOpacity, Linking} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useTranslation} from 'react-i18next';

export default function InfoScreen({navigation}) {
  const {t} = useTranslation();
  const openWebsite = async () => {
    try {
      await Linking.openURL('https://medlingual.app/');
    } catch (error) {
      console.error('Failed to open website:', error);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Title Bar */}
      <View style={styles.titleBar}>
        <Text style={styles.title}>{t('pharmasnap')}</Text>
      </View>

      {/* Main Content */}
      <View style={styles.container}>
        <Text style={styles.sectionTitle}>{t('about')}</Text>
        <Text style={styles.contentText}>{t('this_app_created_by_alex_z')}</Text>
        <Text style={styles.contentText}></Text>
        <Text style={styles.contentText}></Text>
        <Text style={styles.sectionTitle}>{t('bug_report')}</Text>
        <Text style={styles.contentText}>{t('email')}: {t('pharmasnapapp_gmail_com')}</Text>
        <Text style={styles.contentText}></Text>
        <Text style={styles.contentText}></Text>
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
        <TouchableOpacity style={styles.navButton} onPress={() => navigation.navigate('Reminders')}>
          <Icon name="schedule" size={32} color="#000000" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.navButton} onPress={() => navigation.navigate('Chatbot')}>
          <Icon name="chat" size={32} color="#000000" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.navButton}>
          <Icon name="info" size={32} color="#316CEB" />
        </TouchableOpacity>
      </View>
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
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 12,
  },
  contentText: {
    fontSize: 18,
    color: '#333333',
    lineHeight: 24,
  },
  link: {
    color: '#1565C0',
    textDecorationLine: 'underline',
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
}); 