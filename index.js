import { GoogleGenerativeAI } from "@google/generative-ai";
import readlineSync from "readline-sync";
import dotenv from "dotenv";
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEN_AI_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

function getWeatherData(city = '') {
    const weatherData = {
        jaipur: "10°C",
        delhi: "12°C",
        mumbai: "15°C",
        kolkata: "20°C",
        mohali: "20°C",
        chandigarh: "20°C"
    };
    return weatherData[city.toLowerCase()] || "Not Available";
}


function extractTemp(temp) {
    return parseInt(temp.replace('°C', ''));
}


function calculateWeather(operation, values) {
    const nums = values.map(v => extractTemp(v));
    switch(operation) {
        case 'sum':
            return nums.reduce((a, b) => a + b, 0);
        case 'average':
            return nums.reduce((a, b) => a + b, 0) / nums.length;
        case 'difference':
            return nums[0] - nums[1];
        case 'multiply':
            return nums.reduce((a, b) => a * b, 1);
        default:
            return null;
    }
}

const SystemPrompt = `You are an AI assistant. Follow these steps:
1. UNDERSTAND the query
2. PLAN the action
3. Use the ACTION to call available functions
4. Provide OUTPUT to the user in JSON format only

Available Tools:
- getWeatherData(city): Returns the weather of the city in Celsius
- calculateWeather(operation, temps): Performs calculations on temperatures
  Operations: 'sum', 'average', 'difference', 'multiply'

MUST follow this EXACT format for ALL responses:

START
{"type":"user","text":"What is the sum of temperatures in Jaipur and Mumbai?"}
UNDERSTAND
{"type":"system","text":"Need to get weather for both cities and calculate their sum"}
PLAN
{"type":"plan","text":"1. Get weather for both cities 2. Calculate sum"}
ACTION
{"type":"action","function":"calculate","cities":["jaipur","mumbai"],"operation":"sum"}
OUTPUT
{"type":"output","text":"25°C"}
END

NEVER return anything other than valid JSON in the above format.`;

async function executePrompt(userPrompt) {
    let currentState = {
        type: "user",
        text: userPrompt
    };

    while (true) {
        try {
            const result = await model.generateContent([
                { text: SystemPrompt },
                { text: JSON.stringify(currentState) }
            ]);

            const responseText = result.response.text();
            const lines = responseText.split('\n');
            
            for (const line of lines) {
                try {
                    const parsed = JSON.parse(line.trim());
                    console.log(`${parsed.type.toUpperCase()}: ${parsed.text}`);

                    if (parsed.type === "action") {
                        if (parsed.function === "calculate") {
                            const temps = parsed.cities.map(city => getWeatherData(city));
                            const result = calculateWeather(parsed.operation, temps);
                            currentState = {
                                type: "output",
                                text: `${result}°C`
                            };
                            console.log(`OUTPUT: ${result}°C`);
                            return;
                        }
                    }
                    
                    if (parsed.type === "output") {
                        return;
                    }

                    currentState = parsed;
                } catch (parseError) {
             
                    continue;
                }
            }
        } catch (error) {
            console.error("Error:", error);
            return;
        }
    }
}

const prompt = readlineSync.question("Enter your prompt: ");
executePrompt(prompt);