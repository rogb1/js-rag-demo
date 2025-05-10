import express from 'express';
import { config } from 'dotenv';
import { DirectoryLoader } from 'langchain/document_loaders/fs/directory';
import { TextLoader } from 'langchain/document_loaders/fs/text';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { OpenAIEmbeddings, ChatOpenAI } from "@langchain/openai";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
config();

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/run-rag', async (req, res) => {
  try {
    console.log('🚀 Starting RAG Demo with LangChain and OpenAI');

    // Initialize models
    const embeddings = new OpenAIEmbeddings({
      modelName: "text-embedding-ada-002",
      stripNewLines: true
    });
    const llm = new ChatOpenAI({
      modelName: 'gpt-3.5-turbo',
      temperature: 0.2
    });

    // Step 1: Load documents
    console.log('\n📚 Loading documents...');
    const documentsPath = path.join(__dirname, 'documents');
    const loader = new DirectoryLoader(documentsPath, {
      '.txt': (path) => new TextLoader(path)
    });
    const docs = await loader.load();
    console.log(`Loaded ${docs.length} documents.`);

    // Step 2: Split documents into chunks
    console.log('\n✂️ Splitting documents into chunks...');
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 500,
      chunkOverlap: 100
    });
    const splitDocs = await textSplitter.splitDocuments(docs);
    console.log(`Created ${splitDocs.length} chunks.`);

    // Step 3: Create vector store
    console.log('\n🧠 Creating in-memory vector store...');
    const vectorStore = await MemoryVectorStore.fromDocuments(splitDocs, embeddings);
    console.log('Vector store created successfully.');

    // Step 4: Process a query
    const query = req.query.q || 'What is RAG and what are its key components?';
    console.log(`\n❓ Question: ${query}`);
    const relevantDocs = await vectorStore.similaritySearch(query, 2);
    const context = relevantDocs.map((doc, i) => `Document ${i + 1}:\n${doc.pageContent}`).join('\n\n');
    const prompt = `
      Answer the question based on the following context:
      
      ${context}
      
      Question: ${query}
      
      When answering, make sure to cite your source as [Document X].
    `;
    const response = await llm.invoke(prompt);
    console.log('\n🔍 Answer:', response.content);

    res.json({
      question: query,
      answer: response.content,
      context: relevantDocs.map((doc, i) => ({
        document: i + 1,
        content: doc.pageContent
      }))
    });
  } catch (error) {
    console.error('Error in RAG demo:', error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});