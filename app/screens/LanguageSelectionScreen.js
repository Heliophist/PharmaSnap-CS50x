// LanguageSelectScreen, under the folder "app/screens", is the 1st screen of this app.

import React, {useState, useRef, useEffect} from 'react';
import {View, Text, TouchableOpacity, StyleSheet, SafeAreaView, StatusBar, Animated, Image, I18nManager, FlatList, Dimensions} from 'react-native';
import {useTranslation} from 'react-i18next';
import Icon from 'react-native-vector-icons/MaterialIcons';

const {width: screenWidth, height: screenHeight} = Dimensions.get('window');
const ITEM_HEIGHT = 64;
const ITEM_SPACING = 15;

export default function LanguageSelectionScreen({navigation}) {
  const {i18n, t} = useTranslation();
  const [selectedLanguage, setSelectedLanguage] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef(null);
  const scrollY = useRef(new Animated.Value(0)).current;

  // Language data array - using native language names (not translated)
  const languages = [
    {code: 'en', title: 'English'},
    {code: 'es', title: 'Español'},
    {code: 'zh', title: '中文'},
    {code: 'tl', title: 'Tagalog'},
    {code: 'vi', title: 'Tiếng Việt'},
    {code: 'ko', title: '한국어'},
    {code: 'hi', title: 'हिंदी'},
    {code: 'ar', title: 'العربية'},
    {code: 'fa', title: 'فارسی'},
    {code: 'fr', title: 'Français'},
    {code: 'pt', title: 'Português'},
    {code: 'ru', title: 'Русский'},
    {code: 'ja', title: '日本語'},
    {code: 'de', title: 'Deutsch'},
    {code: 'th', title: 'ไทย'},
  ];

  // Function to handle language selection and navigate to the Welcome screen
  const selectLanguage = lng => {
    setSelectedLanguage(lng);
    
    // Check if the selected language is RTL (Arabic or Persian)
    const isRTL = lng === 'ar' || lng === 'fa';
    
    // Force RTL layout for Arabic and Persian
    if (isRTL) {
      I18nManager.forceRTL(true);
    } else {
      I18nManager.forceRTL(false);
    }
    
    i18n.changeLanguage(lng).then(() => {
      // Add a small delay to show the selection effect
      setTimeout(() => {
        navigation.navigate('Welcome');
      }, 200);
    });
  };

  // Handle scroll events
  const onScroll = Animated.event(
    [{nativeEvent: {contentOffset: {y: scrollY}}}],
    {useNativeDriver: false}
  );

  const onMomentumScrollEnd = (event) => {
    const index = Math.round(event.nativeEvent.contentOffset.y / (ITEM_HEIGHT + ITEM_SPACING));
    setCurrentIndex(index);
    setSelectedLanguage(languages[index].code);
  };

  // Render individual language item
  const renderLanguageItem = ({item, index}) => {
    const inputRange = [
      (index - 1) * (ITEM_HEIGHT + ITEM_SPACING),
      index * (ITEM_HEIGHT + ITEM_SPACING),
      (index + 1) * (ITEM_HEIGHT + ITEM_SPACING),
    ];

    const scale = scrollY.interpolate({
      inputRange,
      outputRange: [0.85, 1.0, 0.85],
      extrapolate: 'clamp',
    });

    const opacity = scrollY.interpolate({
      inputRange,
      outputRange: [0.5, 1.0, 0.5],
      extrapolate: 'clamp',
    });

    const translateY = scrollY.interpolate({
      inputRange,
      outputRange: [10, 0, 10],
      extrapolate: 'clamp',
    });

    const isSelected = index === currentIndex;

    return (
      <Animated.View
        style={[
          styles.languageItem,
          {
            transform: [
              {scale},
              {translateY}
            ],
            opacity,
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.languageButton,
            isSelected && styles.selectedButton,
          ]}
          onPress={() => {
            setCurrentIndex(index);
            setSelectedLanguage(item.code);
            selectLanguage(item.code);
          }}
        >
          <Text style={[
            styles.buttonText,
            isSelected && styles.selectedButtonText
          ]}>
            {item.title}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('pharmasnap')}</Text>
      </View>

      <View style={styles.container}>
        {/* Subtitle */}
        <View style={styles.subtitleContainer}>
          <Text style={styles.subtitleText}>
            <Text style={styles.subtitleHighlight}>{t('ai_makes_medicine_clear')}</Text>
          </Text>
        </View>

        {/* App Icon */}
        <View style={styles.iconContainer}>
          <Image 
            source={require('../components/PharmaSnap_icon.png')}
            style={styles.appIcon}
            resizeMode="contain"
          />
        </View>

        {/* Language Carousel */}
        <View style={styles.carouselContainer}>
          <Text style={styles.carouselTitle}>{t('supports_15_languages')}</Text>
          <View style={styles.carouselWrapper}>
            <FlatList
              ref={flatListRef}
              data={languages}
              renderItem={renderLanguageItem}
              keyExtractor={(item) => item.code}
              vertical
              showsVerticalScrollIndicator={false}
              snapToInterval={ITEM_HEIGHT + ITEM_SPACING}
              snapToAlignment="center"
              decelerationRate="fast"
              contentContainerStyle={styles.carouselContent}
              onScroll={onScroll}
              onMomentumScrollEnd={onMomentumScrollEnd}
              scrollEventThrottle={16}
              getItemLayout={(data, index) => ({
                length: ITEM_HEIGHT + ITEM_SPACING,
                offset: (ITEM_HEIGHT + ITEM_SPACING) * index,
                index,
              })}
            />
          </View>
          
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
    paddingTop: 30,
    paddingBottom: 15,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#316CEB',
    textAlign: 'center',
  },
  container: {
    flex: 1,
    padding: 5,
    backgroundColor: '#FFFFFF',
  },
  subtitleContainer: {
    
    marginTop: 2,
    marginBottom: 30,
    alignItems: 'center',
  },
  subtitleText: {
    fontSize: 24,
    color: '#000000',
    letterSpacing: 1,
  },
  subtitleHighlight: {
    letterSpacing: 1.2,
  },
  subtitleThin: {
    fontWeight: '300',
    letterSpacing: 0.8,
  },
  carouselContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  carouselTitle: {
    fontSize: 24,
    color: '#000000',
    marginBottom: 20,
    textAlign: 'center',
    letterSpacing: 1,
  },
  carouselWrapper: {
    height: 300,
    width: screenWidth * 0.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  carouselContent: {
    paddingVertical: 100,
    alignItems: 'center',
  },
  languageItem: {
    height: ITEM_HEIGHT,
    marginVertical: ITEM_SPACING / 2,
    alignItems: 'center',
    justifyContent: 'center',
    width: screenWidth * 0.5,
  },
  languageButton: {
    backgroundColor: '#F8F9FA',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    height: ITEM_HEIGHT,
    width: '85%',
  },
  selectedButton: {
    backgroundColor: '#316CEB',
    elevation: 8,
    shadowColor: '#316CEB',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  buttonText: {
    color: '#333333',
    fontSize: 22,
    fontWeight: '500',
    textAlign: 'center',
  },
  selectedButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 24,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  appIcon: {
    width: 180,
    height: 180,
  },
});
