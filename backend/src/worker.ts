import { Worker, DelayedError } from 'bullmq';
import nodemailer from 'nodemailer';
import connection from './redis';
import { prisma } from './db';
import { esClient } from './es';
import axios from 'axios';

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    }
});

const MAX_EMAILS_PER_HOUR = parseInt(process.env.MAX_EMAILS_PER_HOUR || '200');

async function notifySlack(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user?.slackToken && user?.slackChannel) {
        try {
            await axios.post('https://slack.com/api/chat.postMessage', {
                channel: user.slackChannel,
                text: '⚠️ You have reached your hourly email limit. Future emails will be delayed to the next hour.'
            }, {
                headers: { Authorization: `Bearer ${user.slackToken}` }
            });
            console.log(`Slack notification sent to ${user.email}`);
        } catch (error) {
            console.error('Failed to send Slack notification', error);
        }
    }
}

export const emailWorker = new Worker('email-queue', async (job) => {
    const { id, userId, to, subject, body } = job.data;
    
    // Check Rate Limit for this user
    const currentHour = new Date().toISOString().substring(0, 13); // yyyy-mm-ddThh
    const rateLimitKey = `rate-limit:${userId}:${currentHour}`;
    
    const countStr = await connection.get(rateLimitKey);
    let count = countStr ? parseInt(countStr) : 0;
    
    if (count >= MAX_EMAILS_PER_HOUR) {
        if (count === MAX_EMAILS_PER_HOUR) {
            // Notify Slack exactly once per hour when limit reached
            await notifySlack(userId);
            await connection.incr(rateLimitKey); // Increment so we don't notify again
        }
        
        // Calculate delay until next hour starts
        const now = new Date();
        const nextHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() + 1, 0, 0, 0);
        const delayMs = nextHour.getTime() - now.getTime();
        
        console.log(`Rate limit reached for user ${userId}, delaying job ${job.id} for ${delayMs}ms`);
        // This moves the job to the delayed set instead of failing it!
        throw new DelayedError(delayMs);
    }
    
    // Increment the limit counter
    const newCount = await connection.incr(rateLimitKey);
    if (newCount === 1) {
        await connection.expire(rateLimitKey, 3600); // 1 hour expiration
    }
    
    // Send email via SMTP
    try {
        await transporter.sendMail({
            from: `"ReachInbox" <${process.env.SMTP_USER}>`,
            to,
            subject,
            html: body
        });
        
        const sentAt = new Date();
        
        // Update DB
        await prisma.emailJob.update({
            where: { id },
            data: { status: 'SENT', sentAt }
        });
        
        // Update Elasticsearch
        await esClient.update({
            index: 'emails',
            id,
            body: {
                doc: { status: 'SENT', sentAt }
            }
        }).catch(e => console.error("ES update error", e));

        console.log(`Job ${job.id} - Email sent to ${to}`);
        
    } catch (error: any) {
        console.error(`Job ${job.id} failed:`, error);
        await prisma.emailJob.update({
            where: { id },
            data: { status: 'FAILED', failedReason: error.message }
        });
        throw error;
    }
}, { 
    connection,
    concurrency: 5, // Configurable worker concurrency
    limiter: {
        max: 1,
        duration: parseInt(process.env.MIN_DELAY_BETWEEN_EMAILS_MS || '2000') 
        // Enforces minimum delay between each email (e.g. 1 per 2 seconds globally on this worker/queue)
    }
});

emailWorker.on('failed', (job, err) => {
    if (err.name !== 'DelayedError') {
        console.log(`Job ${job?.id} permanently failed with reason: ${err.message}`);
    }
});
