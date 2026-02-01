import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useFavorites} from '../context/FavoritesContext';
import MedicationDetails from '../components/MedicationDetails';
import {useTranslation} from 'react-i18next';

// Utility function to check if medication is expired
const isMedicationExpired = (expirationText) => {
  if (!expirationText) return false;
  
  try {
    // Handle MM/YYYY format
    const mmYYYY = expirationText.match(/^(\d{1,2})\/(\d{4})$/);
    if (mmYYYY) {
      const month = parseInt(mmYYYY[1], 10);
      const year = parseInt(mmYYYY[2], 10);
      const expirationDate = new Date(year, month - 1); // month is 0-indexed
      return expirationDate < new Date();
    }
    
    // Handle MM/YY format
    const mmYY = expirationText.match(/^(\d{1,2})\/(\d{2})$/);
    if (mmYY) {
      const month = parseInt(mmYY[1], 10);
      const year = 2000 + parseInt(mmYY[2], 10);
      const expirationDate = new Date(year, month - 1);
      return expirationDate < new Date();
    }
    
    return false;
  } catch (error) {
    console.error('Error parsing expiration date:', error);
    return false;
  }
};

// Utility function to parse expiration date for sorting
const parseExpirationDate = (expirationText) => {
  if (!expirationText) return null;
  
  // Handle MM/YYYY format
  const mmYYYY = expirationText.match(/^(\d{1,2})\/(\d{4})$/);
  if (mmYYYY) {
    const month = parseInt(mmYYYY[1], 10);
    const year = parseInt(mmYYYY[2], 10);
    return new Date(year, month - 1); // month is 0-indexed
  }
  
  // Handle MM/YY format
  const mmYY = expirationText.match(/^(\d{1,2})\/(\d{2})$/);
  if (mmYY) {
    const month = parseInt(mmYY[1], 10);
    const year = 2000 + parseInt(mmYY[2], 10);
    return new Date(year, month - 1);
  }
  
  return null;
};

// Sort favorites by expiration date
const sortFavoritesByDate = (favorites, order = 'asc') => {
  return [...favorites].sort((a, b) => {
    const dateA = parseExpirationDate(a.expirationDate);
    const dateB = parseExpirationDate(b.expirationDate);
    
    // Handle null dates (put them at the end)
    if (!dateA && !dateB) return 0;
    if (!dateA) return 1;
    if (!dateB) return -1;
    
    return order === 'asc' ? dateA - dateB : dateB - dateA;
  });
};

const FavoriteMedicationItem = ({medication, onDelete}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const {t} = useTranslation();

  const handleDelete = () => {
    Alert.alert(
      t('delete'),
      `${t('delete')} ${medication.brandName}?`,
      [
        {
          text: t('cancel'),
          style: 'cancel',
        },
        {
          text: t('delete'),
          style: 'destructive',
          onPress: () => onDelete(medication.brandName),
        },
      ]
    );
  };

  return (
    <View style={styles.medicationItem}>
      <View style={styles.medicationHeader}>
        <TouchableOpacity
          style={styles.medicationTitleContainer}
          onPress={() => setIsExpanded(!isExpanded)}>
          <View style={styles.medicationTitleContainer}>
            <Text style={styles.medicationName}>{medication.brandName}</Text>
            {medication.formattedExpiration ? (
              <Text style={[styles.expirationText, {
                color: isMedicationExpired(medication.formattedExpiration) ? '#E74C3C' : '#2ECC71',
                fontWeight: '500'
              }]}>
                Expires: {medication.formattedExpiration}
              </Text>
            ) : (
              <Text style={styles.noExpirationText}>No date detected</Text>
            )}
          </View>
        </TouchableOpacity>
        <View style={styles.medicationActions}>
          <Icon
            name={isExpanded ? 'expand-less' : 'expand-more'}
            size={24}
            color="#000000"
          />
          <TouchableOpacity onPress={handleDelete} style={styles.deleteButton}>
            <Icon name="delete" size={24} color="#FF6B6B" />
          </TouchableOpacity>
        </View>
      </View>

      {isExpanded && (
        <View style={styles.expandedContent}>
          <Image source={{uri: medication.imageUri}} style={styles.medicationImage} />
          {medication.ndc && (
            <MedicationDetails
              label={t('product_ndc')}
              content={medication.ndc}
              fontSize={16}
            />
          )}
          {medication.activeIngredient && (
            <MedicationDetails
              label={t('active_ingredient')}
              content={medication.activeIngredient}
              fontSize={16}
            />
          )}
          {medication.purpose && (
            <MedicationDetails
              label={t('purpose')}
              content={medication.purpose}
              fontSize={16}
            />
          )}
          {medication.indications && (
            <MedicationDetails
              label={t('indications_and_usage')}
              content={medication.indications}
              fontSize={16}
            />
          )}
          {medication.dosage && (
            <MedicationDetails
              label={t('dosage_and_administration')}
              content={medication.dosage}
              fontSize={16}
            />
          )}
          {medication.warnings && (
            <MedicationDetails
              label={t('warnings')}
              content={medication.warnings}
              fontSize={16}
              isWarning={true}
            />
          )}
          {medication.doNotUse && (
            <MedicationDetails
              label={t('do_not_use')}
              content={medication.doNotUse}
              fontSize={16}
              isWarning={true}
            />
          )}
          {medication.stopUse && (
            <MedicationDetails
              label={t('stop_use')}
              content={medication.stopUse}
              fontSize={16}
              isWarning={true}
            />
          )}
          {medication.pregnancy && (
            <MedicationDetails
              label={t('pregnancy_or_breastfeeding')}
              content={medication.pregnancy}
              fontSize={16}
              isWarning={true}
            />
          )}
          {!medication.indications && 
           !medication.dosage && 
           !medication.doNotUse && 
           !medication.pregnancy && 
           !medication.stopUse && 
           !medication.warnings &&
           !medication.ndc &&
           !medication.activeIngredient &&
           !medication.purpose && (
            <Text style={styles.noDataText}>
              {t('no_medication_data_available')}
            </Text>
          )}
        </View>
      )}
    </View>
  );
};

export default function MyMedicine({navigation}) {
  const {favorites, isLoading, removeFavorite} = useFavorites();
  const {t} = useTranslation();
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' or 'desc'

  const sortedFavorites = sortFavoritesByDate(favorites, sortOrder);

  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  const handleDeleteMedication = async (brandName) => {
    await removeFavorite(brandName);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Title Bar */}
      <View style={styles.titleBar}>
        <Text style={styles.title}>{t('pharmasnap')}</Text>
      </View>

      {/* Main Content */}
      <ScrollView style={styles.container}>
        <View style={styles.headerSection}>
          <Text style={styles.sectionTitle}>{t('my_medicines')}</Text>
          {!isLoading && favorites.length > 0 && (
            <TouchableOpacity style={styles.sortButton} onPress={toggleSortOrder}>
              <Icon 
                name={sortOrder === 'asc' ? 'arrow-upward' : 'arrow-downward'} 
                size={20} 
                color="#316CEB" 
              />
              <Text style={styles.sortButtonText}>
                {sortOrder === 'asc' ? 'Oldest First' : 'Newest First'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>{t('loading')}</Text>
          </View>
        ) : favorites.length === 0 ? (
          <Text style={styles.emptyText}>{t('no_data_available')}</Text>
        ) : (
          sortedFavorites.map((medication, index) => (
            <FavoriteMedicationItem
              key={`${medication.brandName}-${index}`}
              medication={medication}
              onDelete={handleDeleteMedication}
            />
          ))
        )}
      </ScrollView>

      {/* Navigation Bar */}
      <View style={styles.navigationBar}>
        <TouchableOpacity 
          style={styles.navButton} 
          onPress={() => navigation.navigate('Welcome')}>
          <Icon name="home" size={32} color="#000000" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.navButton} onPress={() => navigation.navigate('PharmaSnap')}>
          <Icon name="camera-alt" size={32} color="#000000" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.navButton}>
          <Icon name="star" size={32} color="#316CEB" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.navButton} onPress={() => navigation.navigate('Reminders')}>
          <Icon name="schedule" size={32} color="#000000" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.navButton} onPress={() => navigation.navigate('Chatbot')}>
          <Icon name="chat" size={32} color="#000000" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.navButton} onPress={() => navigation.navigate('Info')}>
          <Icon name="info" size={32} color="#000000" />
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
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0EBFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  sortButtonText: {
    fontSize: 14,
    color: '#316CEB',
    marginLeft: 4,
    fontWeight: '500',
  },
  emptyText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginTop: 20,
  },
  medicationItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    marginHorizontal: 20,
    paddingVertical: 12,
  },
  medicationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  medicationTitleContainer: {
    flex: 1,
  },
  medicationActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deleteButton: {
    padding: 4,
  },
  medicationName: {
    fontSize: 18,
    fontWeight: '500',
    color: '#316CEB',
  },
  expirationText: {
    fontSize: 14,
    color: '#666666',
    marginTop: 2,
  },
  noExpirationText: {
    fontSize: 14,
    color: '#999999',
    fontStyle: 'italic',
    marginTop: 2,
  },
  expandedContent: {
    marginTop: 12,
  },
  medicationImage: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    marginBottom: 12,
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
  noDataText: {
    textAlign: 'center',
    marginTop: 20,
    color: '#808080',
    fontSize: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#666666',
    fontStyle: 'italic',
  },
});
