'use client';

import { useState, useCallback } from 'react';

interface UseSearchProps<T> {
  items: T[];
  searchFields: (keyof T)[];
}

export function useSearch<T>({ items, searchFields }: UseSearchProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredItems = items.filter((item) => {
    const search = searchTerm.toLowerCase();
    return searchFields.some((field) => {
      const value = item[field];
      return value && String(value).toLowerCase().includes(search);
    });
  });

  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
  }, []);

  return {
    searchTerm,
    setSearchTerm,
    handleSearch,
    filteredItems,
  };
}
