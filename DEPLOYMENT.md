# Deployment Guide for GitHub Pages

## Step 1: Add to .env file

Add this line to your `.env` file (keep it local, don't commit it):

```
REACT_APP_ACCESS_PASSWORD=password
```

You can change "password" to whatever you want the access password to be.

## Step 2: Set up GitHub Repository Secrets

1. Go to your GitHub repository
2. Click on **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret** and add each of these:

### Required Secrets:

| Secret Name | Value |
|-------------|-------|
| `REACT_APP_AIRTABLE_API_KEY` | Your Airtable API key |
| `REACT_APP_AIRTABLE_BASE_ID` | Your Airtable base ID |
| `REACT_APP_AIRTABLE_TABLE_NAME_SURVEYRESPONSES` | `Bargaining Survey Responses` |
| `REACT_APP_AIRTABLE_TABLE_NAME_COMMENTS` | `Comments` |
| `REACT_APP_AIRTABLE_TABLE_NAME_TAGS` | `Tags` |
| `REACT_APP_AIRTABLE_TABLE_NAME_DEPARTMENTS` | `Departments` |
| `REACT_APP_AIRTABLE_TABLE_NAME_QUESTIONS` | `Questions` |
| `REACT_APP_AIRTABLE_TABLE_NAME_INSIGHT` | `Insight` |
| `REACT_APP_ACCESS_PASSWORD` | `password` (or your chosen password) |

## Step 3: Enable GitHub Pages

1. Go to **Settings** → **Pages**
2. Under **Source**, select **GitHub Actions**
3. Save

## Step 4: Update package.json

Add this line to your `package.json` in the data-explorer folder:

```json
"homepage": "https://YOUR_USERNAME.github.io/YOUR_REPO_NAME"
```

Replace `YOUR_USERNAME` with your GitHub username and `YOUR_REPO_NAME` with your repository name.

## Step 5: Push to GitHub

```bash
cd /Users/maggiehughes/Desktop/gsu-mocks
git add .
git commit -m "Add deployment configuration"
git push origin main
```

## Step 6: Wait for Deployment

1. Go to the **Actions** tab in your GitHub repository
2. Watch the deployment workflow run
3. Once complete, your app will be live at: `https://YOUR_USERNAME.github.io/YOUR_REPO_NAME`

## Security Notes

- ✅ Your API keys are stored as GitHub Secrets (encrypted)
- ✅ They are only accessible during the build process
- ✅ They are NOT exposed in the built files
- ✅ Password protection prevents unauthorized access
- ✅ The `.env` file is in `.gitignore` so it won't be committed

## Troubleshooting

If deployment fails:
1. Check the Actions tab for error messages
2. Verify all secrets are set correctly
3. Make sure the homepage in package.json is correct
4. Ensure GitHub Pages is enabled with "GitHub Actions" as the source


