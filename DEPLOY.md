# Deploying Chumzr Backend to Render.com

This guide provides instructions for deploying the Chumzr backend server to Render.com.

## Prerequisites

- A Render.com account
- Git repository with your backend code

## Deployment Methods

You have two options for deploying the server:

### Method 1: Using the Dashboard

1. Log in to your Render.com account
2. Click on "New +" button and select "Web Service"
3. Connect your GitHub/GitLab repository
4. Configure the service:
   - Name: `chumzr-backend`
   - Environment: `Node`
   - Region: Choose nearest to your users
   - Branch: `main` (or your preferred branch)
   - Build Command: `./build.sh`
   - Start Command: `./start.sh`
   - Plan: Select appropriate plan (Free/Starter/etc.)

5. Add environment variables:
   - `NODE_ENV`: `production`
   - `PORT`: `10000` (Render will set the actual PORT)
   - `MONGODB_URI`: Your MongoDB connection string
   - `ADMIN_USERNAME`: Admin username
   - `ADMIN_PASSWORD`: Admin password
   - `ADMIN_API_KEY`: API key for admin operations
   - `BUNNY_API_KEY`: Bunny.net API key
   - `OPENAI_API_KEY`: OpenAI API key

6. Configure a disk:
   - Name: `chumzr-uploads`
   - Mount Path: `/opt/render/project/src/uploads`
   - Size: 1 GB (adjust as needed)

7. Click "Create Web Service"

### Method 2: Using render.yaml (Blueprint)

1. Push the `render.yaml` file in this repository to your Git repository
2. In your Render dashboard, click "Blueprint" and select your repository
3. Follow the prompts to deploy the services defined in the YAML file
4. Add your secret environment variables in the Render dashboard

## Important Files

- `render.yaml`: Configuration file for Render.com blueprint deployment
- `build.sh`: Script that runs during the build phase (installs dependencies, creates directories)
- `start.sh`: Script that runs to start the server
- `Procfile`: Defines process types for Render.com

## Important Notes

- The health check endpoint is configured at `/api/health`
- Render automatically assigns its own PORT, but the application uses `process.env.PORT`
- Set up MongoDB Atlas or another cloud MongoDB provider before deploying
- The disk storage is used for uploads and temporary files
- Make sure the build and start scripts are executable (`chmod +x build.sh start.sh`)

## MongoDB Setup

1. Create a MongoDB Atlas account if you don't have one
2. Create a new cluster
3. Set up database access (username/password)
4. Set up network access (allow access from anywhere for Render.com deployment)
5. Get your connection string and add it to Render environment variables

## Updating the Deployment

- Render.com will automatically deploy when you push to your configured branch
- You can also manually deploy from the Render dashboard

## Troubleshooting

If your deployment fails, check the logs in the Render dashboard for error messages. Common issues include:

- Missing environment variables
- MongoDB connection errors
- Port conflicts (should use `process.env.PORT`)
- Permission issues with the disk mountpoint
- Script permissions (scripts need to be executable)

## Status Monitoring

- Use the `/api/health` endpoint to check the status of your deployment
- Monitor the logs in the Render dashboard for any errors 