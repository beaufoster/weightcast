# Trimly - Weight Loss Calculator

A progressive web app for tracking weight loss progress and calculating personalized weight loss plans.

## Features

- Personalized weight loss plan calculation
- Daily check-ins and progress tracking
- Streak tracking and milestones
- PWA for offline use
- Responsive design
- PostHog analytics integration

## Getting Started

### Development

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```
This will start Vite dev server at `http://localhost:3000`

### Production Build

1. Build for production:
```bash
npm run build
```

2. Preview the production build:
```bash
npm run preview
```

The built files will be in the `dist/` directory, ready for deployment.

## Project Structure

```
trimly/
├── index.html          # Main HTML structure
├── src/
│   ├── css/
│   │   └── styles.css  # All styles
│   └── js/
│       └── app.js      # Application logic
├── public/
│   └── manifest.json   # PWA manifest
├── vite.config.js      # Vite configuration
├── package.json        # Dependencies and scripts
└── dist/               # Production build output
```

## Technologies

- **Vite**: Modern build tool for fast development
- **HTML5**: Semantic markup
- **CSS3**: Responsive design with custom properties
- **Vanilla JavaScript**: No frameworks, lightweight
- **Local Storage**: Client-side data persistence
- **PostHog**: Analytics and user tracking

## Configuration

### Analytics Setup

1. Create a PostHog project at [posthog.com](https://posthog.com)
2. Get your project API key
3. In `src/js/app.js`, replace `'YOUR_POSTHOG_KEY'` with your actual key:
```javascript
const PH_KEY = 'your_actual_posthog_key_here';
```

### Test Environment

Add `?env=test` to the URL to enable test mode:
- Data is stored separately (`tr_test_` prefix)
- Analytics are disabled
- Visual indicator shows test mode

## Deployment

### Test Site (GitHub Pages)

1. Create a new GitHub repository
2. Push your code to the `main` branch
3. Enable GitHub Pages in repository settings
4. Set source to "GitHub Actions" and create a workflow:

```yaml
# .github/workflows/deploy.yml
name: Deploy to GitHub Pages
on:
  push:
    branches: [ main ]
jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - uses: actions/setup-node@v3
      with:
        node-version: '18'
    - run: npm ci
    - run: npm run build
    - uses: peaceiris/actions-gh-pages@v3
      with:
        github_token: ${{ secrets.GITHUB_TOKEN }}
        publish_dir: ./dist
```

### Production Site (Vercel/Netlify)

1. Connect your GitHub repository
2. Set build command: `npm run build`
3. Set publish directory: `dist`
4. Deploy!

## Development Notes

- The app uses localStorage for data persistence
- PWA features include offline caching and install prompts
- All calculations are done client-side for privacy
- Responsive design works on mobile and desktop

## License

[Add license information]
