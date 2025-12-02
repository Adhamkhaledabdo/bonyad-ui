# AI Features API Setup Guide

This document outlines the AI features added to the Bonyad app and the required backend API integration.

## 📋 Overview

Five AI-powered features have been added to the Overview page:
1. **Voice AI** - Speech-to-Text and Text-to-Speech
2. **Cost Explorer** - Project cost estimation
3. **Room Visualizer** - AI-powered room redesign
4. **Ask Bonyad AI** - Conversational assistant
5. **Projects Map** - 3D visualization of projects

## 🔑 Required API Keys

### Backend Configuration (NOT in Frontend)

All API keys should be stored **only in the backend** for security:

#### 1. OpenAI API
- **Services**: Voice AI (Whisper), Cost Explorer, Ask Bonyad AI, Projects Map Summary
- **Key Name**: `OPENAI_API_KEY`
- **Get from**: https://platform.openai.com/api-keys
- **Backend Environment Variable**:
  ```bash
  OPENAI_API_KEY=sk-...
  ```

#### 2. Stability.ai API
- **Service**: Room Visualizer
- **Key Name**: `STABILITY_AI_API_KEY`
- **Get from**: https://platform.stability.ai/account/api-keys
- **Backend Environment Variable**:
  ```bash
  STABILITY_AI_API_KEY=sk-...
  ```

#### 3. Mapbox API (Optional - for web map enhancement)
- **Service**: Projects Map (web version)
- **Key Name**: `MAPBOX_ACCESS_TOKEN`
- **Get from**: https://account.mapbox.com/access-tokens/
- **Note**: Android uses react-native-maps which requires Google Maps API (already configured)

## 🏗️ Backend API Endpoints to Implement

Your backend needs to implement these endpoints:

### 1. Voice AI - Speech Transcription
```
POST /api/ai/voice/transcribe
Content-Type: multipart/form-data

Body:
  - file: audio file (wav, mp3, m4a)
  
Response:
{
  "text": "transcribed text in Arabic or English",
  "language": "ar" or "en"
}
```

**Backend Implementation:**
- Receive audio file
- Call OpenAI Whisper API: `https://api.openai.com/v1/audio/transcriptions`
- Return transcribed text

---

### 2. Voice AI - Text to Speech (Optional)
```
POST /api/ai/voice/speech
Content-Type: application/json

Body:
{
  "text": "text to convert to speech",
  "language": "ar" or "en"
}

Response:
{
  "audioUrl": "https://...mp3"
}
```

**Backend Implementation:**
- Use ElevenLabs, Azure TTS, or OpenAI TTS
- Return audio file URL

---

### 3. Cost Explorer - Cost Estimation
```
POST /api/ai/cost/estimate
Content-Type: application/json

Body:
{
  "roomType": "kitchen",
  "area": 20,
  "material": "marble",
  "city": "riyadh"
}

Response:
{
  "minCostSAR": 18000,
  "maxCostSAR": 24000,
  "estimatedTimeDays": 10,
  "breakdown": {
    "labor": 8000,
    "materials": 12000,
    "other": 4000
  }
}
```

**Backend Implementation:**
- Send structured prompt to GPT-4o-mini with `response_format: "json_object"`
- Use this system prompt:
  ```
  "You are a Saudi home renovation cost estimator. Return JSON with minCostSAR, maxCostSAR, estimatedTimeDays, and breakdown."
  ```

---

### 4. Room Visualizer - Design Generation
```
POST /api/ai/design/generate
Content-Type: multipart/form-data

Body:
  - image: room photo (jpg, png)
  - style: "modern" | "majlis" | "minimal" | "industrial"

Response:
{
  "imageUrl": "https://...jpg",
  "beforeImage": "https://...jpg"
}
```

**Backend Implementation:**
- Use Stability.ai API: `https://api.stability.ai/v2beta/stable-image/generate/core`
- Set `mode: "image-to-image"`
- `strength: 0.7`
- Return generated image URL

---

### 5. Ask Bonyad AI - Chat Assistant
```
POST /api/ai/chat
Content-Type: application/json
Authorization: Bearer {token}

Body:
{
  "message": "user message",
  "conversationId": "optional-conversation-id"
}

Response:
{
  "response": "AI response",
  "conversationId": "conversation-id"
}
```

**Backend Implementation:**
- Use GPT-4o-mini
- Add context about Bonyad services, categories, cities
- Support Arabic and English
- Maintain conversation history if conversationId provided

---

### 6. Projects Map - Map Data with AI Summary
```
GET /api/ai/map/projects
Content-Type: application/json
Authorization: Bearer {token}

Response:
{
  "projects": [
    {
      "region": "Riyadh",
      "lat": 24.7136,
      "lng": 46.6753,
      "status": "Active",
      "count": 32
    }
  ],
  "aiSummary": "AI-generated summary of project distribution"
}
```

**Backend Implementation:**
- Fetch projects from database
- Call GPT-4o-mini to generate summary
- Return projects + summary

---

## 🔐 Security Best Practices

### ✅ DO:
- Store all API keys in backend environment variables
- Validate and sanitize all user inputs
- Rate limit AI endpoints (especially expensive ones like image generation)
- Cache responses when appropriate (cost estimates, summaries)
- Use authentication tokens for user-specific endpoints

### ❌ DON'T:
- Never expose API keys in frontend code
- Never commit API keys to git
- Don't make OpenAI/Stability calls directly from mobile app
- Don't trust user input without validation

---

## 💰 Estimated Monthly Costs

| Feature | Provider | Monthly Estimate |
|---------|----------|------------------|
| Voice AI (Whisper) | OpenAI | $30 |
| Cost Explorer | GPT-4o-mini | $40 |
| Room Visualizer | Stability.ai | $70 |
| Ask Bonyad AI | GPT-4o-mini | $50 |
| Projects Map Summary | GPT-4o-mini | $30 |
| **Total** | | **≈ $220/month** |

---

## 📱 Frontend Integration

All frontend screens are ready with:
- ✅ UI design complete
- ✅ Form validations
- ✅ Loading states
- ✅ Error handling
- ✅ API endpoint definitions in `src/config/api.ts`

You just need to:
1. Implement the backend endpoints above
2. Update the frontend screens to call the actual API (currently using placeholder `setTimeout`)
3. Add error handling and retry logic

---

## 🚀 Next Steps

### Phase 1: Backend Setup (Recommended)
1. Set up environment variables on your backend server
2. Install necessary packages (OpenAI SDK, Stability.ai SDK, etc.)
3. Implement `/ai/cost/estimate` first (simplest)
4. Implement `/ai/chat` (base for all GPT calls)
5. Implement `/ai/voice/transcribe`
6. Implement `/ai/design/generate`
7. Implement `/ai/map/projects`

### Phase 2: Frontend Integration
1. Update `VoiceAIScreen.tsx` to call real API
2. Update `CostExplorerScreen.tsx` to call real API
3. Update `AskBonyadAIScreen.tsx` to call real API
4. Update `RoomVisualizerScreen.tsx` to call real API
5. Update `ProjectsMapScreen.tsx` to call real API

### Phase 3: Testing & Optimization
1. Test all features on Android and Web
2. Add rate limiting if needed
3. Optimize API costs (caching, request pooling)
4. Add analytics to track usage

---

## 📝 Example Backend Code (Java/Spring Boot)

```java
@RestController
@RequestMapping("/api/ai")
public class AIController {
    
    @Autowired
    private OpenAIService openAIService;
    
    @PostMapping("/cost/estimate")
    public CostEstimate estimateCost(@RequestBody CostRequest request) {
        // Call OpenAI API
        String prompt = String.format(
            "Estimate cost for %s in %s with %s. Area: %dm²",
            request.getRoomType(),
            request.getCity(),
            request.getMaterial(),
            request.getArea()
        );
        
        return openAIService.estimateCost(prompt);
    }
}
```

---

## 🐛 Troubleshooting

### Issue: CORS errors when calling AI APIs from frontend
**Solution**: All API calls must go through your backend, not directly from frontend.

### Issue: Audio upload fails
**Solution**: Check file size limits (recommend max 25MB) and supported formats.

### Issue: Image generation timeout
**Solution**: Stability.ai can take 10-30 seconds. Use async processing or increase timeout.

### Issue: Arabic text not working in AI responses
**Solution**: Ensure your GPT prompts specify Arabic support and use `gpt-4o-mini` (has better Arabic support).

---

## 📞 Support

For questions about:
- **Backend Implementation**: See your backend team
- **OpenAI**: https://platform.openai.com/docs
- **Stability.ai**: https://platform.stability.ai/docs
- **Frontend Issues**: Check the feature screen implementations

