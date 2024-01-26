export type PagerDutyEscalationPolicyDropDownOption = {
    label: string;
    value: string;
};

// export class HttpError extends Error {
//     constructor(message: string, status: number) {
//         super(message);
//         this.status = status;
//     }

//     status: number;
// }

// export type PagerDutyAbilitiesListResponse = {
//     abilities: string[];
// };

export type CreateServiceResponse = {
    id: string;
    url: string;
    alertGrouping: string;
};
