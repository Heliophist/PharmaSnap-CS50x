import React, {createContext, useState, useContext, useEffect} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FavoritesContext = createContext();

const FAVORITES_KEY = 'pharmasnap_favorites';

export const FavoritesProvider = ({children}) => {
  const [favorites, setFavorites] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load favorites from AsyncStorage on mount
  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    try {
      setIsLoading(true);
      const favoritesJson = await AsyncStorage.getItem(FAVORITES_KEY);
      if (favoritesJson) {
        const loadedFavorites = JSON.parse(favoritesJson);
        setFavorites(loadedFavorites);
        console.log(`Loaded ${loadedFavorites.length} favorites from storage`);
      }
    } catch (error) {
      console.error('Error loading favorites:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveFavorites = async (newFavorites) => {
    try {
      await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(newFavorites));
      console.log(`Saved ${newFavorites.length} favorites to storage`);
    } catch (error) {
      console.error('Error saving favorites:', error);
    }
  };

  const toggleFavorite = async (medication) => {
    try {
      const newFavorites = favorites.filter(fav => fav.brandName !== medication.brandName);
      
      if (newFavorites.length === favorites.length) {
        // Medication not found, so add it
        const favoriteData = {
          ...medication,
          expirationDate: medication.expiration || null,
          formattedExpiration: medication.formattedExpiration || null,
          addedAt: new Date().toISOString(),
        };
        newFavorites.push(favoriteData);
        console.log(`Added ${medication.brandName} to favorites`);
      } else {
        console.log(`Removed ${medication.brandName} from favorites`);
      }
      
      setFavorites(newFavorites);
      await saveFavorites(newFavorites);
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const isFavorite = (brandName) => {
    return favorites.some(fav => fav.brandName === brandName);
  };

  const removeFavorite = async (brandName) => {
    try {
      const newFavorites = favorites.filter(fav => fav.brandName !== brandName);
      setFavorites(newFavorites);
      await saveFavorites(newFavorites);
      console.log(`Removed ${brandName} from favorites`);
    } catch (error) {
      console.error('Error removing favorite:', error);
    }
  };

  const clearFavorites = async () => {
    try {
      setFavorites([]);
      await AsyncStorage.removeItem(FAVORITES_KEY);
      console.log('Cleared all favorites');
    } catch (error) {
      console.error('Error clearing favorites:', error);
    }
  };

  return (
    <FavoritesContext.Provider value={{
      favorites, 
      toggleFavorite, 
      isFavorite, 
      isLoading,
      clearFavorites,
      loadFavorites,
      removeFavorite
    }}>
      {children}
    </FavoritesContext.Provider>
  );
};

export const useFavorites = () => {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
}; 