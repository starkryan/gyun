# Chumzr Backend Server

Backend server for the Chumzr React Native application.

## Deployment to Render.com

This application is configured to deploy to Render.com in two ways:

### Using Docker (Recommended)

1. Push this repository to GitHub
2. In Render.com, create a new Web Service
3. Connect your GitHub repository
4. Select "Docker" as the environment
5. The default settings should work (no need to modify build command, start command, etc.)
6. Add the following environment variables:
   - `NODE_ENV`: `production`
   - `MONGODB_URI`: Your MongoDB connection string
   - `ADMIN_USERNAME`: Admin username
   - `ADMIN_PASSWORD`: Admin password
   - `ADMIN_API_KEY`: API key for admin operations
   - `BUNNY_API_KEY`: Bunny.net API key
   - `OPENAI_API_KEY`: OpenAI API key
7. Configure a persistent disk for uploads (recommended)

### Using render.yaml Blueprint

1. Push this repository to GitHub
2. In Render.com, select "Blueprint" and connect your repository
3. Follow the prompts to deploy

See [DEPLOY.md](./DEPLOY.md) for detailed deployment instructions.
