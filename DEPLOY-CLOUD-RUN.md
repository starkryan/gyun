# Deploying Chumzr Backend to Google Cloud Run

This guide provides instructions for deploying the Chumzr backend server to Google Cloud Run.

## Prerequisites

- Google Cloud Platform account
- Google Cloud SDK installed locally
- Docker installed locally (for testing)
- Git repository with your backend code

## Deployment Methods

You have two options for deploying the server:

### Method 1: Manual Deployment using Google Cloud Console

1. **Enable Required APIs**
   - Cloud Run API
   - Cloud Build API
   - Container Registry API

2. **Build and Push the Docker Container**
   ```bash
   # Authenticate with Google Cloud
   gcloud auth login
   
   # Set your project ID
   gcloud config set project YOUR_PROJECT_ID
   
   # Build your container
   docker build -t gcr.io/YOUR_PROJECT_ID/chumzr-backend:latest .
   
   # Configure Docker to use Google Cloud credentials
   gcloud auth configure-docker
   
   # Push the container to Google Container Registry
   docker push gcr.io/YOUR_PROJECT_ID/chumzr-backend:latest
   ```

3. **Deploy to Cloud Run**
   - Go to Google Cloud Console > Cloud Run
   - Click "Create Service"
   - Select the container image you pushed
   - Configure the service:
     - Service name: `chumzr-backend`
     - Region: Choose one close to your users
     - CPU allocation: Only during requests
     - Minimum instances: 0
     - Maximum instances: 10 (adjust as needed)
     - Memory: 1 GiB
     - CPU: 1
     - Request timeout: 300 seconds
     - Ingress: Allow all traffic
     - Authentication: Allow unauthenticated invocations

4. **Set Environment Variables**
   In the Cloud Run service configuration, add these environment variables:
   - `NODE_ENV`: `production`
   - `MONGODB_URI`: Your MongoDB connection string
   - `ADMIN_USERNAME`: Admin username
   - `ADMIN_PASSWORD`: Admin password
   - `ADMIN_API_KEY`: API key for admin operations
   - `BUNNY_API_KEY`: Bunny.net API key
   - `OPENAI_API_KEY`: OpenAI API key

### Method 2: Using Cloud Build (CI/CD)

1. **Set up a GitHub or Cloud Source Repository**
   - Push your code to a repository
   - Ensure `cloudbuild.yaml` is in the repository root

2. **Create a Cloud Build Trigger**
   - Go to Google Cloud Console > Cloud Build > Triggers
   - Create a new trigger
   - Connect to your repository
   - Configure the trigger:
     - Name: `chumzr-backend-deploy`
     - Event: Push to a branch
     - Source: Your repository and branch (e.g., main)
     - Configuration: Cloud Build configuration file
     - Location: Repository
     - Cloud Build configuration file location: `cloudbuild.yaml`

3. **Set up Secret Manager for Environment Variables**
   - Go to Google Cloud Console > Security > Secret Manager
   - Create secrets for all sensitive environment variables
   - Grant the Cloud Run service account access to these secrets

4. **Commit and Push to Deploy**
   - Every push to your configured branch will trigger a build and deployment

## Handling File Storage in Cloud Run

Cloud Run is stateless and doesn't provide persistent file storage. For file uploads, consider:

1. **Google Cloud Storage**
   - Modify the application to use GCS for file storage
   - Add the Cloud Storage SDK to your application
   - Update file upload handlers to store files in GCS

2. **MongoDB GridFS**
   - Store files directly in MongoDB using GridFS

## MongoDB Setup

1. Create a MongoDB Atlas account if you don't have one
2. Create a new cluster
3. Set up database access (username/password)
4. Set up network access (allow access from anywhere for Cloud Run deployment)
5. Get your connection string and add it to Cloud Run environment variables

## Managing Secrets

For sensitive environment variables:

1. Create secrets in Secret Manager:
   ```bash
   gcloud secrets create MONGODB_URI --replication-policy="automatic"
   echo -n "mongodb+srv://username:password@cluster.mongodb.net/database" | \
     gcloud secrets versions add MONGODB_URI --data-file=-
   ```

2. Grant access to the Cloud Run service:
   ```bash
   gcloud secrets add-iam-policy-binding MONGODB_URI \
     --member="serviceAccount:YOUR_PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
     --role="roles/secretmanager.secretAccessor"
   ```

3. Reference the secret in your Cloud Run deployment:
   ```bash
   gcloud run deploy chumzr-backend \
     --image=gcr.io/YOUR_PROJECT_ID/chumzr-backend:latest \
     --set-secrets=MONGODB_URI=MONGODB_URI:latest
   ```

## Monitoring and Logging

- View logs in Google Cloud Console > Cloud Run > chumzr-backend > Logs
- Set up Cloud Monitoring alerts for errors and performance
- Use the `/api/health` endpoint to check the service status

## Troubleshooting

Common issues:

- **Cold Start Delays**: First request after idle period may be slow
- **Connection Timeouts**: Check MongoDB connection string and network access
- **Memory Limits**: Adjust memory allocation if you see out of memory errors
- **Request Timeouts**: Long-running operations may exceed timeout limits

## Updating the Deployment

- Push new code to trigger automatic deployment (if using Cloud Build)
- Or manually update the image in the Cloud Run console

## Cost Optimization

- Use minimum instances of 0 to scale to zero when not in use
- Monitor usage and adjust maximum instances accordingly
- Consider using CPU allocation "only during requests" 