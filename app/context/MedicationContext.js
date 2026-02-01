import React, {createContext, useContext, useState} from 'react';

const MedicationContext = createContext();

export const MedicationProvider = ({children}) => {
  const [medicationState, setMedicationState] = useState({
    imageUri: null,
    backImageUri: null,
    brandName: '',
    indications: '',
    dosage: '',
    warnings: '',
    doNotUse: '',
    stopUse: '',
    pregnancy: '',
    ndc: '',
    activeIngredient: '',
    purpose: '',
    expiration: null,
    formattedExpiration: null,
    fontSize: 18,
    isLoading: false,
    isParsingExpiration: false,
    glowOpacity: 0.3,
    textOpacity: 1,
  });

  const updateMedicationState = (updates) => {
    setMedicationState(prev => ({...prev, ...updates}));
  };

  const resetMedicationState = () => {
    setMedicationState(prev => ({
      ...prev,
      brandName: '',
      indications: '',
      dosage: '',
      warnings: '',
      doNotUse: '',
      stopUse: '',
      pregnancy: '',
      ndc: '',
      activeIngredient: '',
      purpose: '',
      expiration: null,
      formattedExpiration: null,
    }));
  };

  return (
    <MedicationContext.Provider 
      value={{
        medicationState,
        updateMedicationState,
        resetMedicationState,
      }}>
      {children}
    </MedicationContext.Provider>
  );
};

export const useMedicationState = () => {
  const context = useContext(MedicationContext);
  if (!context) {
    throw new Error('useMedicationState must be used within a MedicationProvider');
  }
  return context;
}; 