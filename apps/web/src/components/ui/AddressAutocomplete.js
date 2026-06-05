"use strict";
'use client';
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AddressAutocomplete;
const react_1 = __importStar(require("react"));
const lucide_react_1 = require("lucide-react");
const axios_1 = __importDefault(require("axios"));
function AddressAutocomplete({ value, onChange, onSelect, placeholder = 'Enter address...', className = '', required = false }) {
    const [suggestions, setSuggestions] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [showSuggestions, setShowSuggestions] = (0, react_1.useState)(false);
    const [coordinates, setCoordinates] = (0, react_1.useState)(null);
    const wrapperRef = (0, react_1.useRef)(null);
    const timeoutRef = (0, react_1.useRef)(null);
    (0, react_1.useEffect)(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setShowSuggestions(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    const handleInput = (e) => {
        const newValue = e.target.value;
        onChange(newValue);
        if (!newValue) {
            setCoordinates(null);
        }
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        if (newValue.length < 3) {
            setSuggestions([]);
            setShowSuggestions(false);
            return;
        }
        setLoading(true);
        timeoutRef.current = setTimeout(async () => {
            try {
                const res = await axios_1.default.get('https://nominatim.openstreetmap.org/search', {
                    params: {
                        format: 'json',
                        q: newValue,
                        addressdetails: 1,
                        limit: 5,
                    },
                    headers: {
                        'User-Agent': 'UnitedLinkGroupApp/1.0' // Required by Nominatim
                    }
                });
                setSuggestions(res.data);
                setShowSuggestions(true);
            }
            catch (error) {
                console.error('Failed to fetch address suggestions', error);
                if (error.response && error.response.status === 503) {
                    // Service Unavailable - likely rate limited
                    // Fail silently or show a toast if you had one, but for now just stop loading
                }
            }
            finally {
                setLoading(false);
            }
        }, 800); // 800ms debounce
    };
    const handleSelect = (suggestion) => {
        const address = suggestion.address;
        const street = [address.house_number, address.road].filter(Boolean).join(' ');
        const city = address.city || address.town || address.village || '';
        const formattedAddress = suggestion.display_name;
        onChange(formattedAddress);
        setCoordinates({ lat: suggestion.lat, lon: suggestion.lon, bbox: suggestion.boundingbox });
        onSelect({
            address: formattedAddress,
            lat: suggestion.lat,
            lon: suggestion.lon,
            street,
            city,
            state: address.state,
            zip: address.postcode,
            country: address.country,
        });
        setShowSuggestions(false);
    };
    const getMapUrl = () => {
        if (!coordinates)
            return '';
        // If we have a bounding box, use it to frame the map correctly
        // Nominatim returns [minLat, maxLat, minLon, maxLon]
        // OSM embed expects bbox=minLon,minLat,maxLon,maxLat
        if (coordinates.bbox && coordinates.bbox.length === 4) {
            const [minLat, maxLat, minLon, maxLon] = coordinates.bbox;
            // Add a small buffer to the bbox to ensure the marker is visible comfortably
            return `https://www.openstreetmap.org/export/embed.html?bbox=${minLon},${minLat},${maxLon},${maxLat}&layer=mapnik&marker=${coordinates.lat},${coordinates.lon}`;
        }
        // Fallback to a small fixed bbox around the point if no bbox provided
        const lat = parseFloat(coordinates.lat);
        const lon = parseFloat(coordinates.lon);
        const delta = 0.005;
        return `https://www.openstreetmap.org/export/embed.html?bbox=${lon - delta},${lat - delta},${lon + delta},${lat + delta}&layer=mapnik&marker=${coordinates.lat},${coordinates.lon}`;
    };
    return (<div className={`relative ${className}`} ref={wrapperRef}>
      <div className="relative">
        <lucide_react_1.MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/>
        <input type="text" value={value} onChange={handleInput} placeholder={placeholder} className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-slate-800 dark:text-white" required={required}/>
        {loading && (<div className="absolute right-3 top-1/2 -translate-y-1/2">
            <lucide_react_1.Loader2 className="w-4 h-4 animate-spin text-indigo-600"/>
          </div>)}
      </div>

      {showSuggestions && suggestions.length > 0 && (<ul className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-md shadow-lg max-h-60 overflow-auto">
          {suggestions.map((suggestion) => (<li key={suggestion.place_id} onClick={() => handleSelect(suggestion)} className="px-4 py-2 hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer text-sm text-gray-700 dark:text-gray-200">
              {suggestion.display_name}
            </li>))}
        </ul>)}

      {coordinates && (<div className="mt-2 w-full h-48 rounded-md overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm relative bg-slate-100 dark:bg-slate-800">
          <iframe width="100%" height="100%" frameBorder="0" scrolling="no" marginHeight={0} marginWidth={0} src={getMapUrl()} className="absolute inset-0" title="Location Map">
          </iframe>
          <div className="absolute bottom-1 right-1 text-[10px] text-slate-500 bg-white/80 px-1 rounded pointer-events-none">
            © OpenStreetMap contributors
          </div>
        </div>)}
    </div>);
}
