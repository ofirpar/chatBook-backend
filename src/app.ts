import express, { Express } from 'express';
import { ChatBookServer } from '@root/setupServer';
import databaseConnection from '@root/setupDatabase';
import { config } from '@root/config';

class Application {
  public init(): void {
    this.loadConfig();
    databaseConnection();
    const app: Express = express();
    const server: ChatBookServer = new ChatBookServer(app);
    server.start();
  }

  public loadConfig(): void {
    config.validateConfig();
    config.cloudinaryConfig();
  }
}

const application: Application = new Application();
application.init();
