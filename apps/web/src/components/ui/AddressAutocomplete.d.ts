import React from 'react';
interface AddressAutocompleteProps {
    value: string;
    onChange: (value: string) => void;
    onSelect: (data: {
        address: string;
        lat: string;
        lon: string;
        street?: string;
        city?: string;
        state?: string;
        zip?: string;
        country?: string;
    }) => void;
    placeholder?: string;
    className?: string;
    required?: boolean;
}
export default function AddressAutocomplete({ value, onChange, onSelect, placeholder, className, required }: AddressAutocompleteProps): React.JSX.Element;
export {};
