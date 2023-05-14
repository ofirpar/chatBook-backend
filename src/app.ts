import express, { Express } from 'express';
import  { ChatBookServer} from './setupServer';
import databaseConnection from './setupDatabase';
import {config} from './config';

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
    }
}

const application: Application = new Application();
application.init();