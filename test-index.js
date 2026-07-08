import { ensureVectorStoreConnected } from './src/vector/factory.ts';

async function testVectorStore() {
  console.log('Connecting to vector store...');
  const store = await ensureVectorStoreConnected();
  
  console.log('Vector store connected');
  const stats = await store.getStats();
  console.log('Current stats:', stats);
  
  // Test with a few sample documents
  const testDocs = [
    {
      id: 'test_1',
      document: 'This is a test document about vector search and embeddings',
      metadata: {
        type: 'test',
        source_file: '/test/file1.md',
        concepts: ['test', 'vector', 'embeddings']
      }
    },
    {
      id: 'test_2', 
      document: 'Another test document for semantic search capabilities',
      metadata: {
        type: 'test',
        source_file: '/test/file2.md',
        concepts: ['test', 'semantic', 'search']
      }
    }
  ];
  
  console.log('Adding test documents...');
  await store.addDocuments(testDocs);
  
  const newStats = await store.getStats();
  console.log('Stats after adding documents:', newStats);
  
  // Test search
  console.log('Testing search...');
  const results = await store.query('vector search embeddings', 5);
  console.log('Search results:', {
    count: results.ids?.length || 0,
    ids: results.ids,
    distances: results.distances
  });
}

testVectorStore().catch(console.error);
