/**
 * Simple job scheduler for periodic tasks.
 * In production, use a proper job queue (Bull, Agenda, etc.)
 */

interface ScheduledJob {
  name: string;
  interval: number; // ms
  handler: () => Promise<void>;
  timer?: ReturnType<typeof setInterval>;
  lastRun?: Date;
  isRunning: boolean;
}

class Scheduler {
  private jobs = new Map<string, ScheduledJob>();

  register(name: string, intervalMs: number, handler: () => Promise<void>): void {
    if (this.jobs.has(name)) {
      console.warn(`Job "${name}" already registered, replacing.`);
      this.unregister(name);
    }

    this.jobs.set(name, {
      name,
      interval: intervalMs,
      handler,
      isRunning: false,
    });
  }

  start(name: string): void {
    const job = this.jobs.get(name);
    if (!job) {
      console.error(`Job "${name}" not found`);
      return;
    }

    if (job.timer) return; // Already running

    const runJob = async () => {
      if (job.isRunning) return; // Skip if previous run is still going
      job.isRunning = true;
      try {
        await job.handler();
        job.lastRun = new Date();
      } catch (err) {
        console.error(`Job "${name}" failed:`, err);
      } finally {
        job.isRunning = false;
      }
    };

    // Run immediately, then on interval
    runJob();
    job.timer = setInterval(runJob, job.interval);
    console.log(`Scheduler: Started job "${name}" (every ${job.interval / 1000}s)`);
  }

  startAll(): void {
    for (const name of this.jobs.keys()) {
      this.start(name);
    }
  }

  stop(name: string): void {
    const job = this.jobs.get(name);
    if (job?.timer) {
      clearInterval(job.timer);
      job.timer = undefined;
    }
  }

  stopAll(): void {
    for (const name of this.jobs.keys()) {
      this.stop(name);
    }
  }

  unregister(name: string): void {
    this.stop(name);
    this.jobs.delete(name);
  }

  getStatus(): { name: string; lastRun: Date | null; isRunning: boolean; intervalMs: number }[] {
    return Array.from(this.jobs.values()).map(job => ({
      name: job.name,
      lastRun: job.lastRun || null,
      isRunning: job.isRunning,
      intervalMs: job.interval,
    }));
  }
}

export const scheduler = new Scheduler();
