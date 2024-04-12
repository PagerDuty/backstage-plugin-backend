import { coreServices, createBackendPlugin } from '@backstage/backend-plugin-api';
import { createRouter } from './service/router';

/** @public */
export const pagerDutyPlugin = createBackendPlugin({
    pluginId: 'pagerduty',
    register(env) {
        env.registerInit({
            deps: {
                logger: coreServices.logger,
                config: coreServices.rootConfig,
                httpRouter: coreServices.httpRouter,               
            },
            async init({ config, logger, httpRouter }) {
                httpRouter.use(
                    await createRouter({
                        config,
                        logger,
                    }),
                );
                httpRouter.addAuthPolicy({
                    path: '/',
                    allow: 'unauthenticated',
                });
            },
        });
    }
});