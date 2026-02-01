// MedicationDetails.js, under the folder "app/components"

import React, {useMemo} from 'react';
import {View, StyleSheet, useWindowDimensions} from 'react-native';
import Markdown from 'react-native-markdown-display';

const MedicationDetails = ({label, content, fontSize, isWarning = false}) => {
  const {width} = useWindowDimensions();
  
  const formattedContent = useMemo(() => {
    if (!content || content === '') return '';

    // Process content into a more readable format
    let processedContent = content
      .split('\n')
      .map(paragraph => {
        paragraph = paragraph.trim();
        if (!paragraph) return '';

        // Remove redundant words at the start
        const words = paragraph.split(/\s+/);
        if (words.length >= 2 && words[0].toLowerCase() === words[1].toLowerCase()) {
          words.splice(0, 1);
          paragraph = words.join(' ');
        }

        // Check for bullet points
        const bulletMatch = paragraph.match(/^(.*?)([·●•■].*)/);
        if (bulletMatch) {
          const [_, beforeBullet, afterBullet] = bulletMatch;
          
          // Process the text before bullet points as a regular paragraph
          let result = beforeBullet.trim();
          
          // Process the text after bullet points into bullet list
          const items = afterBullet
            .split(/[·●•■]/)
            .map(item => item.trim())
            .filter(item => item.length > 0)
            .map(item => {
              // Remove any existing bullet points at the start
              item = item.replace(/^[·●•■\-\*]\s*/, '');
              
              // Check for redundant words
              const words = item.split(/\s+/);
              if (words.length >= 2 && words[0].toLowerCase() === words[1].toLowerCase()) {
                words.splice(0, 1);
                item = words.join(' ');
              }

              // Ensure first letter is capitalized
              return item.charAt(0).toUpperCase() + item.slice(1);
            });

          // Combine regular text and bullet points
          if (result && items.length > 0) {
            return result + '\n\n' + items.map(item => `* ${item}`).join('\n');
          } else if (items.length > 0) {
            return items.map(item => `* ${item}`).join('\n');
          } else {
            return result;
          }
        }
        
        // Convert existing bullet points or numbered lists
        if (paragraph.match(/^[·●•■\-\*]\s|^\d+\.\s/)) {
          let cleanedItem = paragraph.replace(/^[·●•■\-\*]\s|^\d+\.\s/, '').trim();
          // Check for redundant words
          const words = cleanedItem.split(/\s+/);
          if (words.length >= 2 && words[0].toLowerCase() === words[1].toLowerCase()) {
            words.splice(0, 1);
            cleanedItem = words.join(' ');
          }
          // Ensure first letter is capitalized
          cleanedItem = cleanedItem.charAt(0).toUpperCase() + cleanedItem.slice(1);
          return `* ${cleanedItem}`;
        }
        
        // Handle semicolon-separated text only if it starts with a bullet point
        if (paragraph.startsWith('·') || paragraph.startsWith('●') || paragraph.startsWith('•') || paragraph.startsWith('■')) {
          const items = paragraph
            .replace(/^[·●•■]\s*/, '') // Remove the initial bullet point
            .split(';')
            .map(item => item.trim())
            .filter(item => item.length > 0)
            .map(item => {
              // Check for redundant words
              const words = item.split(/\s+/);
              if (words.length >= 2 && words[0].toLowerCase() === words[1].toLowerCase()) {
                words.splice(0, 1);
                item = words.join(' ');
              }
              // Ensure first letter is capitalized
              return item.charAt(0).toUpperCase() + item.slice(1);
            });

          if (items.length > 0) {
            return items
              .map(item => `* ${item}`)
              .join('\n');
          }
        }
        
        return paragraph;
      })
      .filter(paragraph => paragraph.trim().length > 0)
      .join('\n\n');

    // Clean up formatting
    processedContent = processedContent
      .replace(/^\s*\*\s+/gm, '* ') // Normalize bullet point spacing
      .replace(/\n{3,}/g, '\n\n') // Normalize paragraph spacing
      .replace(/([^.!?])\n\*/g, '$1\n\n*') // Add extra line break before bullet points
      .replace(/\* (?=[a-z])/g, '* ' + '$&'.toUpperCase()) // Capitalize first letter after bullet
      .trim();

    // Add section header
    return `## ${label}\n\n${processedContent}`;
  }, [content, label]);

  const markdownStyles = useMemo(() => ({
    body: {
      color: '#000000',
      fontSize: fontSize,
    },
    heading2: {
      fontSize: fontSize * 1.3,
      fontWeight: 'bold',
      color: isWarning ? '#D32F2F' : '#1565C0',
      marginBottom: 16,
      marginTop: 8,
      paddingBottom: 8,
      borderBottomWidth: 1,
      borderBottomColor: isWarning ? '#FFCDD2' : '#BBDEFB',
    },
    paragraph: {
      fontSize: fontSize,
      lineHeight: fontSize * 1.6,
      marginBottom: 12,
      color: '#000000',
    },
    bullet_list: {
      marginVertical: 8,
    },
    bullet_list_item: {
      flexDirection: 'row',
      marginBottom: 8,
      paddingLeft: 16,
    },
    bullet_list_icon: {
      marginTop: fontSize * 0.25,
      marginRight: 8,
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: isWarning ? '#D32F2F' : '#1565C0',
    },
    bullet_list_content: {
      flex: 1,
      paddingRight: 16,
    },
    strong: {
      fontWeight: 'bold',
      color: isWarning ? '#D32F2F' : '#000000',
    },
    em: {
      fontStyle: 'italic',
      color: '#000000',
    },
  }), [fontSize, isWarning]);

  return (
    <View style={[
      styles.container,
      isWarning ? styles.warningContainer : styles.infoContainer
    ]}>
      <Markdown
        style={markdownStyles}
      >
        {formattedContent}
      </Markdown>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    elevation: 1,
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
    borderLeftWidth: 4,
  },
  warningContainer: {
    backgroundColor: '#FFF8F8',
    borderLeftColor: '#D32F2F',
  },
  infoContainer: {
    backgroundColor: '#F8FBFF',
    borderLeftColor: '#1565C0',
  },
});

export default React.memo(MedicationDetails);
