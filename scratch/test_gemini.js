const path = require('path');
const fs = require('fs');

// .env.local 수동 파싱
let apiKey = '';
try {
  const envContent = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8');
  const lines = envContent.split('\n');
  for (const line of lines) {
    if (line.startsWith('GEMINI_API_KEY=')) {
      apiKey = line.split('GEMINI_API_KEY=')[1].trim();
    }
  }
} catch (e) {
  console.error('Failed to read .env.local:', e);
}

console.log('Gemini API Key loaded length:', apiKey ? apiKey.length : 0);
console.log('Gemini API Key raw prefix:', apiKey ? apiKey.substring(0, 8) : 'none');

async function testGemini() {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  const payload = {
    contents: [{
      parts: [{ text: "Hello! Reply with 'OK' if you can read this." }]
    }]
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    console.log('Gemini Test Response Status:', res.status);
    const data = await res.json();
    console.log('Gemini Test Response Body:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Gemini Test Fetch Error:', err);
  }
}

async function testImagen() {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:generateImages?key=${apiKey}`;
  const payload = {
    prompt: "A cute little yellow duck sticker, cartoon style, solid white background",
    numberOfImages: 1,
    outputMimeType: "image/png",
    aspectRatio: "1:1"
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    console.log('Imagen Test Response Status:', res.status);
    const data = await res.json();
    console.log('Imagen Test Response Body (truncated):', JSON.stringify({ 
      ...data, 
      generatedImages: data.generatedImages ? `Found ${data.generatedImages.length} images` : 'none' 
    }, null, 2));
    if (data.generatedImages && data.generatedImages[0]) {
      console.log('Image Bytes Length:', data.generatedImages[0].image.imageBytes.length);
    }
  } catch (err) {
    console.error('Imagen Test Fetch Error:', err);
  }
}

async function listModels() {
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  try {
    const res = await fetch(url);
    console.log('List Models Status:', res.status);
    const data = await res.json();
    console.log('Available Models:', data.models ? data.models.map(m => m.name) : data);
  } catch (err) {
    console.error('List Models Fetch Error:', err);
  }
}

async function getModelDetails() {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001?key=${apiKey}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    console.log('Imagen 4.0 Model Details:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Failed to fetch model details:', err);
  }
}

async function run() {
  console.log('--- Listing Available Models ---');
  await listModels();
  console.log('\n--- Fetching Imagen 4.0 Details ---');
  await getModelDetails();
  console.log('\n--- Testing Gemini 2.0 Flash ---');
  await testGemini();
  console.log('\n--- Testing Imagen 4.0 ---');
  await testImagen();
}

run();
