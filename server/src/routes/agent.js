const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { calculateComparisonLogic } = require('./compare');
const { queryOSMNominatim } = require('./location');

// Helper to run geocoding/search for address
const runSearch = async (query) => {
  try {
    const results = await queryOSMNominatim(query);
    if (results && results.length > 0) {
      return {
        success: true,
        name: results[0].description,
        lat: results[0].lat,
        lng: results[0].lng
      };
    }
    return { success: false, message: 'No location found' };
  } catch (err) {
    console.error('Agent search tool failed:', err);
    return { success: false, error: err.message };
  }
};

// Helper to run route comparison
const runComparison = async (fromLat, fromLng, toLat, toLng) => {
  try {
    const from = { lat: parseFloat(fromLat), lng: parseFloat(fromLng) };
    const to = { lat: parseFloat(toLat), lng: parseFloat(toLng) };
    // OSRM/Google Maps key can be empty or read from env
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    const result = await calculateComparisonLogic(from, to, apiKey);
    return { success: true, ...result };
  } catch (err) {
    console.error('Agent comparison tool failed:', err);
    return { success: false, error: err.message };
  }
};

// @route   POST /api/agent/chat
// @desc    Communicate with travel agent with function tools
// @access  Public
router.post('/chat', async (req, res) => {
  const { message, history } = req.body;
  
  if (!message) {
    return res.status(400).json({ message: 'Message is required' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(200).json({
      error: 'API_KEY_MISSING',
      message: 'Please set your GEMINI_API_KEY in the server/.env file to chat with the AI assistant.'
    });
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      systemInstruction: `You are CommuteIQ Travel Assistant, an expert AI concierge for commuting in Bangalore. You help users navigate the city efficiently.
You have access to tools that can:
1. searchAddress(query): Search for coordinates (latitude and longitude) of a location in Bangalore.
2. calculateComparison(fromLat, fromLng, toLat, toLng): Compare Metro, Cab (Uber), and Hybrid (Metro + Cab) route options.

If the user wants to plan a journey, you MUST first search the coordinates of both the starting point and the destination using 'searchAddress' (if they didn't provide coordinates directly).
Then, you MUST call 'calculateComparison' to compare routes between those coordinates.
Finally, recommend the best route (Metro, Uber, or Hybrid) based on their preferences (e.g., cheaper vs. faster). If they select a hybrid route, highlight which intermediate station they should exit and transition to a cab.
Present options clearly using Markdown tables or lists. Keep responses friendly, helpful, and concise.`
    });

    const tools = [
      {
        functionDeclarations: [
          {
            name: 'calculateComparison',
            description: 'Calculate and compare pure Metro, direct Cab (Uber), and Hybrid (Metro + Cab) routes between source and destination coordinates in Bangalore.',
            parameters: {
              type: 'OBJECT',
              properties: {
                fromLat: { type: 'NUMBER', description: 'Latitude of the starting location' },
                fromLng: { type: 'NUMBER', description: 'Longitude of the starting location' },
                toLat: { type: 'NUMBER', description: 'Latitude of the destination location' },
                toLng: { type: 'NUMBER', description: 'Longitude of the destination location' },
              },
              required: ['fromLat', 'fromLng', 'toLat', 'toLng'],
            },
          },
          {
            name: 'searchAddress',
            description: 'Search for addresses, metro stations, or landmarks in Bangalore to get their coordinates (latitude and longitude).',
            parameters: {
              type: 'OBJECT',
              properties: {
                query: { type: 'STRING', description: 'The search query (e.g., Majestic, Indiranagar, Phoenix Mall)' },
              },
              required: ['query'],
            },
          },
        ],
      },
    ];

    // Format chat history for Gemini API
    const formattedHistory = (history || []).map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }));

    const chat = model.startChat({
      history: formattedHistory,
      tools: tools
    });

    let result = await chat.sendMessage(message);
    let lastCalculation = null;

    // Handle tool call loop (max 3 iterations to avoid infinite loops)
    for (let i = 0; i < 3; i++) {
      const calls = result.response.functionCalls;
      if (!calls || calls.length === 0) break;

      const call = calls[0];
      let toolResponse = null;

      if (call.name === 'calculateComparison') {
        const { fromLat, fromLng, toLat, toLng } = call.args;
        const compResult = await runComparison(fromLat, fromLng, toLat, toLng);
        lastCalculation = compResult;
        toolResponse = compResult;
      } else if (call.name === 'searchAddress') {
        const { query } = call.args;
        toolResponse = await runSearch(query);
      }

      // Send the tool execution result back to Gemini
      result = await chat.sendMessage([
        {
          functionResponse: {
            name: call.name,
            response: { result: toolResponse }
          }
        }
      ]);
    }

    res.json({
      text: result.response.text(),
      route: lastCalculation && lastCalculation.success ? lastCalculation : null
    });

  } catch (error) {
    console.error('Agent chat endpoint error:', error);
    res.status(500).json({ message: 'AI Agent error', error: error.message });
  }
});

module.exports = router;
