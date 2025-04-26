# Savorella
<p align="center">
<img src="/assets/images/logo.png)" alt="Savorella Logo" width="200">
</p>
## Overview

Savorella is a mobile application built with React Native and Expo that helps users [brief description of app purpose]. The application features a robust authentication system with email/password and Google sign-in options, user role management, and personalized user journeys.

## Features

- **User Authentication**
  - Email and password sign-in
  - Google OAuth authentication
  - Password reset functionality
  - Email verification
  - User registration with validation

- **User Roles**
  - Regular user accounts
  - Admin accounts with special privileges

- **User Profile Management**
  - Family information collection
  - Profile customization

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

