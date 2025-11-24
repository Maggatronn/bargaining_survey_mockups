# Quick Start Guide

## What's been added:

1. ✅ **Password Protection** - Users must enter a password before accessing the app
2. ✅ **GitHub Actions Deployment** - Automatically builds and deploys to GitHub Pages
3. ✅ **Secret Management** - API keys are stored securely as GitHub Secrets

## Add to your .env file NOW:

```bash
REACT_APP_ACCESS_PASSWORD=password
```

## To Deploy to GitHub Pages:

### 1. Push your code to GitHub

```bash
cd /Users/maggiehughes/Desktop/gsu-mocks
git add .
git commit -m "Add password protection and deployment"
git push origin main
```

### 2. Set up GitHub Secrets

Go to: `https://github.com/YOUR_USERNAME/YOUR_REPO/settings/secrets/actions`

Click "New repository secret" for each:

```
REACT_APP_AIRTABLE_API_KEY = [your airtable api key]
REACT_APP_AIRTABLE_BASE_ID = [your base id]
REACT_APP_AIRTABLE_TABLE_NAME_SURVEYRESPONSES = Bargaining Survey Responses
REACT_APP_AIRTABLE_TABLE_NAME_COMMENTS = Comments
REACT_APP_AIRTABLE_TABLE_NAME_TAGS = Tags
REACT_APP_AIRTABLE_TABLE_NAME_DEPARTMENTS = Departments
REACT_APP_AIRTABLE_TABLE_NAME_QUESTIONS = Questions
REACT_APP_AIRTABLE_TABLE_NAME_INSIGHT = Insight
REACT_APP_ACCESS_PASSWORD = password
```

### 3. Enable GitHub Pages

1. Go to Settings → Pages
2. Under "Source", select **"GitHub Actions"**
3. Save

### 4. Trigger Deployment

The deployment will automatically trigger when you push to main. Or you can:
1. Go to the Actions tab
2. Select "Deploy to GitHub Pages"
3. Click "Run workflow"

### 5. Access your app

Once deployed, visit: `https://YOUR_USERNAME.github.io/gsu-mocks/`

Enter password: `password` (or whatever you set in the secrets)

## How Password Protection Works:

- ✅ Users see a password prompt first
- ✅ Password is stored in `sessionStorage` (cleared when browser closes)
- ✅ Password value comes from `REACT_APP_ACCESS_PASSWORD` environment variable
- ✅ Can be changed anytime by updating the GitHub Secret

## Security Features:

1. **API Keys Never Exposed**: Built into the app during GitHub Actions build, never visible in source
2. **Password Protected**: Even if someone finds your URL, they need the password
3. **Session-based**: Authentication expires when browser closes
4. **.env is gitignored**: Local secrets never committed

## To Change Password:

1. Update `REACT_APP_ACCESS_PASSWORD` secret in GitHub
2. Push any change to trigger rebuild
3. New password takes effect after deployment

