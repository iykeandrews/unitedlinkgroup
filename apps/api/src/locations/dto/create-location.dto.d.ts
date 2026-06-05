import { TaxOverrideDto } from './tax-override.dto';
export declare class CreateLocationDto {
    name: string;
    code?: string;
    workOrder?: string;
    startDate?: string;
    endDate?: string;
    address: string;
    clientId?: string;
    status?: string;
    geoLat?: number;
    geoLng?: number;
    radius?: number;
    taxOverrideInfo?: TaxOverrideDto;
}
