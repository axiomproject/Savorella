# Savorella
<p align="center">
<img src="./assets/images/logo.png" alt="Savorella Logo" width="200">
</p>

## Overview

Savorella is an easy-to-use meal-planning app designed to help families maintain healthy eating. It creates personalized meal plans based on your dietary preferences, family size, and nutritional needs. Users can select from various diets and generate grocery lists tailored to their chosen meals. With a simple setup, Savorella ensures that each meal plan aligns with your family's lifestyle. Whether planning for the week or seeking kid-friendly meals, Savorella makes meal prep easier, saving you time, reducing food waste, and helping you enjoy nutritious, delicious meals.

## Features

- **Nutritional Tracking**
  - Savorella helps parents monitor their children's daily nutrient intake, ensuring a balanced diet tailored to their needs.

- **Real-Time Calorie & Nutrient Monitoring**
  - Parents can track their child’s caloric intake, vitamins, and macronutrients to ensure they’re meeting their daily requirements.

- **Meal Planning & Smart Recommendations**
  - The app provides healthy meal suggestions based on age, dietary needs, and preferences, making it easier for parents to plan nutritious meals.

- **Family Meal Planning & Grocery Lists**
  - Simplify shopping with automated grocery lists based on weekly meal plans to ensure balanced nutrition for the entire family.

- **Educational Resources & Parental Guidance**
  - Access expert-backed nutritional advice, meal prep guides, and interactive lessons to teach parents about healthy eating habits.

## Technology Stack

- [React Native](https://reactnative.dev/) - Core mobile framework
- [Expo](https://expo.dev/) - Development platform and tools
- [Firebase](https://firebase.google.com/)
  - Authentication
  - Firestore database
- [Expo Router](https://docs.expo.dev/router/introduction/) - Navigation system

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v14 or newer)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- [Expo CLI](https://docs.expo.dev/workflow/expo-cli/)
- Firebase project

### Installation

1. Clone this repository
   ```bash
   git clone https://github.com/yourusername/savorella.git
   cd savorella
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Configure Firebase
   - Create a Firebase project at [firebase.google.com](https://firebase.google.com/)
   - Enable Authentication (email/password and Google providers)
   - Create a Firestore database
   - Add your Firebase configuration to `firebaseConfig.js`

4. Configure Google OAuth
   - Set up OAuth credentials in the Google Cloud Console
   - Add your Android and Web client IDs to the Google auth provider in `app/login.tsx`
   - Ensure your redirect URIs are correctly configured in the Google Cloud Console

5. Start the development server
   ```bash
   npx expo start
   ```

