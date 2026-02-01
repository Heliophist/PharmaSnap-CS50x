// aiClient.js - Minimal AI client for medication Q&A

import axios from 'axios';
import { OPENAI_API_KEY } from '../../config';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

const SYSTEM_MESSAGE = `You are Pharma AI, the OTC medication guide in the PharmaSnap app. Provide accurate, educational information only — not medical advice. Tone: professional, calm, supportive.

When responding:
• Prioritize precision; be concise.
• If unsure, say: “I’m not completely sure. Please check your medication label or consult a licensed pharmacist or healthcare provider.”
• Write short, clear sentences suitable for non-English speakers and seniors.
• Stay within OTC and general health education. Do not diagnose, give prescription guidance, or emergency instructions.
• End with: “This information is for educational purposes only. Always consult a pharmacist or healthcare professional for medical advice.”
`;

export const sendMedChat = async (messages) => {
  try {
    console.log('🤖 Sending chat request to OpenAI...');
    
    // Check if API key is available
    if (!OPENAI_API_KEY || OPENAI_API_KEY === 'your-openai-api-key-here') {
      throw new Error('OpenAI API key not configured');
    }
    
    // Prepare messages for API
    const apiMessages = [
      { role: 'system', content: SYSTEM_MESSAGE },
      ...messages.map(msg => ({
        role: msg.role,
        content: msg.text
      }))
    ];

    const response = await axios.post(
      OPENAI_API_URL,
      {
        model: 'gpt-4o-mini',
        messages: apiMessages,
        temperature: 0.2,
        max_tokens: 500,
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000, // 30 second timeout
      }
    );

    const assistantMessage = response.data.choices[0]?.message?.content;
    
    if (!assistantMessage) {
      throw new Error('No response from AI');
    }

    console.log('✅ Received AI response');
    return assistantMessage;

  } catch (error) {
    console.error('❌ AI Chat Error:', error);
    
    // Return friendly fallback message
    if (error.message === 'OpenAI API key not configured') {
      return "The AI service is not configured yet. Please contact support or consult with a pharmacist for immediate assistance.";
    } else if (error.response?.status === 401) {
      return "I'm having trouble connecting to the AI service. Please check your API configuration or try again later.";
    } else if (error.response?.status === 429) {
      return "I'm receiving too many requests right now. Please wait a moment and try again.";
    } else if (error.code === 'ECONNABORTED') {
      return "The request is taking too long. Please try again with a shorter question.";
    } else {
      return "I'm sorry, I'm having trouble connecting right now. Please try again later or consult with a pharmacist for immediate assistance.";
    }
  }
};

export default {
  sendMedChat,
};
