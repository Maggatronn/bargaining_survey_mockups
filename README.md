# GSU Organizers Data Explorer

A simple, one-page React application for exploring and analyzing organizer data.

## Features

- **Search**: Search across all fields in the dataset
- **Filters**: Filter by Department and Role
- **Statistics**: View real-time stats about filtered data
- **Responsive Cards**: Clean card-based layout for easy data browsing
- **Modern UI**: Beautiful gradient design with smooth interactions

## Getting Started

### Install Dependencies
```bash
npm install
```

### Run the Development Server
```bash
npm start
```

The app will open at [http://localhost:3000](http://localhost:3000)

## Data Source

Currently using CSV data from `public/Organizers-Grid view.csv`

### Future: Airtable Integration

To connect to Airtable:

1. Create a `.env.local` file in the root directory
2. Add your Airtable credentials:
```
REACT_APP_AIRTABLE_API_KEY=your_api_key_here
REACT_APP_AIRTABLE_BASE_ID=your_base_id_here
REACT_APP_AIRTABLE_TABLE_NAME=your_table_name_here
```

3. Update the data fetching logic in `src/App.js` to use the Airtable API

## Project Structure

```
data-explorer/
├── public/
│   └── Organizers-Grid view.csv  # Data file
├── src/
│   ├── App.js                     # Main application component
│   ├── App.css                    # Styles
│   └── index.js                   # Entry point
├── .env.local                     # Environment variables (not committed)
└── package.json
```

## Technologies Used

- React 18
- CSS3 with modern features
- CSV parsing
- Responsive design

## Security Note

The `.env.local` file is included in `.gitignore` to keep your API keys secure. Never commit this file to version control.


