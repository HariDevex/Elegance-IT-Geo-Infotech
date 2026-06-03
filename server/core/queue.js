import Bull from "bull";
import logger from "../utils/logger.js";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

export const emailQueue = new Bull("email", redisUrl, {
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
});

emailQueue.on("completed", (job) => {
  logger.debug(`Email job ${job.id} completed`, { jobName: job.name });
});

emailQueue.on("failed", (job, err) => {
  logger.error(`Email job ${job.id} failed`, { jobName: job.name, error: err.message });
});

export const addEmailJob = async (jobName, data) => {
  if (redisUrl) {
    try {
      await emailQueue.add(jobName, data);
      return true;
    } catch (err) {
      logger.warn("Failed to add email job, sending synchronously", { error: err.message });
      return false;
    }
  }
  return false;
};
