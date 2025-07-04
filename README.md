# AI Tutor Onboarding with Real-time Assessment

A modern, interactive onboarding flow for an AI-powered English tutoring platform. This project features a comprehensive 23-step onboarding process that culminates in a **real-time AI conversation** using OpenAI's Realtime API for authentic English assessment.

## Features

- **23-screen comprehensive onboarding flow**
- **Real-time AI conversation** with OpenAI's Realtime API
- **Live audio streaming** and voice interaction
- **Audio visualization** with real-time sound bars
- **Live transcription** of conversation
- Modern UI with glassmorphism design
- Interactive elements and smooth animations
- Progress tracking throughout the journey
- Mobile-responsive design
- Seamless integration of simulated and real AI interaction

## Project Structure

```
.
├── index.html          # Main HTML file
├── css/
│   └── styles.css      # Styles and animations
├── js/
│   └── app.js         # JavaScript functionality
└── README.md          # Project documentation
```

## Getting Started

### Prerequisites

- OpenAI API key with access to the **Realtime API** (GPT-4o Realtime Preview)
- Modern web browser with WebRTC support
- Microphone access for voice interaction

### Setup Instructions

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd tutor-web2pay
   ```

2. **Configure OpenAI API Key**
   
   Open `js/app.js` and find the `getApiKey()` method around line 61:
   ```javascript
   getApiKey() {
     // Replace with your actual OpenAI API key
     return "sk-your-openai-api-key-here";
   }
   ```
   
   Replace `"sk-your-openai-api-key-here"` with your actual OpenAI API key.

3. **Get OpenAI API Key**
   - Visit [OpenAI Platform](https://platform.openai.com/api-keys)
   - Create a new API key
   - Ensure you have access to the **Realtime API** (GPT-4o Realtime Preview)
   - Copy your API key and paste it in the `getApiKey()` method

4. **Serve the files**
   
   Due to CORS restrictions, you need to serve the files through a web server:
   
   **Option A: Using Python**
   ```bash
   # Python 3
   python -m http.server 3000
   
   # Python 2
   python -m SimpleHTTPServer 3000
   ```
   
   **Option B: Using Node.js**
   ```bash
   npx serve .
   ```
   
   **Option C: Using any other local server**

5. **Open in browser**
   
   Navigate to `http://localhost:3000` and start the assessment flow.

### Important Notes

⚠️ **Security Warning**: In production, never expose API keys in client-side code. The API key should be handled by a secure backend service.

🎤 **Microphone Permission**: The browser will request microphone access when you start the AI call (Screen 23). Please allow access for the real-time conversation to work.

🌐 **Browser Compatibility**: Requires modern browsers with WebRTC and WebSocket support (Chrome 76+, Safari 9+, Firefox 70+).

## Complete Screen Flow (23 Screens)

### Assessment Questionnaire (Screens 1-18)
1. **Welcome Screen** - Introduction with Product Hunt badge
2. **Speaking Frequency** - Daily English usage patterns
3. **Improvement Areas** - Focus areas for learning
4. **Main Goal** - Primary objectives for English improvement
5. **Speaking Challenges** - Obstacles when speaking English
6. **Agreement Statement** - Self-assessment agreement
7. **English Usage** - How English is used in daily life
8. **Work Field** - Professional background
9. **Statistics Animation** - Motivational career impact data
10. **Age Selection** - Age-appropriate learning adaptation
11. **Gender Selection** - Personalized AI tutor creation
12. **Current Methods** - Existing improvement strategies
13. **Learning Challenges** - Main learning obstacles
14. **Speaking Feelings** - Emotional response to speaking English
15. **Agreement Statement 2** - Second self-assessment
16. **Hardest Part** - Specific speaking difficulties
17. **70% Statistics** - Cambridge English research data
18. **Language Level** - Current proficiency self-assessment

### AI Assessment Setup (Screens 19-22)
19. **Assessment Offer** - Free assessment value proposition
20. **Confirmation Step** - Assessment participation confirmation
21. **Assessment Confirmation** - Final confirmation with avatar
22. **Call Setup** - Pre-call preparation screen

### Live AI Assessment (Screen 23)
23. **🔴 LIVE Real-time Call** - Interactive AI conversation with:
   - **Live audio streaming** to/from OpenAI
   - **Real-time transcription** display
   - **Audio visualizer** showing voice activity
   - **Call controls** (mute, end call)
   - **Dynamic status indicators**
   - **Live conversation history**

## Technologies Used

- **HTML5** - Semantic structure and modern web standards
- **CSS3** - Glassmorphism design with backdrop-filter effects
- **Vanilla JavaScript** - No frameworks, pure DOM manipulation
- **WebSocket** - Real-time communication with OpenAI
- **WebRTC** - Audio streaming and microphone access
- **OpenAI Realtime API** - Live AI conversation and assessment
- **Web Audio API** - Audio visualization and processing
- **CSS Animations** - Smooth transitions and visual feedback
- **Flexbox & Grid Layout** - Responsive design system

## Browser Support

The project uses modern CSS features like `backdrop-filter`. For best experience, use modern browsers:

- Chrome 76+
- Safari 9+
- Firefox 70+
- Edge 17+

## Real-time Features

### OpenAI Realtime API Integration
- **WebSocket connection** to OpenAI's Realtime API
- **Bi-directional audio streaming** for natural conversation
- **Server-side Voice Activity Detection (VAD)** for turn-taking
- **Live transcription** using Whisper integration
- **Configurable AI personality** (Stacy, the friendly English tutor)

### Audio Features
- **Real-time audio visualization** with animated bars
- **Microphone access** and audio processing
- **Echo cancellation** and noise suppression
- **Audio format conversion** (PCM16 for optimal quality)
- **Live playback** of AI responses

### UI/UX Enhancements
- **Dynamic status indicators** showing connection state
- **Live call controls** with mute/unmute functionality
- **Real-time transcript display** with speaker identification  
- **Animated avatar** responses during conversation
- **Professional call interface** matching modern video call apps

## API Key Security

🔒 **For Development**: 
- Set your API key directly in the `getApiKey()` method
- Use localhost/development domains only

🔒 **For Production**:
- Never expose API keys in client-side code
- Implement a secure backend proxy service
- Use environment variables on the server
- Implement proper authentication and rate limiting

## Troubleshooting

### Common Issues

**"Please set your OpenAI API key" Error**
- Ensure you've replaced the placeholder in `getApiKey()` method
- Verify your API key is valid and has Realtime API access

**Microphone Access Denied**
- Check browser permissions for microphone access
- Refresh the page and allow microphone when prompted
- Ensure you're using HTTPS or localhost

**WebSocket Connection Failed**
- Verify your API key has Realtime API access
- Check browser console for detailed error messages
- Ensure stable internet connection

**Audio Not Working**
- Check system audio settings
- Verify microphone is working in other applications
- Try using headphones to avoid feedback

## Browser Support

The project uses modern web APIs and requires:

- **Chrome 76+** - Full WebRTC and backdrop-filter support
- **Safari 9+** - WebKit audio processing
- **Firefox 70+** - WebSocket and WebRTC support  
- **Edge 17+** - Modern Chromium-based version

## Contributing

We welcome contributions! Please feel free to submit:
- 🐛 Bug reports and fixes
- ✨ Feature enhancements  
- 📖 Documentation improvements
- 🎨 UI/UX improvements
- 🔧 Performance optimizations

## License

This project is open source and available under the [MIT License](LICENSE).