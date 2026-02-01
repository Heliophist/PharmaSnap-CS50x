// PharmaSnapScreen, under the folder "app/screens", is the 3rd screen of this app. It's the main one.

import React, {useRef, useEffect} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  StyleSheet,
  Dimensions,
  SafeAreaView,
  StatusBar,
  Alert,
  Animated,
  Easing,
  Linking,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import {launchCamera, launchImageLibrary} from 'react-native-image-picker';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {
  extractMedicationFromImage,
  extractExpirationFromImage,
  queryOpenFDA,
  translateTexts,
} from '../services/apiService';
import MedicationDetails from '../components/MedicationDetails';
import {OPENAI_API_KEY, GOOGLE_TRANSLATION_API_KEY} from '../../config';
import {useFavorites} from '../context/FavoritesContext';
import {useMedicationState} from '../context/MedicationContext';

const {width: screenWidth} = Dimensions.get('window');
const IMAGE_HEIGHT = 200;

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

export default function PharmaSnapScreen({navigation}) {
  const {t, i18n} = useTranslation();
  const currentLanguage = i18n.language;
  const previousLanguage = useRef(currentLanguage);
  const {toggleFavorite, isFavorite} = useFavorites();
  const {medicationState, updateMedicationState, resetMedicationState} = useMedicationState();

  // Animated values
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const glowInterval = useRef(null);
  const textInterval = useRef(null);

  const increaseFontSize = () => {
    updateMedicationState({ fontSize: medicationState.fontSize + 2 });
  };

  const decreaseFontSize = () => {
    if (medicationState.fontSize > 10) {
      updateMedicationState({ fontSize: medicationState.fontSize - 2 });
    }
  };

  // Update the rotation animation to create a border effect
  const startRotationAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const borderTranslate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-(screenWidth - 40), 0],
  });

  // Clean up animations
  const cleanupAnimations = () => {
    rotateAnim.setValue(0);
    if (glowInterval.current) clearInterval(glowInterval.current);
    if (textInterval.current) clearInterval(textInterval.current);
  };

  // Start glow effect
  const startGlowEffect = () => {
    glowInterval.current = setInterval(() => {
      updateMedicationState(prev => ({
        ...prev,
        glowOpacity: prev.glowOpacity === 0.3 ? 0.6 : 0.3
      }));
    }, 1000);
  };

  // Start text animation
  const startTextAnimation = () => {
    textInterval.current = setInterval(() => {
      updateMedicationState(prev => ({
        ...prev,
        textOpacity: prev.textOpacity === 1 ? 0.4 : 1
      }));
    }, 800);
  };

  const processMedicationImage = async imagePath => {
    updateMedicationState({ 
      isLoading: true,
      imageUri: imagePath,
      glowOpacity: 0.3,
      textOpacity: 1
    });
    resetMedicationState();
    
    startRotationAnimation();
    startGlowEffect();
    startTextAnimation();
    
    try {
      const brandName = await extractMedicationFromImage(imagePath, OPENAI_API_KEY);
      updateMedicationState({ brandName });
      
      if (brandName && brandName !== 'Not Found') {
        try {
          const drugData = await queryOpenFDA(brandName);
          await updateMedicationDetails(drugData);
        } catch (fdaError) {
          console.error('Error querying OpenFDA:', fdaError);
          Alert.alert(
            t('medication_not_found'),
            t('medication_not_in_database'),
            [{text: t('ok')}]
          );
        }
      } else {
        Alert.alert(
          t('no_medication_found'),
          t('please_try_again_with_clearer_image'),
          [{text: t('ok')}]
        );
      }
    } catch (error) {
      console.error('Error processing medication image:', error);
      let errorMessage = t('error_processing_image');
      
      if (error.response) {
        const statusCode = error.response.status;
        const errorType = error.response.data?.error?.type;
        const errorCode = error.response.data?.error?.code;

        if (statusCode === 401) {
          errorMessage = t('api_key_invalid');
        } else if (statusCode === 429) {
          errorMessage = t('rate_limit_exceeded');
        } else if (statusCode === 413) {
          errorMessage = t('image_too_large');
        } else if (errorType === 'invalid_request_error') {
          if (errorCode === 'model_not_found') {
            errorMessage = t('vision_model_unavailable');
          } else {
            errorMessage = t('invalid_request');
          }
        } else if (statusCode === 500 || statusCode === 503) {
          errorMessage = t('service_unavailable');
        }
      } else if (error.message?.includes('Network Error')) {
        errorMessage = t('network_error');
      }
      
      Alert.alert(
        t('error'),
        errorMessage,
        [{
          text: t('retry'),
          onPress: () => processMedicationImage(imagePath),
          style: 'default'
        },
        {
          text: t('ok'),
          style: 'cancel'
        }]
      );
    } finally {
      updateMedicationState({ isLoading: false });
      cleanupAnimations();
    }
  };

  const handleCamera = () => {
    launchCamera(
      {
        mediaType: 'photo',
        saveToPhotos: true,
        quality: 1,
        includeBase64: false,
      },
      response => {
        if (response.didCancel) return;
        if (response.errorCode) {
          Alert.alert(t('error'), response.errorMessage);
          return;
        }
        if (response.assets?.[0]?.uri) {
          processMedicationImage(response.assets[0].uri);
        }
      }
    );
  };

  const handleGallery = () => {
    launchImageLibrary(
      {
        mediaType: 'photo',
        quality: 1,
        includeBase64: false,
      },
      response => {
        if (response.didCancel) return;
        if (response.errorCode) {
          Alert.alert(t('error'), response.errorMessage);
          return;
        }
        if (response.assets?.[0]?.uri) {
          processMedicationImage(response.assets[0].uri);
        }
      }
    );
  };

  // Sequential photo capture handlers
  const handleTakePhoto = () => {
    // First photo - front
    launchCamera(
      {
        mediaType: 'photo',
        saveToPhotos: true,
        quality: 1,
        includeBase64: false,
      },
      response => {
        if (response.didCancel) return;
        if (response.errorCode) {
          Alert.alert(t('error'), response.errorMessage);
          return;
        }
        if (response.assets?.[0]?.uri) {
          processMedicationImage(response.assets[0].uri);
          
          // After processing front photo, prompt for back photo
          setTimeout(() => {
            Alert.alert(
              t('take_back_photo'),
              t('now_take_photo_of_back'),
              [
                {
                  text: t('take_back_photo'),
                  onPress: () => {
                    launchCamera(
                      {
                        mediaType: 'photo',
                        saveToPhotos: true,
                        quality: 1,
                        includeBase64: false,
                      },
                      backResponse => {
                        if (backResponse.didCancel) return;
                        if (backResponse.errorCode) {
                          Alert.alert(t('error'), backResponse.errorMessage);
                          return;
                        }
                        if (backResponse.assets?.[0]?.uri) {
                          processExpirationImage(backResponse.assets[0].uri);
                        }
                      }
                    );
                  }
                },
                {
                  text: t('skip_back_photo'),
                  style: 'cancel'
                }
              ]
            );
          }, 2000); // Wait 2 seconds for front photo processing to start
        }
      }
    );
  };

  const handleChooseAlbum = () => {
    // First photo - front
    launchImageLibrary(
      {
        mediaType: 'photo',
        quality: 1,
        includeBase64: false,
      },
      response => {
        if (response.didCancel) return;
        if (response.errorCode) {
          Alert.alert(t('error'), response.errorMessage);
          return;
        }
        if (response.assets?.[0]?.uri) {
          processMedicationImage(response.assets[0].uri);
          
          // After processing front photo, prompt for back photo
          setTimeout(() => {
            Alert.alert(
              t('choose_back_photo'),
              t('now_choose_photo_of_back'),
              [
                {
                  text: t('choose_back_photo'),
                  onPress: () => {
                    launchImageLibrary(
                      {
                        mediaType: 'photo',
                        quality: 1,
                        includeBase64: false,
                      },
                      backResponse => {
                        if (backResponse.didCancel) return;
                        if (backResponse.errorCode) {
                          Alert.alert(t('error'), backResponse.errorMessage);
                          return;
                        }
                        if (backResponse.assets?.[0]?.uri) {
                          processExpirationImage(backResponse.assets[0].uri);
                        }
                      }
                    );
                  }
                },
                {
                  text: t('skip_back_photo'),
                  style: 'cancel'
                }
              ]
            );
          }, 2000); // Wait 2 seconds for front photo processing to start
        }
      }
    );
  };

  const updateMedicationDetails = async data => {
    const indicationsData = data.indications_and_usage?.join('\n') || '';
    const dosageData = data.dosage_and_administration?.join('\n') || '';
    const warningsData = data.warnings?.join('\n') || '';
    const doNotUseData = data.do_not_use?.join('\n') || '';
    const stopUseData = data.stop_use?.join('\n') || '';
    const pregnancyData = data.pregnancy_or_breast_feeding?.join('\n') || '';
    const ndcData = data.openfda?.product_ndc?.join('\n') || '';
    const activeIngredientData = data.active_ingredient?.join('\n') || '';
    const purposeData = data.purpose?.join('\n') || '';
    const sourceUrl = data.sourceUrl;

    if (currentLanguage !== 'en') {
      try {
        const [
          translatedIndications,
          translatedDosage,
          translatedWarnings,
          translatedDoNotUse,
          translatedStopUse,
          translatedPregnancy,
          translatedActiveIngredient,
          translatedPurpose,
        ] = await translateTexts(
          [
            indicationsData,
            dosageData,
            warningsData,
            doNotUseData,
            stopUseData,
            pregnancyData,
            activeIngredientData,
            purposeData,
          ],
          currentLanguage,
          GOOGLE_TRANSLATION_API_KEY
        );

        updateMedicationState({
          indications: translatedIndications,
          dosage: translatedDosage,
          warnings: translatedWarnings,
          doNotUse: translatedDoNotUse,
          stopUse: translatedStopUse,
          pregnancy: translatedPregnancy,
          ndc: ndcData,
          activeIngredient: translatedActiveIngredient,
          purpose: translatedPurpose,
          sourceUrl,
        });
      } catch (error) {
        Alert.alert(
          t('translation_unavailable'), 
          t('medication_info_english_fallback'),
          [{text: t('ok')}]
        );
        updateMedicationState({
          indications: indicationsData,
          dosage: dosageData,
          warnings: warningsData,
          doNotUse: doNotUseData,
          stopUse: stopUseData,
          pregnancy: pregnancyData,
          ndc: ndcData,
          activeIngredient: activeIngredientData,
          purpose: purposeData,
          sourceUrl,
        });
      }
    } else {
      updateMedicationState({
        indications: indicationsData,
        dosage: dosageData,
        warnings: warningsData,
        doNotUse: doNotUseData,
        stopUse: stopUseData,
        pregnancy: pregnancyData,
        ndc: ndcData,
        activeIngredient: activeIngredientData,
        purpose: purposeData,
        sourceUrl,
      });
    }
  };

  const extractExpirationDate = (rawText) => {
    if (!rawText) return null;
    const normalized = String(rawText).replace(/\s+/g, '').toUpperCase();
    // Patterns like EXP02/2026 or EXP02/26 or Expires:02/2026
    const mmYYYY = /(?:EXP|EXPIRES:?)(\d{2})\/(\d{4})/i;
    const mmYY = /(?:EXP|EXPIRES:?)(\d{2})\/(\d{2})/i;
    const matchFull = normalized.match(mmYYYY);
    if (matchFull) {
      const month = matchFull[1];
      const year = matchFull[2];
      return { month, year };
    }
    const matchShort = normalized.match(mmYY);
    if (matchShort) {
      const month = matchShort[1];
      const shortYear = matchShort[2];
      const year = `20${shortYear}`; // assume 20YY
      return { month, year };
    }
    // Also handle if model already returned MM/YYYY without prefixes
    const plainFull = /^(\d{2})\/(\d{4})$/;
    const plainFullMatch = rawText.trim().match(plainFull);
    if (plainFullMatch) {
      return { month: plainFullMatch[1], year: plainFullMatch[2] };
    }
    return null;
  };

  const formatExpiration = ({ month, year }) => {
    const monthNum = parseInt(month, 10);
    if (!monthNum || monthNum < 1 || monthNum > 12) return `Invalid date (${month}/${year})`;
    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    return `${monthNames[monthNum - 1]} ${year}`;
  };

  const processExpirationImage = async imagePath => {
    updateMedicationState({
      backImageUri: imagePath,
      isParsingExpiration: true,
      glowOpacity: 0.3,
      textOpacity: 1
    });
    
    startRotationAnimation();
    startGlowEffect();
    startTextAnimation();
    
    try {
      const expRaw = await extractExpirationFromImage(imagePath, OPENAI_API_KEY);
      const parsed = extractExpirationDate(expRaw);
      if (parsed) {
        updateMedicationState({ expiration: `${parsed.month}/${parsed.year}`, formattedExpiration: formatExpiration(parsed) });
      } else {
        updateMedicationState({ expiration: null, formattedExpiration: null });
        Alert.alert(t('info'), t('no_medication_data_available'));
      }
    } catch (error) {
      console.error('Error processing expiration image:', error);
      Alert.alert(t('error'), t('error_processing_image'));
    } finally {
      updateMedicationState({ isParsingExpiration: false });
      cleanupAnimations();
    }
  };

  const handleFavoritePress = async () => {
    await toggleFavorite(medicationState);
  };

  useEffect(() => {
    return () => {
      cleanupAnimations();
    };
  }, []);

  // Add language change detection and reset
  useEffect(() => {
    if (previousLanguage.current !== currentLanguage) {
      // Language has changed, reset the screen
      cleanupAnimations();
      resetMedicationState();
      updateMedicationState({
        imageUri: null,
        brandName: null,
        indications: null,
        dosage: null,
        warnings: null,
        doNotUse: null,
        stopUse: null,
        pregnancy: null,
        fontSize: 16,
        isLoading: false,
        glowOpacity: 0.3,
        textOpacity: 1
      });
      previousLanguage.current = currentLanguage;
    }
  }, [currentLanguage]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('pharmasnap')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.iconContainer}>
          <View style={{ alignItems: 'center' }}>
            <TouchableOpacity 
              style={[styles.circularButton, medicationState.isLoading && styles.disabledButton]} 
              onPress={handleTakePhoto}
              disabled={medicationState.isLoading}>
              <Icon name="camera-alt" size={32} color={medicationState.isLoading ? "#A0A0A0" : "#FFFFFF"} />
            </TouchableOpacity>
            <Text style={{ marginTop: 6, color: '#000' }}>{t('take_photo')}</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <TouchableOpacity 
              style={[styles.circularButton, medicationState.isLoading && styles.disabledButton]} 
              onPress={handleChooseAlbum}
              disabled={medicationState.isLoading}>
              <Icon name="photo-library" size={32} color={medicationState.isLoading ? "#A0A0A0" : "#FFFFFF"} />
            </TouchableOpacity>
            <Text style={{ marginTop: 6, color: '#000' }}>{t('album')}</Text>
          </View>
        </View>

        {(medicationState.imageUri || medicationState.backImageUri) && (
          <View style={styles.medicationContainer}>
            {!!medicationState.imageUri && (
              <View style={[styles.imageContainer, medicationState.isLoading && styles.processingContainer]}>
                <Image source={{uri: medicationState.imageUri}} style={styles.image} />
              
                {medicationState.isLoading && (
                  <>
                    <View
                      style={[
                        styles.glowOverlay,
                        { opacity: medicationState.glowOpacity }
                      ]}
                    />
                    <Animated.View
                      style={[
                        styles.progressBorder,
                        {
                          transform: [{ translateX: borderTranslate }]
                        }
                      ]}
                    />
                    <View style={styles.processingTextContainer}>
                      <Text
                        style={[
                          styles.processingText,
                          { opacity: medicationState.textOpacity }
                        ]}>
                        {t('pharma.recognizing')}
                      </Text>
                    </View>
                  </>
                )}
              
                {!medicationState.isLoading && (
                  <TouchableOpacity 
                    style={styles.favoriteButton}
                    onPress={handleFavoritePress}>
                    <Icon 
                      name={isFavorite(medicationState.brandName) ? "star" : "star-border"} 
                      size={32} 
                      color="#316CEB" 
                    />
                  </TouchableOpacity>
                )}
              </View>
            )}

            {!!medicationState.backImageUri && (
              <View style={[styles.imageContainer, medicationState.isParsingExpiration && styles.processingContainer]}>
                <Image source={{uri: medicationState.backImageUri}} style={styles.image} />
                {medicationState.isParsingExpiration && (
                  <>
                    <View
                      style={[
                        styles.glowOverlay,
                        { opacity: medicationState.glowOpacity }
                      ]}
                    />
                    <Animated.View
                      style={[
                        styles.progressBorder,
                        {
                          transform: [{ translateX: borderTranslate }]
                        }
                      ]}
                    />
                    <View style={styles.processingTextContainer}>
                      <Text
                        style={[
                          styles.processingText,
                          { opacity: medicationState.textOpacity }
                        ]}>
                        {t('pharma.readingExpiration')}
                      </Text>
                    </View>
                  </>
                )}
              </View>
            )}

            {!medicationState.isLoading && (
              <View style={styles.detailsContainer}>
                <View style={styles.headerSection}>
                  <Text style={styles.brandName}>{medicationState.brandName}</Text>
                  {medicationState.formattedExpiration && (
                    <Text style={{ 
                      textAlign: 'center', 
                      color: isMedicationExpired(medicationState.formattedExpiration) ? '#E74C3C' : '#2ECC71', 
                      fontSize: 16, 
                      marginTop: 4,
                      fontWeight: '500'
                    }}>
                      {t('expiration_date')}: {medicationState.formattedExpiration}
                    </Text>
                  )}
                  <View style={styles.fontControls}>
                    <TouchableOpacity 
                      style={styles.fontSizeButton} 
                      onPress={increaseFontSize}>
                      <Icon name="text-format" size={28} color="#000000" />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.fontSizeButton} 
                      onPress={decreaseFontSize}>
                      <Icon name="text-format" size={20} color="#000000" />
                    </TouchableOpacity>
                  </View>
                </View>

                <ScrollView 
                  style={styles.medicationContent}
                  showsVerticalScrollIndicator={false}
                >
                  {medicationState.ndc && (
                    <MedicationDetails
                      label={t('product_ndc')}
                      content={medicationState.ndc}
                      fontSize={medicationState.fontSize}
                    />
                  )}
                  {medicationState.activeIngredient && (
                    <MedicationDetails
                      label={t('active_ingredient')}
                      content={medicationState.activeIngredient}
                      fontSize={medicationState.fontSize}
                    />
                  )}
                  {medicationState.purpose && (
                    <MedicationDetails
                      label={t('purpose')}
                      content={medicationState.purpose}
                      fontSize={medicationState.fontSize}
                    />
                  )}
                  {medicationState.indications && (
                    <MedicationDetails
                      label={t('indications_and_usage')}
                      content={medicationState.indications}
                      fontSize={medicationState.fontSize}
                    />
                  )}
                  {medicationState.dosage && (
                    <MedicationDetails
                      label={t('dosage_and_administration')}
                      content={medicationState.dosage}
                      fontSize={medicationState.fontSize}
                    />
                  )}
                  {medicationState.doNotUse && (
                    <MedicationDetails
                      label={t('do_not_use')}
                      content={medicationState.doNotUse}
                      fontSize={medicationState.fontSize}
                      isWarning={true}
                    />
                  )}
                  {medicationState.pregnancy && (
                    <MedicationDetails
                      label={t('pregnancy_or_breastfeeding')}
                      content={medicationState.pregnancy}
                      fontSize={medicationState.fontSize}
                      isWarning={true}
                    />
                  )}
                  {medicationState.stopUse && (
                    <MedicationDetails
                      label={t('stop_use')}
                      content={medicationState.stopUse}
                      fontSize={medicationState.fontSize}
                      isWarning={true}
                    />
                  )}
                  {medicationState.warnings && (
                    <MedicationDetails
                      label={t('warnings')}
                      content={medicationState.warnings}
                      fontSize={medicationState.fontSize}
                      isWarning={true}
                    />
                  )}
                  {!medicationState.indications && 
                   !medicationState.dosage && 
                   !medicationState.doNotUse && 
                   !medicationState.pregnancy && 
                   !medicationState.stopUse && 
                   !medicationState.warnings &&
                   !medicationState.ndc &&
                   !medicationState.activeIngredient &&
                   !medicationState.purpose && (
                    <Text style={[styles.noDataText, { fontSize: medicationState.fontSize }]}>
                      {t('no_medication_data_available')}
                    </Text>
                  )}
                </ScrollView>
                {medicationState.sourceUrl && (
                  <View style={{ marginTop: 10, alignItems: 'center' }}>
                    <Text style={{ color: '#888', fontSize: 13, textAlign: 'center', marginBottom: 6 }}>
                      Disclaimer: PharmaSnap provides publicly available FDA drug-label data for informational purposes only and does not offer medical advice. Always follow the label on your medication and consult a healthcare professional for guidance.
                    </Text>
                    <TouchableOpacity
                      onPress={() => Linking.openURL(medicationState.sourceUrl)}
                    >
                      <Text style={{ color: '#1B5E20', textDecorationLine: 'underline', fontSize: 16 }}>
                        {t('view_source')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      <View style={styles.navigationBar}>
        <TouchableOpacity 
          style={styles.navButton} 
          onPress={() => navigation.navigate('Welcome')}>
          <Icon name="home" size={32} color="#000000" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.navButton} onPress={() => navigation.navigate('PharmaSnap')}>
          <Icon name="camera-alt" size={32} color="#316CEB" />
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#316CEB',
    textAlign: 'center',
  },
  container: {
    flexGrow: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
  },
  iconContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 20,
    paddingHorizontal: 40,
  },
  circularButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#316CEB',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  medicationContainer: {
    flex: 1,
    marginBottom: 80,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: IMAGE_HEIGHT,
    marginBottom: 20,
    borderRadius: 10,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
    backgroundColor: '#F5F5F5',
  },
  textSizeControls: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 10,
  },
  fontSizeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  medicationContent: {
    flex: 1,
    width: '100%',
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
  brandName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
    textAlign: 'center',
    marginVertical: 20,
    width: '100%',
  },
  favoriteButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 20,
    padding: 5,
  },
  disabledButton: {
    opacity: 0.5,
  },
  processingContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#316CEB',
    borderRadius: 10,
    opacity: 0.3,
  },
  progressBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    backgroundColor: 'transparent',
  },
  processingTextContainer: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingVertical: 8,
  },
  processingText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: {width: -1, height: 1},
    textShadowRadius: 10,
  },
  detailsContainer: {
    width: '100%',
    flex: 1,
  },
  headerSection: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  fontControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 64,
    marginTop: 8,
  },
  noDataText: {
    textAlign: 'center',
    marginTop: 20,
    color: '#808080',
  },
});


