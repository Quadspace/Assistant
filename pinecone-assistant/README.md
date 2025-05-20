# Pinecone Assistant Setup Instructions

This document provides detailed instructions for setting up and deploying your Industrial Engineer.ai Pinecone Assistant application.

## Prerequisites

1. A Pinecone account with access to create Assistants
2. Node.js and npm installed
3. Git for version control

## Setting Up Your Pinecone Assistant

1. **Create a Pinecone Assistant**:
   - Go to [Pinecone Console](https://app.pinecone.io)
   - Navigate to the Assistants section
   - Click "Create Assistant"
   - Name your assistant (e.g., "forklift-maintenance" or any other name relevant to your business)
   - Configure the assistant with appropriate knowledge and settings
   - Note down the assistant name for the next step

2. **Configure Environment Variables**:
   - In the project root, create a `.env.local` file (or edit the existing one)
   - Set the following variables:
     ```
     PINECONE_API_KEY=your_pinecone_api_key
     PINECONE_ASSISTANT_NAME=your_assistant_name
     SHOW_ASSISTANT_FILES=true
     ```
   - Replace `your_pinecone_api_key` with your actual Pinecone API key
   - Replace `your_assistant_name` with the name of the assistant you created

## Running the Application Locally

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Start Development Server**:
   ```bash
   npm run dev
   ```

3. **Access the Application**:
   - Open your browser and navigate to `http://localhost:3000`
   - You should see your Industrial Engineer.ai Assistant interface with Victoria's Secret branding

## Deployment

1. **Build for Production**:
   ```bash
   npm run build
   ```

2. **Start Production Server**:
   ```bash
   npm start
   ```

3. **Deploy to Your Hosting Provider**:
   - Deploy the built application to your preferred hosting provider
   - Ensure environment variables are properly set in your production environment

## Troubleshooting

If you encounter the error message "No assistant found with name...", please check:

1. That you've created the Pinecone Assistant with the exact name specified in your environment variables
2. That your Pinecone API key has access to the specified assistant
3. That the assistant is properly configured and active in your Pinecone account

## Customization

The application includes your Industrial Engineer.ai and Victoria's Secret branding. If you need to update these assets:

1. Replace the logo files in the `src/app` directory:
   - `GreenBlack.png` (Industrial Engineer.ai logo)
   - `VS&Co_logo_Black.svg` (Victoria's Secret logo)

2. Update the title and metadata in `src/app/layout.tsx` if needed

## Support

For additional support or questions about this implementation, please contact your development team or Pinecone support.
