import { Server } from "http";
import app from "./app";
import chalk from "chalk";
import { envVars } from "./app/config/env";


let server: Server;
const bootstrap = async () => {
    try {
        // await seedSuperAdmin();
        server = app.listen(envVars.PORT, () => {
            console.log(
                chalk.blue(
                    `Server is running on http://localhost:${envVars.PORT}`,
                ),
            );
        });
    } catch (error) {
        console.error("Failed to start server:", error);
    }
};

bootstrap();