export declare class GeocodingService {
    private readonly logger;
    private readonly nominatimUrl;
    geocode(address: string): Promise<{
        lat: number;
        lng: number;
    } | null>;
}
