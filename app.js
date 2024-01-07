import express from "express";
import bodyParser from "body-parser";
import OpenAI from "openai";
import fs from "fs";
import dotenv from "dotenv";
import morgan from "morgan";

dotenv.config();

// 환경변수로 node에서 허가되지 않은 인증TLS통신을 거부하지 않겠다고 설정
// process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const app = express();
app.use(bodyParser.json());
app.use(morgan("combined"));
app.use(express.static('static'));
const apiKey = process.env.OPENAI_API_KEY;
const openai = new OpenAI(apiKey);

let assistant_id = process.env.ASSISTANT_ID;
console.log(`Assistant ID: ${assistant_id}`);

app.get('*', (req, res) => {
  // console.log(__dirname)
    // res.sendFile(path.resolve(__dirname, 'build', 'index.html'));
  });

// Endpoint to handle chat
app.post("/chat", async (req, res) => {
  try {
    assistant_id = req.header('assistant_id');
    console.log(`Assistant ID: ${assistant_id}`);

    if (!req.body.message) {
      return res.status(400).json({ error: "Message field is required" });
    }
    const userMessage = req.body.message;

    // Create a Thread
    const threadResponse = await openai.beta.threads.create();
    const threadId = threadResponse.id;

    // Add a Message to a Thread
    await openai.beta.threads.messages.create(threadId, {
      role: "user",
      content: userMessage,
    });

    // Run the Assistant
    const runResponse = await openai.beta.threads.runs.create(threadId, {
      assistant_id: assistant_id,
    });

    // Check the Run status
    let run = await openai.beta.threads.runs.retrieve(threadId, runResponse.id);
    while (run.status !== "completed") {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      run = await openai.beta.threads.runs.retrieve(threadId, runResponse.id);
    }

    // Display the Assistant's Response
    const messagesResponse = await openai.beta.threads.messages.list(threadId);
    const assistantResponses = messagesResponse.data.filter(msg => msg.role === 'assistant');
    // console.log(messagesResponse)
    const response = assistantResponses.map(msg => 
      msg.content
        .filter(contentItem => contentItem.type === 'text')
        .map(textContent => textContent.text.value)
        // .join('\n')
    ).join('\n');

    res.json({ response });
  } catch (error) {
    console.error("Error processing chat:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
