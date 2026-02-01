// app/services/apiService.js, provides three API supports - OpenAI API, OpenFDA API, and Google Translation API

import axios from 'axios';
import {Platform} from 'react-native';
import RNFS from 'react-native-fs';
import ImageResizer from '@bam.tech/react-native-image-resizer';

// Function to process image and extract medication name using GPT-4 Vision
const extractMedicationFromImage = async (imagePath, apiKey) => {
  try {
    // Convert file:// URI to actual path for Android
    const actualPath = Platform.OS === 'android' ? imagePath.replace('file://', '') : imagePath;

    // Resize image to 512x512 to optimize for API
    const resizedImage = await ImageResizer.createResizedImage(
      actualPath,
      512, // width
      512, // height
      'JPEG',
      80, // quality (0 to 100)
      0, // rotation
      null, // outputPath (null = temp directory)
      false, // keep metadata
      { mode: 'contain', onlyScaleDown: false }
    );

    // Read the processed image as base64
    const base64Image = await RNFS.readFile(resizedImage.uri, 'base64');

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'Act as a highly skilled medication expert. Extract the exact product name from the image of a medication box or bottle, following these rules: include branding and key descriptors (e.g., "Severe Cold," "High Blood Pressure"), exclude dosage forms (e.g., caplets, tablets), ensure correct spelling, and return only the product name without extra words or explanations. If no medication name is clearly visible or if you are not confident about the name, respond with exactly "Not Found".'
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'What is the medication name shown in this image? Return ONLY the medication name, nothing else.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`
                }
              }
            ]
          }
        ],
        max_tokens: 50,
        temperature: 0
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // Clean up the temporary resized image
    await RNFS.unlink(resizedImage.uri).catch(err => {
      console.warn('Error cleaning up temporary image:', err);
    });

    return response.data.choices[0].message.content.trim();
  } catch (error) {
    console.error('Error processing image with GPT-4 Vision:', error);
    if (error.response) {
      console.error('Error response:', error.response.data);
    }
    throw error;
  }
};

// Function to process image and extract expiration date text using GPT-4 Vision
const extractExpirationFromImage = async (imagePath, apiKey) => {
  try {
    const actualPath = Platform.OS === 'android' ? imagePath.replace('file://', '') : imagePath;

    const resizedImage = await ImageResizer.createResizedImage(
      actualPath,
      512,
      512,
      'JPEG',
      80,
      0,
      null,
      false,
      { mode: 'contain', onlyScaleDown: false }
    );

    const base64Image = await RNFS.readFile(resizedImage.uri, 'base64');

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'Extract ONLY the expiration date from the provided photo of a medication package. Return the expiration strictly in MM/YYYY if present. If only a two-digit year appears, expand to 20YY. If no expiration is visible, return exactly "Not Found".'
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Read the expiration date. Return MM/YYYY ONLY.' },
              { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Image}` } }
            ]
          }
        ],
        max_tokens: 20,
        temperature: 0
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    await RNFS.unlink(resizedImage.uri).catch(err => {
      console.warn('Error cleaning up temporary image:', err);
    });

    return response.data.choices[0].message.content.trim();
  } catch (error) {
    console.error('Error extracting expiration with GPT-4 Vision:', error);
    if (error.response) {
      console.error('Error response:', error.response.data);
    }
    throw error;
  }
};

// Function to preprocess medication name before querying OpenFDA
const preprocessMedicationName = (name) => {
  if (!name) return name;

  // Convert to string and trim
  let processedName = String(name).trim();

  // Replace "&" with "and"
  processedName = processedName.replace(/&/g, 'and');

  // Replace "+" with "plus"
  processedName = processedName.replace(/\+/g, 'plus');

  // List of branding terms to remove
  const brandingTerms = ['CVS', 'Equate', 'Walgreens', 'Safeway'];
  
  // Remove branding terms (case insensitive)
  brandingTerms.forEach(term => {
    const regex = new RegExp(`\\b${term}\\b`, 'gi');
    processedName = processedName.replace(regex, '');
  });

  // Clean up extra spaces
  processedName = processedName.replace(/\s+/g, ' ').trim();

  return processedName;
};

// Function to query OpenFDA for medication details using the brand name
const queryOpenFDA = async brandName => {
  try {
    // Preprocess the brand name
    const processedBrandName = preprocessMedicationName(brandName);
    
    // If after preprocessing the name is empty, throw an error
    if (!processedBrandName) {
      throw new Error('Invalid medication name after preprocessing');
    }

    const apiUrl = `https://api.fda.gov/drug/label.json?search=openfda.brand_name:"${processedBrandName}"&limit=1`;
    const response = await axios.get(apiUrl);
    const result = response.data.results[0];
    // Set sourceUrl to the actual API URL used
    const sourceUrl = apiUrl;
    return { ...result, sourceUrl };
  } catch (error) {
    console.error('Error querying OpenFDA:', error);
    throw error;
  }
};

// Function to translate texts using Google Cloud Translation API
const translateTexts = async (texts, targetLanguage, googleApiKey) => {
  try {
    // Filter out empty or whitespace-only texts to avoid API errors
    const nonEmptyTexts = texts.filter(text => text && text.trim().length > 0);
    
    // If no texts to translate, return empty array
    if (nonEmptyTexts.length === 0) {
      return [];
    }

    const url = `https://translation.googleapis.com/language/translate/v2?key=${googleApiKey}`;
    const response = await axios.post(url, {
      q: nonEmptyTexts,
      target: targetLanguage,
      format: 'text',
    });

    if (
      response.data &&
      response.data.data &&
      response.data.data.translations
    ) {
      const translatedTexts = response.data.data.translations.map(t => t.translatedText);
      
      // Map back to original array structure, filling empty slots with original texts
      let resultIndex = 0;
      return texts.map(text => {
        if (text && text.trim().length > 0) {
          return translatedTexts[resultIndex++];
        } else {
          return text; // Keep empty texts as-is
        }
      });
    } else {
      console.error(
        'Translation API response is not as expected:',
        response.data,
      );
      return texts; // Return original texts if translation fails
    }
  } catch (error) {
    console.error('Error translating texts:', error);
    if (error.response) {
      console.error('Translation API error response:', error.response.data);
    }
    return texts; // Return original texts if there's an error
  }
};

export {extractMedicationFromImage, extractExpirationFromImage, queryOpenFDA, translateTexts};
