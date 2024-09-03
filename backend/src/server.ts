import __init from "./app";
import { logger } from "./utils/logger";
import { CronJob } from 'cron';
import CheckDelayedTickets from "./services/TicketServices/CheckDelayedTickets";

__init().then((app: any) => {
  app.start();
  logger.info("Started system!!");
});

const job = new CronJob("*/5 * * * *", CheckDelayedTickets);
job.start()