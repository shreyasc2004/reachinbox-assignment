import { Client } from '@elastic/elasticsearch';

export const esClient = new Client({
  node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
});

export const setupElasticsearch = async () => {
  try {
    const index = 'emails';
    const exists = await esClient.indices.exists({ index });
    if (!exists) {
      await esClient.indices.create({
        index,
        body: {
          mappings: {
            properties: {
              id: { type: 'keyword' },
              subject: { type: 'text' },
              body: { type: 'text' },
              to: { type: 'keyword' },
              status: { type: 'keyword' },
              scheduledAt: { type: 'date' },
              sentAt: { type: 'date' },
              userId: { type: 'keyword' }
            }
          }
        }
      });
      console.log(`Created Elasticsearch index: ${index}`);
    }
  } catch (err) {
    console.error("Failed to setup Elasticsearch index (it might be down or need auth):", err);
  }
};
