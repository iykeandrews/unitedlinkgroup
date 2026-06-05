export declare class IncidentPersonInputDto {
    role: string;
    name: string;
    contactInfo?: string;
}
export declare class CreateIncidentReportDto {
    title: string;
    description: string;
    type?: string;
    severity?: string;
    status?: string;
    shift?: string;
    buildingArea?: string;
    locationId?: string;
    incidentAt?: string;
    date?: string;
    responseAction?: string;
    witnessPresent?: boolean;
    lawEnforcementInvolved?: boolean;
    evidenceCollected?: string[];
    reportingOfficerEmployeeId?: string;
    assignedSupervisorId?: string;
    persons?: IncidentPersonInputDto[];
    images?: string[];
    deviceInfo?: string;
    geoLat?: number;
    geoLng?: number;
}
