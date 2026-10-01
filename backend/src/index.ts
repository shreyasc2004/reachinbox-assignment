import express from 'express';
import cors from 'cors';
import { prisma } from './db';
import { emailQueue } from './scheduler';
import { setupElasticsearch, esClient } from './es';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import './worker'; // start worker

const app = express();
app.use(cors());
app.use(express.json());

// Setup Bull Board
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');
createBullBoard({
  queues: [new BullMQAdapter(emailQueue)],
  serverAdapter: serverAdapter,
});
app.use('/admin/queues', serverAdapter.getRouter());

// User Login (mock/simple creation for now, real auth via Google will pass email/name)
app.post('/api/login', async (req, res) => {
    const { email, name, googleId } = req.body;
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
        user = await prisma.user.create({ data: { email, name, googleId } });
    }
    res.json(user);
});

// Schedule an email
app.post('/api/schedule', async (req, res) => {
    const { userId, userEmail, userName, subject, body, to, scheduledAt } = req.body;
    
    // Ensure user exists in database to satisfy foreign key constraint
    if (userId && userEmail) {
        await prisma.user.upsert({
            where: { id: userId },
            update: {},
            create: {
                id: userId,
                email: userEmail,
                name: userName,
                googleId: userId
            }
        });
    }

    // Create DB entry
    const jobData = await prisma.emailJob.create({
        data: {
            subject,
            body,
            to,
            scheduledAt: new Date(scheduledAt),
            userId
        }
    });

    // Add to Elasticsearch
    await esClient.index({
        index: 'emails',
        id: jobData.id,
        body: {
            id: jobData.id,
            subject,
            body,
            to,
            status: jobData.status,
            scheduledAt: jobData.scheduledAt,
            userId
        }
    }).catch(e => console.error("ES index error", e));

    // Schedule in BullMQ
    const delay = new Date(scheduledAt).getTime() - Date.now();
    await emailQueue.add('send-email', {
        id: jobData.id,
        userId,
        to,
        subject,
        body
    }, { 
        delay: Math.max(0, delay),
        jobId: jobData.id // Ensure idempotency if same job added twice
    });

    res.json(jobData);
});

// Get Single Email by ID
app.get('/api/emails/:id', async (req, res) => {
    const email = await prisma.emailJob.findUnique({
        where: { id: req.params.id }
    });
    if (!email) return res.status(404).json({ error: 'Not found' });
    res.json(email);
});

// List Scheduled Emails
app.get('/api/emails/scheduled/:userId', async (req, res) => {
    const emails = await prisma.emailJob.findMany({
        where: { userId: req.params.userId, status: 'PENDING' },
        orderBy: { scheduledAt: 'desc' }
    });
    res.json(emails);
});

// List Sent Emails
app.get('/api/emails/sent/:userId', async (req, res) => {
    const emails = await prisma.emailJob.findMany({
        where: { userId: req.params.userId, status: { in: ['SENT', 'FAILED'] } },
        orderBy: { sentAt: 'desc' }
    });
    res.json(emails);
});

// Search API (using Elasticsearch)
app.get('/api/emails/search', async (req, res) => {
    const { q, userId } = req.query;
    if (!q || !userId) return res.json([]);
    
    const result = await esClient.search({
        index: 'emails',
        body: {
            query: {
                bool: {
                    must: [
                        { match: { userId: userId as string } },
                        { multi_match: { query: q as string, fields: ['subject', 'body', 'to'] } }
                    ]
                }
            }
        }
    });
    
    const hits = result.hits.hits.map((h: any) => h._source);
    res.json(hits);
});

// Connect Slack (mock OAuth redirect)
app.post('/api/slack/connect', async (req, res) => {
    const { userId, slackToken, slackChannel } = req.body;
    await prisma.user.update({
        where: { id: userId },
        data: { slackToken, slackChannel }
    });
    res.json({ success: true });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, async () => {
    console.log(`Backend listening on port ${PORT}`);
    console.log(`Bull-board available at http://localhost:${PORT}/admin/queues`);
    await setupElasticsearch();
});
