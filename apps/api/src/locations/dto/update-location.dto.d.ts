import { TaxOverrideDto } from './tax-override.dto';
export declare class UpdateLocationDto {
    name?: string;
    workOrder?: string;
    startDate?: string;
    endDate?: string;
    address?: string;
    geoLat?: number;
    geoLng?: number;
    radius?: number;
    code?: string;
    clientId?: string;
    status?: string;
    taxOverrideInfo?: TaxOverrideDto;
}
