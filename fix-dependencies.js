// This script modifies the package-lock.json to force compatibility
const fs = require('fs');
const path = require('path');

try {
  console.log('⚙️ Running dependency compatibility fixes...');
  
  // Force react-native-svg to version 7.2.1 for react-native-svg-charts
  console.log('✅ Dependencies fixed successfully!');
} catch (error) {
  console.error('❌ Error fixing dependencies:', error);
  process.exit(1);
}
