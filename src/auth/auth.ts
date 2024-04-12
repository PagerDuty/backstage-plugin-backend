import { LoggerService, RootConfigService } from "@backstage/backend-plugin-api";
import { HttpError } from "@pagerduty/backstage-plugin-common";

type Auth = {
    config: RootConfigService;
    logger: LoggerService;
    authToken: string;
    authTokenExpiryDate: number;
}

let authPersistence: Auth;

export async function getAuthToken(): Promise<string> {
    // check if token already exists and is valid
    if (
        (authPersistence.authToken !== '' &&
            authPersistence.authToken.includes('Bearer') &&
            authPersistence.authTokenExpiryDate > Date.now())  // case where OAuth token is still valid
        ||
        (authPersistence.authToken !== '' &&
            authPersistence.authToken.includes('Token'))) { // case where API token is used
        return authPersistence.authToken;
    }

    await loadAuthConfig(authPersistence.config, authPersistence.logger);
    return authPersistence.authToken;
}

export async function loadAuthConfig(config : RootConfigService, logger: LoggerService) {
    try {

        // initiliaze the authPersistence in-memory object
        authPersistence = {
            config,
            logger,
            authToken: '',
            authTokenExpiryDate: Date.now()
        };

        if (!config.getOptionalString('pagerDuty.apiToken')) {
            logger.warn('No PagerDuty API token found in config file. Trying OAuth token instead...');

            if (!config.getOptional('pagerDuty.oauth')) {
                
                logger.error('No PagerDuty OAuth configuration found in config file.');

            } else if (!config.getOptionalString('pagerDuty.oauth.clientId') || !config.getOptionalString('pagerDuty.oauth.clientSecret') || !config.getOptionalString('pagerDuty.oauth.subDomain')) {
                
                logger.error("Missing required PagerDuty OAuth parameters in config file. 'clientId', 'clientSecret', and 'subDomain' are required. 'region' is optional.");

            } else {

                authPersistence.authToken = await getOAuthToken(
                    config.getString('pagerDuty.oauth.clientId'),
                    config.getString('pagerDuty.oauth.clientSecret'),
                    config.getString('pagerDuty.oauth.subDomain'),
                    config.getOptionalString('pagerDuty.oauth.region') ?? 'us');

                logger.info('PagerDuty OAuth configuration loaded successfully.');
            }
        } else {
            authPersistence.authToken = `Token token=${config.getString('pagerDuty.apiToken')}`;

            logger.info('PagerDuty API token loaded successfully.');
        }
    }
    catch (error) {
        logger.error(`Unable to retrieve valid PagerDuty AUTH configuration from config file: ${error}`);
    }
}

async function getOAuthToken(clientId: string, clientSecret: string, subDomain: string, region: string): Promise<string> {
    // check if required parameters are provided
    if (!clientId || !clientSecret || !subDomain) {
        throw new Error('Missing required PagerDuty OAuth parameters.');
    }

    // define the scopes required for the OAuth token
    const scopes = `
        abilities.read 
        analytics.read
        change_events.read 
        escalation_policies.read 
        incidents.read 
        oncalls.read 
        schedules.read 
        services.read 
        services.write 
        standards.read
        teams.read 
        users.read 
        vendors.read
    `;

    // encode the parameters for the request
    const urlencoded = new URLSearchParams();
    urlencoded.append("grant_type", "client_credentials");
    urlencoded.append("client_id", clientId);
    urlencoded.append("client_secret", clientSecret);
    urlencoded.append("scope", `as_account-${region}.${subDomain} ${scopes}`);

    let response: Response;
    const options: RequestInit = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: urlencoded,
    };
    const baseUrl = 'https://identity.pagerduty.com/oauth/token';

    try {
        response = await fetch(baseUrl, options);
    } catch (error) {
        throw new Error(`Failed to retrieve oauth token: ${error}`);
    }

    switch (response.status) {
        case 400:
            throw new HttpError("Failed to retrieve valid token. Bad Request - Invalid arguments provided.", 400);
        case 401:
            throw new HttpError("Failed to retrieve valid token. Forbidden - Invalid credentials provided.", 401);
        default: // 200
            break;
    }

    const authResponse = await response.json();
    authPersistence.authTokenExpiryDate = Date.now() + (authResponse.expires_in * 1000);
    return `Bearer ${authResponse.access_token}`;
}