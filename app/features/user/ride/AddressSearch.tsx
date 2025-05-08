"use client";

import React, { useState } from 'react';
import { UseFormRegister, UseFormSetValue } from 'react-hook-form';
import { apiService } from '../../../../services/api';

interface FormData {
  startPoint: string;
  startPlaceName: string;
  endPoint: string;
  endPlaceName: string;
}

interface AddressSearchProps {
  label: string;
  field: 'startPoint' | 'endPoint';
  placeNameField: 'startPlaceName' | 'endPlaceName';
  register: UseFormRegister<FormData>;
  setValue: UseFormSetValue<FormData>;
  error?: string;
}

const AddressSearch: React.FC<AddressSearchProps> = ({ label, field, placeNameField, register, setValue, error }) => {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  const handleSearch = (query: string) => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    const timeout = setTimeout(async () => {
      if (!query || query.length < 3 || typeof window === 'undefined') {
        setSuggestions([]);
        return;
      }
      try {
        const results = await apiService.searchAddress(query);
        setSuggestions(results);
      } catch (error) {
        console.error('Error searching address:', error);
      }
    }, 500);

    setSearchTimeout(timeout);
  };

  const handleSelect = (suggestion: any) => {
    if (suggestion) {
      setValue(field, `${suggestion.lat},${suggestion.lon}`);
      setValue(placeNameField, suggestion.display_name);
      setSuggestions([]);
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <input
        type="text"
        {...register(placeNameField, { required: `${label} is required` })}
        onChange={(e) => handleSearch(e.target.value)}
        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
      />
      {suggestions.length > 0 && (
        <ul className="border mt-1 rounded-md">
          {suggestions.map((suggestion) => (
            <li
              key={suggestion.place_id}
              onClick={() => handleSelect(suggestion)}
              className="p-2 cursor-pointer hover:bg-gray-100"
            >
              {suggestion.display_name}
            </li>
          ))}
        </ul>
      )}
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <input type="hidden" {...register(field, {
        validate: (value: string) => {
          const [lat, lng] = value.split(',').map(Number);
          if (!lat || !lng) return 'Invalid coordinate format';
          if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return 'Coordinates out of range';
          return true;
        }
      })} />
    </div>
  );
};

export default AddressSearch;