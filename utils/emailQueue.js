import { sendAttendanceConfirmationEmail } from './emailService.js';

// Simple in-memory queue for email processing
class EmailQueue {
  constructor() {
    this.queue = [];
    this.processing = false;
    this.maxRetries = 3;
    this.retryDelay = 5000; // 5 seconds
  }

  // Add email to queue (non-blocking)
  addToQueue(emailData) {
    const emailJob = {
      id: Date.now() + Math.random(),
      data: emailData,
      attempts: 0,
      createdAt: new Date(),
      status: 'pending'
    };
    
    this.queue.push(emailJob);
    console.log(`Email queued: ${emailJob.id} for ${emailData.to}`);
    
    // Start processing if not already running
    if (!this.processing) {
      this.processQueue();
    }
    
    return emailJob.id;
  }

  // Process emails in background
  async processQueue() {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;
    console.log(`Starting email queue processing. Queue size: ${this.queue.length}`);

    while (this.queue.length > 0) {
      const job = this.queue.shift();
      
      try {
        console.log(`Processing email job: ${job.id}`);
        await sendAttendanceConfirmationEmail(job.data);
        
        console.log(`✅ Email sent successfully: ${job.id} to ${job.data.to}`);
        job.status = 'completed';
        
      } catch (error) {
        job.attempts++;
        job.status = 'failed';
        
        console.error(`❌ Email failed (attempt ${job.attempts}/${this.maxRetries}): ${job.id}`, error.message);
        
        // Retry logic
        if (job.attempts < this.maxRetries) {
          job.status = 'retrying';
          console.log(`🔄 Retrying email job: ${job.id} in ${this.retryDelay/1000} seconds`);
          
          // Add back to queue after delay
          setTimeout(() => {
            this.queue.push(job);
            if (!this.processing) {
              this.processQueue();
            }
          }, this.retryDelay);
        } else {
          console.error(`💀 Email job permanently failed: ${job.id} after ${this.maxRetries} attempts`);
        }
      }
      
      // Small delay between emails to prevent overwhelming SMTP server
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    this.processing = false;
    console.log('✅ Email queue processing completed');
  }

  // Get queue status (for monitoring)
  getStatus() {
    return {
      queueSize: this.queue.length,
      processing: this.processing,
      pendingEmails: this.queue.filter(job => job.status === 'pending').length,
      retryingEmails: this.queue.filter(job => job.status === 'retrying').length
    };
  }

  // Clear failed jobs (cleanup)
  clearFailedJobs() {
    const beforeCount = this.queue.length;
    this.queue = this.queue.filter(job => job.status !== 'failed');
    const removedCount = beforeCount - this.queue.length;
    console.log(`🧹 Cleared ${removedCount} failed email jobs`);
    return removedCount;
  }
}

// Create singleton instance
const emailQueue = new EmailQueue();

// Helper function to queue attendance emails
export const queueAttendanceEmail = (emailData) => {
  return emailQueue.addToQueue(emailData);
};

// Export queue instance for monitoring
export const getEmailQueueStatus = () => {
  return emailQueue.getStatus();
};

// Export cleanup function
export const clearFailedEmails = () => {
  return emailQueue.clearFailedJobs();
};

export default emailQueue;